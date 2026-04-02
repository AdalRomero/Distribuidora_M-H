import { synchronize } from "@nozbe/watermelondb/sync";
import { database } from "./services/DB/indexBD";
import { supabase } from "./services/api/supabaseClient";

export async function syncApp() {
  try {
    await synchronize({
      database,
      // 1. Descargar cambios de Supabase a la App
      pullChanges: async ({ lastPulledAt }) => {
        const { data, error } = await supabase.rpc("pull_changes", {
          last_pulled_at: lastPulledAt ?? 0,
        });

        if (error) throw new Error(error.message);

        return { changes: data.changes, timestamp: data.timestamp };
      },

      // 2. Subir cambios de la App a Supabase
      pushChanges: async ({ changes }) => {
        const { error } = await supabase.rpc("push_changes", {
          changes: changes,
        });

        if (error) throw new Error(error.message);
      },
      migrationsEnabledAtVersion: 2, // Coincide con la versión de tu schema
    });
  } catch (error) {
    console.error("Fallo la sincronización:", error);
  }
}
