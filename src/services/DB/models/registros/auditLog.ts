import { Model } from "@nozbe/watermelondb";
import { date, field, readonly, text } from "@nozbe/watermelondb/decorators";

export default class AuditLog extends Model {
  static table = "audit_log";

  @text("tabla") tabla!: string;
  @text("registro_id") registroId!: string;
  @text("accion") accion!: string;
  @text("usuario_id") usuarioId!: string;
  @text("device_id") deviceId!: string;
  @text("campos_cambiados") camposCambiados?: string;
  @text("valores_anteriores") valoresAnteriores?: string;
  @text("valores_nuevos") valoresNuevos?: string;
  @readonly @date("created_at") createdAt!: number;
}
