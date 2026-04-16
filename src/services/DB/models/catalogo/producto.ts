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
import Margen from "../bases/margen";
import CodigoAlterno from "./codigoAlterno";
import Lote from "./lote";
import PrecioEspecialCliente from "./precioEspecialCliente";
import ProductoImpuesto from "./productoImpuesto";
import ProveedorProducto from "./proveedorProducto";
import MovimientoInventario from "../registros/movimientoInventario";

export default class Producto extends Model {
  static table = "productos";

  static associations = {
    familias: { type: 'belongs_to' as const, key: 'familia_id' },
    margenes: { type: 'belongs_to' as const, key: 'margen_id' },
    codigos_alternos: { type: 'has_many' as const, foreignKey: 'producto_id' },
    lotes: { type: 'has_many' as const, foreignKey: 'producto_id' },
    producto_impuestos: { type: 'has_many' as const, foreignKey: 'producto_id' },
    proveedor_productos: { type: 'has_many' as const, foreignKey: 'producto_id' },
    precios_especiales_clientes: { type: 'has_many' as const, foreignKey: 'producto_id' },
    movimientos_inventario: { type: 'has_many' as const, foreignKey: 'producto_id' },
  };

  @relation("familias", "familia_id") familia!: Relation<Familia>;
  @relation("margenes", "margen_id") margen!: Relation<Margen>;

  @text("codigo_interno") codigoInterno!: string;
  @text("clave_sat") claveSat!: string;
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

  // Cálculo de stock reactivo basado en lotes activos
  @lazy stockGlobal = this.lotes.observe().pipe(
    map((lotes) =>
      lotes.filter(l => l.estado).reduce((total, lote) => total + lote.cantidad, 0)
    )
  );
}
