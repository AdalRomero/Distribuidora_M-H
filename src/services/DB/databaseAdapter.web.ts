import LokiJSAdapter from "@nozbe/watermelondb/adapters/lokijs";
import { mySchema } from "./schema";
import migrations from "./migrations";

export const getAdapter = () => {
  return new LokiJSAdapter({
    schema: mySchema,
    migrations,
    useWebWorker: false,
    useIncrementalIndexedDB: true,
  });
};

