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
  @readonly @date("created_at") createdAt!: number;
  @readonly @date("updated_at") updatedAt!: number;
}
