import { useState, useEffect, useCallback } from "react";
import { Q } from "@nozbe/watermelondb";
import { database } from "../services/DB/indexBD";
import { SyncError } from "../../components/ui/SyncErrorBanner";
import { useLocalSearchParams } from "expo-router";

export function useSyncErrors(tables: string[]) {
  const [syncErrors, setSyncErrors] = useState<SyncError[]>([]);
  // Use expo-router to capture recover error requests from NotificationFlyoutMenu
  const params = useLocalSearchParams();

  const loadSyncErrors = useCallback(async () => {
    try {
      const bitacoraDb = database.collections.get("bitacora_errores");
      const todosLosErrores = (await bitacoraDb.query().fetch()) as any[];

      const erroresFiltrados = todosLosErrores
        .filter((e) => tables.includes(e.tablaOrigen))
        .map((e) => ({
          id: e.id,
          accion: e.accion,
          mensaje: e.mensajeError,
          tabla_origen: e.tablaOrigen,
          datosAtrapados: e.payloadJson ? JSON.parse(e.payloadJson) : {},
        }));

      // Desduplicar si es el mismo registro
      const erroresUnicos = Array.from(
        new Map(
          erroresFiltrados.map((item) => [
            item.datosAtrapados.id || item.id,
            item,
          ])
        ).values()
      );

      setSyncErrors(erroresUnicos);

      // Si nos pasaron un recoverErrorId explícito, devolvemos el objeto si lo encontramos
      if (params?.recoverErrorId) {
         const autoRecover = erroresUnicos.find(e => e.id === params.recoverErrorId);
         if (autoRecover) {
             return autoRecover;
         }
      }
      return null;
    } catch (error) {
      console.error("No se pudieron cargar los errores de sincronización:", error);
      return null;
    }
  }, [tables, params?.recoverErrorId]);

  useEffect(() => {
    loadSyncErrors();
  }, [loadSyncErrors]);

  const handleDismissError = async (errorId: string) => {
    try {
      const bitacoraDb = database.collections.get("bitacora_errores");
      // Usar query en vez de find para evitar crash si el registro ya no existe
      const errorRecords = await bitacoraDb.query(Q.where('id', errorId)).fetch();
      
      if (errorRecords.length > 0) {
        const record = errorRecords[0] as any;
        try {
          const payload = JSON.parse(record.payloadJson || "{}");
          if (record.tablaOrigen && payload.id) {
            const coll = database.collections.get(record.tablaOrigen);
            const trappedRecords = await coll.query(Q.where('id', payload.id)).fetch();
            if (trappedRecords.length > 0) {
              await database.write(async () => {
                await trappedRecords[0].destroyPermanently();
              });
            }
          }
        } catch (e) {
          console.error("Error al limpiar registro atrapado", e);
        }

        await database.write(async () => {
          await record.markAsDeleted();
        });
      }

      // Siempre actualizar la UI, incluso si el registro ya no existía en la BD
      setSyncErrors(prev => prev.filter(e => e.id !== errorId));
    } catch (error) {
      console.error("Error al descartar la notificación", error);
      // Aun si falla, quitar de la UI para no bloquear al usuario
      setSyncErrors(prev => prev.filter(e => e.id !== errorId));
    }
  };

  return { syncErrors, handleDismissError, loadSyncErrors };
}
