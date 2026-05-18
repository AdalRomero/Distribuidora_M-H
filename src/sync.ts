import * as Crypto from "expo-crypto";
import { synchronize } from "@nozbe/watermelondb/sync";
import { database } from "./services/DB/indexBD";
import { supabase } from "./services/api/supabaseClient";

function registerMassDeletionIncident(reason: string) {
  if (typeof localStorage === "undefined") return;
  try {
    const raw = localStorage.getItem("dist_mh_integrity_incidents");
    const incidents = raw ? JSON.parse(raw) : [];
    
    // Evitamos duplicar incidencias pendientes del mismo tipo
    const exists = incidents.some((i: any) => i.ruleId === "sync_masivo_bloqueado" && i.status !== "resolved");
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
        details: "Se ha bloqueado el envío de eliminaciones locales a la base de datos central de Supabase."
      }
    };

    incidents.push(newIncident);
    localStorage.setItem("dist_mh_integrity_incidents", JSON.stringify(incidents));
    
    // Lanzamos evento global para que las vistas del panel reaccionen en tiempo real
    window.dispatchEvent(new Event("storage"));
  } catch (e) {
    console.error("Error al registrar incidencia de borrado masivo:", e);
  }
}

export async function syncApp() {
  try {
    // LIMPIEZA DE EMERGENCIA: Eliminar registros locales con IDs corruptos que bloquean el sync
    await database.write(async () => {
      const collectionsToClean = [
        "plantillas_precios",
        "reglas_plantilla",
        "bitacora_errores",
        "clientes_plantillas"
      ];
      for (const col of collectionsToClean) {
        try {
          const records = await database.get(col).query().fetch();
          for (const r of records) {
            if (r.id.length !== 36) {
              await (r as any).destroyPermanently();
            }
          }
        } catch (e) {
          // Si la tabla no existe o falla, la ignoramos
        }
      }
    });

    await synchronize({
      database,
      pullChanges: async ({ lastPulledAt }) => {
        const { data, error } = await supabase.rpc("pull_changes", {
          last_pulled_at: lastPulledAt ?? 0,
        });

        if (error) throw new Error(error.message);

        return { changes: data.changes, timestamp: data.timestamp };
      },
      pushChanges: async ({ changes }) => {
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
          "proveedor_productos"
        ];

        let suspicious = false;
        let suspiciousReason = "";

        for (const tableName of CRITICAL_TABLES) {
          const tableChanges = (changes as any)[tableName];
          if (tableChanges?.deleted && tableChanges.deleted.length > 0) {
            const deletedCount = tableChanges.deleted.length;
            
            // Si el intento de eliminación supera un límite seguro (ej. 10 registros)
            if (deletedCount > 10) {
              suspicious = true;
              suspiciousReason = `Se detectó un intento de eliminación masiva de ${deletedCount} registros en la tabla crítica '${tableName}'.`;
              break;
            }
          }
        }

        if (suspicious && typeof localStorage !== "undefined" && localStorage.getItem("bypass_bulk_delete_protection") !== "true") {
          registerMassDeletionIncident(suspiciousReason);
          localStorage.setItem("sync_blocked_reason", suspiciousReason);
          throw new Error(`SYNC_BLOCKED_MASS_DELETION: ${suspiciousReason}`);
        }

        // Si pasó la protección o se forzó el bypass, reiniciamos la bandera de bypass
        if (typeof localStorage !== "undefined") {
          localStorage.removeItem("bypass_bulk_delete_protection");
        }

        // Enviamos los cambios a Supabase
        const { data, error } = await supabase.rpc("push_changes", {
          changes: changes,
        });

        // 1. ERRORES DE RED O SISTEMA: Si Supabase se cae por completo, sí debemos abortar.
        if (error) throw new Error(error.message);

        // 2. ERRORES DE DATOS (La Cuarentena):
        // Asumimos que tu RPC devuelve un arreglo "rechazados" si detecta duplicados o conflictos.
        if (data && data.rechazados && data.rechazados.length > 0) {
          await database.write(async () => {
            for (const item of data.rechazados) {
              // A. Guardamos la evidencia en la bitácora
              await database.get("bitacora_errores").create((entry: any) => {
                entry._raw.id = Crypto.randomUUID();
                entry.tablaOrigen = item.tabla;
                entry.registroId = item.id;

                // 🔴 CAMBIO 1: Tomamos la acción exacta desde el backend ('created', 'updated', 'deleted')
                entry.accion = item.accion;

                // 🔴 CAMBIO 2: Protegemos el stringify por si 'datos' viene vacío (como en los deletes)
                entry.payloadJson = item.datos
                  ? JSON.stringify(item.datos)
                  : null;

                entry.mensajeError = item.mensaje;
                entry.estado = "pendiente";
              });

              // B. EL RESCATE: Eliminamos el registro problemático
              try {
                // Buscamos el registro problemático local
                const registroMalo = await database
                  .get(item.tabla)
                  .find(item.id);

                // Lo destruimos permanentemente de la base local.
                // Como ya tenemos el JSON en la bitácora, no perdemos nada,
                // sacamos el error de la cola y evitamos registros "fantasma".
                await registroMalo.destroyPermanently();
              } catch (e) {
                // Si entra aquí, es porque el registro ya se borró localmente
                // antes de llegar a este punto, lo cual no es problema.
                console.warn(
                  `No se pudo eliminar el registro local ${item.id}:`,
                  e,
                );
              }
            }
          });

          console.warn(
            `Se enviaron ${data.rechazados.length} registros a la bitácora de errores.`,
          );
        }
      },
    });
  } catch (error) {
    console.error("Fallo la sincronización general:", error);
    // Este throw solo saltará si no hay internet o Supabase está caído,
    // lo cual está bien porque intentarás sincronizar más tarde.
    throw error;
  }
}
