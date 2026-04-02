import { Model } from "@nozbe/watermelondb";
import { date, field, readonly } from "@nozbe/watermelondb/decorators";

export default class Empresa extends Model {
  static table = "empresas";

  @field("distribuidora") distribuidora!: boolean;
  @field("reposteria") reposteria!: boolean;
  @readonly @date("updated_at") updatedAt!: number;
}
