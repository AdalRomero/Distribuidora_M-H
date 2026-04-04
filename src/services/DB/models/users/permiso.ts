import { Model } from "@nozbe/watermelondb";
import { date, field, readonly } from "@nozbe/watermelondb/decorators";

export default class Permiso extends Model {
  static table = "permisos";

  @field("inventario") inventario!: boolean;
  @field("clientes") clientes!: boolean;
  @field("facturas") facturas!: boolean;
  @field("precios") precios!: boolean;
  @field("usuarios") usuarios!: boolean;
  @field("configuraciones") configuraciones!: boolean;
  @readonly @date("updated_at") updatedAt!: number;
}
