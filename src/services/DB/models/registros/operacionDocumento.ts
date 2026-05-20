import { Model, Relation } from "@nozbe/watermelondb";
import { date, field, readonly, relation, text } from "@nozbe/watermelondb/decorators";
import Documento from "./documento";

export default class OperacionDocumento extends Model {
  static table = "operaciones_documento";
  static associations = {
    documentos: { type: "belongs_to" as const, key: "documento_id" },
  };

  @relation("documentos", "documento_id") documento!: Relation<Documento>;
  @text("tipo_operacion") tipoOperacion!: string;
  @text("usuario_id") usuarioId!: string;
  @text("device_id") deviceId?: string;
  @text("motivo") motivo?: string;
  @field("monto") monto?: number;
  @text("documento_relacionado_id") documentoRelacionadoId?: string;
  @text("metadata_json") metadataJson?: string;
  @readonly @date("created_at") createdAt!: number;
}
