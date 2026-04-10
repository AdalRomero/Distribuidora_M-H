import { Model, Query, Relation } from "@nozbe/watermelondb";
import {
  children,
  date,
  field,
  lazy,
  readonly,
  relation,
  text,
} from "@nozbe/watermelondb/decorators";
import { map } from "rxjs/operators";
import Familia from "../bases/familia";
import CodigoAlterno from "./codigoAlterno";
import Lote from "./lote";
import PrecioEspecialCliente from "./precioEspecialCliente";
import ProductoImpuesto from "./productoImpuesto";
import ProveedorProducto from "./proveedorProducto";
import MovimientoInventario from "../registros/movimientoInventario";

export default class Producto extends Model {
  static table = "productos";

  @relation("familias", "familia_id") familia!: Relation<Familia>;

  @text("codigo_interno") codigoInterno!: string;
  @text("descripcion") descripcion!: string;
  @field("precio_lista") precioLista!: number;
  @field("precio_mayoreo") precioMayoreo!: number;
  @field("precio_menudeo") precioMenudeo!: number;
  @text("imagen") imagen?: string;
  @field("estado") estado!: boolean;
  @readonly @date("created_at") createdAt!: number;
  @readonly @date("updated_at") updatedAt!: number;

  @children("codigos_alternos") codigosAlternos!: Query<CodigoAlterno>;
  @children("lotes") lotes!: Query<Lote>;
  @children("producto_impuestos") impuestosMultiples!: Query<ProductoImpuesto>;
  @children("proveedor_productos")
  proveedoresQueLoVenden!: Query<ProveedorProducto>;
  @children("precios_especiales_clientes")
  preciosEspeciales!: Query<PrecioEspecialCliente>;

  // Relación con los movimientos de inventario
  @children("movimientos_inventario")
  movimientos!: Query<MovimientoInventario>;

  // Cálculo de stock reactivo en tiempo real
  @lazy stockGlobal = this.movimientos.observe().pipe(
    map((movimientos) =>
      movimientos.reduce((total, mov) => total + mov.cantidad, 0)
    )
  );
}
