import { database } from "../services/DB/indexBD";
import { Q } from "@nozbe/watermelondb";

export interface LogAuditParams {
  tabla: string;
  registroId: string;
  accion: "create" | "update" | "delete" | "restore";
  userId: string;
  deviceId: string;
  camposChanged?: string[];
  valoresAnteriores?: Record<string, any>;
  valoresNuevos?: Record<string, any>;
  inWriteBlock?: boolean;
}

export async function logAudit(params: LogAuditParams) {
  try {
    const createEntry = async () => {
      await database.get("audit_log").create((entry: any) => {
        entry.tabla = params.tabla;
        entry.registroId = params.registroId;
        entry.accion = params.accion;
        entry.usuarioId = params.userId;
        entry.deviceId = params.deviceId;
        entry.camposCambiados = params.camposChanged
          ? JSON.stringify(params.camposChanged)
          : null;
        entry.valoresAnteriores = params.valoresAnteriores
          ? JSON.stringify(params.valoresAnteriores)
          : null;
        entry.valoresNuevos = params.valoresNuevos
          ? JSON.stringify(params.valoresNuevos)
          : null;
      });
    };

    if (params.inWriteBlock) {
      await createEntry();
    } else {
      await database.write(async () => {
        await createEntry();
      });
    }
  } catch (error) {
    console.error("Error creating audit log entry:", error);
  }
}

export async function cleanupLocalAuditLogs() {
  try {
    const ninetyDaysAgo = Date.now() - 90 * 24 * 60 * 60 * 1000;
    const oldLogs = await database
      .get("audit_log")
      .query(Q.where("created_at", Q.lt(ninetyDaysAgo)))
      .fetch();

    if (oldLogs.length > 0) {
      await database.write(async () => {
        await database.batch(
          ...oldLogs.map((log) => log.prepareDestroyPermanently())
        );
      });
      console.log(`Cleared ${oldLogs.length} audit logs older than 90 days.`);
    }
  } catch (error) {
    console.error("Error cleaning up local audit logs:", error);
  }
}
