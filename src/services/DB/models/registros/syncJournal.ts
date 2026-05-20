import { Model } from "@nozbe/watermelondb";
import { date, field, readonly, text } from "@nozbe/watermelondb/decorators";

export default class SyncJournal extends Model {
  static table = "sync_journal";

  @text("sync_id") syncId!: string;
  @text("direction") direction!: string;
  @text("status") status!: string;
  @text("tables_affected") tablesAffected!: string;
  @field("records_pulled") recordsPulled!: number;
  @field("records_pushed") recordsPushed!: number;
  @field("records_rejected") recordsRejected!: number;
  @field("conflicts_detected") conflictsDetected!: number;
  @field("duration_ms") durationMs!: number;
  @text("error_message") errorMessage?: string;
  @text("device_id") deviceId!: string;
  @readonly @date("created_at") createdAt!: number;
}
