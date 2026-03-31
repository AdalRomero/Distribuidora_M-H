import { Model, Relation, Query } from '@nozbe/watermelondb'
import { field, text, date, readonly, relation, children } from '@nozbe/watermelondb/decorators'
import Familia from '../bases/familia'
import CodigoAlterno from './codigoAlterno'
import Lote from './lote'
import ProductoImpuesto from './productoImpuesto'
import ProveedorProducto from './proveedorProducto'
import PrecioEspecialCliente from './precioEspecialCliente'

export default class Producto extends Model {
  static table = 'productos'

  @relation('familias', 'familia_id') familia!: Relation<Familia>
  
  @text('codigo_interno') codigoInterno!: string
  @text('descripcion') descripcion!: string
  @field('precio_lista') precioLista!: number
  @field('precio_mayoreo') precioMayoreo!: number
  @field('precio_menudeo') precioMenudeo!: number
  @field('estado') estado!: boolean
  @readonly @date('created_at') createdAt!: number
  @readonly @date('updated_at') updatedAt!: number

  @children('codigos_alternos') codigosAlternos!: Query<CodigoAlterno>
  @children('lotes') lotes!: Query<Lote>
  @children('producto_impuestos') impuestosMultiples!: Query<ProductoImpuesto>
  @children('proveedor_productos') proveedoresQueLoVenden!: Query<ProveedorProducto>
  @children('precios_especiales_clientes') preciosEspeciales!: Query<PrecioEspecialCliente>
}