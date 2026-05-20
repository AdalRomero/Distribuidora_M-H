import { Model } from "@nozbe/watermelondb";
import { date, field, readonly, text } from "@nozbe/watermelondb/decorators";

export default class StatsCache extends Model {
  static table = "stats_cache";

  @text("fecha") fecha!: string;
  @text("tipo_metrica") tipoMetrica!: string;
  @field("valor") valor!: number;
  @readonly @date("created_at") createdAt!: number;
}
