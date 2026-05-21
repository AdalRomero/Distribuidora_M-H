import SQLiteAdapter from "@nozbe/watermelondb/adapters/sqlite";
import { mySchema } from "./schema";

export const getAdapter = () => {
  return new SQLiteAdapter({
    schema: mySchema,
    jsi: true,
    dbName: "distribuidora_mh",
    onSetUpError: (error) => {
      console.error("Error al inicializar WatermelonDB en SQLite:", error);
    },
  });
};
