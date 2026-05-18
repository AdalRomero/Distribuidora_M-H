import LokiJSAdapter from "@nozbe/watermelondb/adapters/lokijs";
import { mySchema } from "./schema";
import migrations from "./migrations";
import { validateMigrations } from "./migrationGuard";

export const getAdapter = () => {
  validateMigrations(mySchema.version, migrations);
  return new LokiJSAdapter({
    schema: mySchema,
    migrations,
    useWebWorker: false,
    useIncrementalIndexedDB: true,
  });
};
