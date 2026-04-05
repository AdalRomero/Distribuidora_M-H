import { Model } from "@nozbe/watermelondb";
import { date, readonly, text } from "@nozbe/watermelondb/decorators";

export default class BitacoraError extends Model {
  static table = "bitacora_errores";

  @text("tabla_origen") tablaOrigen!: string;
  @text("registro_id") registroId!: string;
  @text("accion") accion!: string;
  @text("payload_json") payloadJson?: string;
  @text("mensaje_error") mensajeError!: string;
  @text("estado") estado!: string;

  @readonly @date("created_at") createdAt!: number;
  @readonly @date("updated_at") updatedAt!: number;
}
    