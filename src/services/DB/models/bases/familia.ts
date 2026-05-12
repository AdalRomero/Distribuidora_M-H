import { Model, Query } from '@nozbe/watermelondb'
import { field, text, date, readonly, children } from '@nozbe/watermelondb/decorators'
import Producto from '../catalogo/producto'

export default class Familia extends Model {
  static table = 'familias'
  static associations = {
    productos: { type: 'has_many' as const, foreignKey: 'familia_id' },
  };

  @text('codigo_familia') codigoFamilia!: string
  @text('nombre') nombre!: string
  @field('estado') estado!: boolean


  @readonly @date('created_at') createdAt!: number
  @readonly @date('updated_at') updatedAt!: number

  @children('productos') productos!: Query<Producto>
}