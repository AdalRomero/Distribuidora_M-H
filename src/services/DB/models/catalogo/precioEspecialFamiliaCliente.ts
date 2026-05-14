import { Model, Relation } from '@nozbe/watermelondb'
import { field, date, readonly, relation } from '@nozbe/watermelondb/decorators'
import Cliente from '../bases/cliente'
import Familia from '../bases/familia'

export default class PrecioEspecialFamiliaCliente extends Model {
  static table = 'precios_especiales_familias_clientes'

  @relation('clientes', 'cliente_id') cliente!: Relation<Cliente>
  @relation('familias', 'familia_id') familia!: Relation<Familia>
  @field('descuento_porcentaje') descuentoPorcentaje!: number

  @readonly @date('created_at') createdAt!: number
  @readonly @date('updated_at') updatedAt!: number
}
