import SQLiteAdapter from "@nozbe/watermelondb/adapters/sqlite";
import { mySchema } from "./schema";
import migrations from "./migrations";

export const getAdapter = () => {
  return new SQLiteAdapter({
    schema: mySchema,
    migrations,
    jsi: true,
    dbName: "distribuidora_mh",
    onSetUpError: (error) => {
      console.error("Error al inicializar WatermelonDB en SQLite:", error);
    },
  });
};

