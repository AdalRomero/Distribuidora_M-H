import { Model, Relation } from '@nozbe/watermelondb'
import { field, text, date, readonly, relation } from '@nozbe/watermelondb/decorators'
import Documento from './documento'
import Producto from '../catalogo/producto'

export default class DocumentoDetalle extends Model {
  static table = 'documentos_detalles'

  @relation('documentos', 'documento_id') documento!: Relation<Documento>
  @relation('productos', 'producto_id') producto!: Relation<Producto>
  
  @field('cantidad') cantidad!: number
  @text('descripcion_aplicada') descripcionAplicada?: string 
  @field('precio_unitario_aplicado') precioUnitarioAplicado!: number
  @field('descuento_aplicado') descuentoAplicado!: number
  @text('json_impuestos_aplicados') jsonImpuestosAplicados?: string 
  
  @readonly @date('created_at') createdAt!: number
  @readonly @date('updated_at') updatedAt!: number
}