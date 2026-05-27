import { Model } from "@nozbe/watermelondb";
import { field, date } from "@nozbe/watermelondb/decorators";

export default class Tombstone extends Model {
  static table = "tombstones";

  @field("table_name") tableName!: string;
  @field("record_id") recordId!: string;
  @date("deleted_at") deletedAt!: Date;
}
