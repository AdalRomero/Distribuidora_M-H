import * as Crypto from "expo-crypto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { synchronize } from "@nozbe/watermelondb/sync";
import { database } from "./services/DB/indexBD";
import { supabase } from "./services/api/supabaseClient";
import { getDeviceId } from "./services/device";

const RETRY_CONFIG = {
  maxRetries: 5,
  backoff: [1000, 3000, 10000, 30000, 60000], // ms entre intentos
  retryableErrors: [
    "NETWORK_ERROR",
    "TIMEOUT",
    "PGRST_TIMEOUT",
    "503",
  ],
  nonRetryableErrors: [
    "SYNC_BLOCKED_MASS_DELETION",
    "AUTH_EXPIRED",
    "401",
    "403",
    "PAYLOAD_VALIDATION_ERROR",
  ],
};

function extractErrorCode(error: any): string {
  if (!error) return "UNKNOWN";
  const msg = error.message || String(error);
  if (msg.includes("SYNC_BLOCKED_MASS_DELETION")) return "SYNC_BLOCKED_MASS_DELETION";
  if (msg.includes("PAYLOAD_VALIDATION_ERROR")) return "PAYLOAD_VALIDATION_ERROR";
  if (msg.includes("401") || msg.includes("JWT expired")) return "401";
  if (msg.includes("403")) return "403";
  if (
    msg.includes("Network request failed") ||
    msg.includes("Failed to fetch") ||
    msg.includes("network")
  ) {
    return "NETWORK_ERROR";
  }
  if (msg.includes("timeout") || msg.includes("Timeout") || msg.includes("PGRST_TIMEOUT")) {
    return "TIMEOUT";
  }
  return "UNKNOWN";
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function registerMassDeletionIncident(reason: string) {
  if (typeof localStorage === "undefined") return;
  try {
    const raw = localStorage.getItem("dist_mh_integrity_incidents");
    const incidents = raw ? JSON.parse(raw) : [];
    
    const exists = incidents.some(
      (i: any) => i.ruleId === "sync_masivo_bloqueado" && i.status !== "resolved"
    );
    if (exists) return;

    const newIncident = {
      id: "sync_blocked_" + Date.now(),
      ruleId: "sync_masivo_bloqueado",
      severity: "critical",
      title: "Sincronización Bloqueada: Borrado Masivo",
      description: reason,
      affectedCount: 1,
      resolvedCount: 0,
      detectedAt: Date.now(),
      updatedAt: Date.now(),
      status: "pending",
      meta: {
        reason,
        details: "Se ha bloqueado el envío de eliminaciones locales a la base de datos central de Supabase.",
      },
    };

    incidents.push(newIncident);
    localStorage.setItem("dist_mh_integrity_incidents", JSON.stringify(incidents));
    
    window.dispatchEvent(new Event("storage"));
  } catch (e) {
    console.error("Error al registrar incidencia de borrado masivo:", e);
  }
}

function validatePayload(changes: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  for (const [table, data] of Object.entries(changes)) {
    for (const record of (data as any).created || []) {
      if (!record.id || record.id.length !== 36) {
        errors.push(`${table}: ID inválido ${record.id}`);
      }
    }
  }
  
  if (changes.documentos?.created) {
    for (const doc of changes.documentos.created) {
      if (doc.total < 0) {
        errors.push(`Documento con total negativo: ${doc.id}`);
      }
    }
  }
  
  return { valid: errors.length === 0, errors };
}

// Perform the sync loop
async function runSyncProcess(
  syncId: string,
  deviceId: string,
  journalId: string
) {
  let pulledCount = 0;
  let pushedCount = 0;
  let rejectedCount = 0;
  let conflicts = 0;
  const tablesAffectedSet = new Set<string>();

  // LIMPIEZA DE EMERGENCIA: Eliminar registros locales con IDs corruptos que bloquean el sync
  await database.write(async () => {
    const collectionsToClean = [
      "plantillas_precios",
      "reglas_plantilla",
      "bitacora_errores",
      "clientes_plantillas",
    ];
    for (const col of collectionsToClean) {
      try {
        const records = await database.get(col).query().fetch();
        for (const r of records) {
          if (r.id.length !== 36) {
            await (r as any).destroyPermanently();
          }
        }
      } catch (e) {}
    }
  });

  const activeUserId = await AsyncStorage.getItem("activeUserId");

  await synchronize({
    database,
    pullChanges: async ({ lastPulledAt }) => {
      const platform = typeof window !== "undefined" ? "web" : "native";
      const { data, error } = await supabase.rpc("pull_changes", {
        last_pulled_at: lastPulledAt ?? 0,
        usuario_id: activeUserId || null,
        platform,
      });

      if (error) throw new Error(error.message);

      // Count pulled changes
      if (data && data.changes) {
        for (const [table, changesObj] of Object.entries(data.changes)) {
          const ch = changesObj as any;
          const count = (ch.created?.length || 0) + (ch.updated?.length || 0) + (ch.deleted?.length || 0);
          if (count > 0) {
            pulledCount += count;
            tablesAffectedSet.add(table);
          }
        }
      }

      return { changes: data.changes, timestamp: data.timestamp };
    },
    pushChanges: async ({ changes }) => {
      // 1. Pre-push payload validation
      const validation = validatePayload(changes);
      if (!validation.valid) {
        throw new Error(`PAYLOAD_VALIDATION_ERROR: ${validation.errors.join("; ")}`);
      }

      // Count pushed changes
      for (const [table, changesObj] of Object.entries(changes)) {
        const ch = changesObj as any;
        const count = (ch.created?.length || 0) + (ch.updated?.length || 0) + (ch.deleted?.length || 0);
        if (count > 0) {
          pushedCount += count;
          tablesAffectedSet.add(table);
        }
      }

      // --- BLINDAJE DE SINCRONIZACIÓN CONTRA BORRADOS MASIVOS ---
      const CRITICAL_TABLES = [
        "productos",
        "lotes",
        "clientes",
        "proveedores",
        "documentos",
        "movimientos_inventario",
        "producto_impuestos",
        "codigos_alternos",
        "proveedor_productos",
      ];

      let suspicious = false;
      let suspiciousReason = "";

      for (const tableName of CRITICAL_TABLES) {
        const tableChanges = (changes as any)[tableName];
        if (tableChanges?.deleted && tableChanges.deleted.length > 0) {
          const deletedCount = tableChanges.deleted.length;
          
          if (deletedCount > 10) {
            suspicious = true;
            suspiciousReason = `Se detectó un intento de eliminación masiva de ${deletedCount} registros en la tabla crítica '${tableName}'.`;
            break;
          }
        }
      }

      if (
        suspicious &&
        typeof localStorage !== "undefined" &&
        localStorage.getItem("bypass_bulk_delete_protection") !== "true"
      ) {
        registerMassDeletionIncident(suspiciousReason);
        localStorage.setItem("sync_blocked_reason", suspiciousReason);
        throw new Error(`SYNC_BLOCKED_MASS_DELETION: ${suspiciousReason}`);
      }

      if (typeof localStorage !== "undefined") {
        localStorage.removeItem("bypass_bulk_delete_protection");
      }

      // Send changes to Supabase
      const { data, error } = await supabase.rpc("push_changes", {
        changes: changes,
      });

      if (error) throw new Error(error.message);

      // Handle rejects and conflicts
      if (data && data.rechazados && data.rechazados.length > 0) {
        rejectedCount = data.rechazados.length;
        conflicts = data.rechazados.length; // Assume rejected represent conflicts/violations
        
        await database.write(async () => {
          for (const item of data.rechazados) {
            await database.get("bitacora_errores").create((entry: any) => {
              entry.tablaOrigen = item.tabla;
              entry.registroId = item.id;
              entry.accion = item.accion || "sync";
              entry.payloadJson = item.datos ? JSON.stringify(item.datos) : null;
              entry.mensajeError = item.mensaje;
              entry.estado = "pendiente";
            });

            try {
              const registroMalo = await database.get(item.tabla).find(item.id);
              await registroMalo.destroyPermanently();
            } catch (e) {
              console.warn(`No se pudo eliminar el registro local ${item.id}:`, e);
            }
          }
        });

        console.warn(
          `Se enviaron ${data.rechazados.length} registros a la bitácora de errores.`
        );
      }
    },
  });

  // Update journal entry on success
  try {
    await database.write(async () => {
      const j = await database.get("sync_journal").find(journalId);
      await j.update((record: any) => {
        record.status = "completed";
        record.tablesAffected = JSON.stringify(Array.from(tablesAffectedSet));
        record.recordsPulled = pulledCount;
        record.recordsPushed = pushedCount;
        record.recordsRejected = rejectedCount;
        record.conflictsDetected = conflicts;
        record.durationMs = Date.now() - record.createdAt;
      });
    });
  } catch (e) {
    console.error("Error updating sync journal on completion:", e);
  }
}

export async function syncApp() {
  const syncId =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : "sync-" + Date.now();
  const deviceId = getDeviceId();
  let journalId = "";

  // 1. Log session start in journal
  try {
    await database.write(async () => {
      const j = await database.get("sync_journal").create((entry: any) => {
        entry.syncId = syncId;
        entry.direction = "both";
        entry.status = "started";
        entry.tablesAffected = "[]";
        entry.recordsPulled = 0;
        entry.recordsPushed = 0;
        entry.recordsRejected = 0;
        entry.conflictsDetected = 0;
        entry.durationMs = 0;
        entry.deviceId = deviceId;
      });
      journalId = j.id;
    });
  } catch (e) {
    console.error("Error creating sync journal entry:", e);
  }

  // 2. Retry loop
  for (let attempt = 0; attempt < RETRY_CONFIG.maxRetries; attempt++) {
    try {
      await runSyncProcess(syncId, deviceId, journalId);
      return; // Success!
    } catch (error: any) {
      const code = extractErrorCode(error);
      console.warn(`Sync attempt ${attempt + 1} failed (Code: ${code}):`, error);

      if (RETRY_CONFIG.nonRetryableErrors.includes(code) || attempt === RETRY_CONFIG.maxRetries - 1) {
        // Log final failure
        if (journalId) {
          try {
            await database.write(async () => {
              const j = await database.get("sync_journal").find(journalId);
              await j.update((record: any) => {
                record.status = "failed";
                record.errorMessage = error.message || String(error);
                record.durationMs = Date.now() - record.createdAt;
              });
            });
          } catch (e) {
            console.error("Error updating sync journal on failure:", e);
          }
        }
        throw error; // Re-throw to caller
      }

      // Retry after backoff sleep
      const waitMs = RETRY_CONFIG.backoff[attempt] || 1000;
      await sleep(waitMs);
    }
  }
}
