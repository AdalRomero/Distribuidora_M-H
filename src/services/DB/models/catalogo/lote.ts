import { Model, Relation } from "@nozbe/watermelondb";
import {
  date,
  field,
  readonly,
  relation,
  text,
} from "@nozbe/watermelondb/decorators";
import Producto from "./producto";

export default class Lote extends Model {
  static table = "lotes";
  @relation("productos", "producto_id") producto!: Relation<Producto>;
  @text("identificador_lote") identificadorLote!: string;
  @text("unidad_medida") unidadMedida!: string;
  @field("costo_adquisicion") costoAdquisicion!: number;
  @date("fecha_caducidad") fechaCaducidad?: number;
  @field("estado") estado!: boolean;
  @field("cantidad") cantidad!: number;
  @field("_version") version!: number;
  @text("updated_by") updatedBy?: string;
  @text("updated_device") updatedDevice?: string;
  @field("deleted_at") deletedAt?: number;
  @text("deleted_by") deletedBy?: string;
  @readonly @date("created_at") createdAt!: number;
  @readonly @date("updated_at") updatedAt!: number;
}
