import LokiJSAdapter from "@nozbe/watermelondb/adapters/lokijs";
import { mySchema } from "./schema";

export const getAdapter = () => {
  return new LokiJSAdapter({
    schema: mySchema,
    useWebWorker: false,
    useIncrementalIndexedDB: true,
  });
};

