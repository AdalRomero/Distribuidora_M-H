import { Model } from '@nozbe/watermelondb'
import { text, date, readonly, relation } from '@nozbe/watermelondb/decorators'

export default class Contacto extends Model {
  static table = 'contactos'

  @relation('clientes', 'cliente_id') cliente!: any
  @text('contenido') contenido!: string
  @readonly @date('created_at') createdAt!: number
}
