import { Model, Query } from '@nozbe/watermelondb'
import { field, text, date, readonly, children } from '@nozbe/watermelondb/decorators'
import PrecioEspecialCliente from '../catalogo/precioEspecialCliente'
import Documento from '../registros/documento'

export default class Cliente extends Model {
  static table = 'clientes'

  @text('nombre') nombre!: string
  @text('lista_precio_base') listaPrecioBase!: string
  @field('descuento_global') descuentoGlobal!: number
  @field('estado') estado!: boolean
  @readonly @date('created_at') createdAt!: number
  @readonly @date('updated_at') updatedAt!: number

  @children('precios_especiales_clientes') preciosEspeciales!: Query<PrecioEspecialCliente>
  @children('documentos') documentos!: Query<Documento>
}