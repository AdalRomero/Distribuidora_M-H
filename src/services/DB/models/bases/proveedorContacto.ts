import { Model } from '@nozbe/watermelondb'
import { text, date, readonly, relation } from '@nozbe/watermelondb/decorators'
import Proveedor from './proveedor'

export default class ProveedorContacto extends Model {
  static table = 'proveedor_contactos'
  static associations = {
    proveedores: { type: 'belongs_to' as const, key: 'proveedor_id' },
  };

  @relation('proveedores', 'proveedor_id') proveedor!: Proveedor
  @text('nombre') nombre!: string
  @text('telefono') telefono?: string
  @text('correo') correo?: string
  @text('cargo') cargo?: string
  @readonly @date('created_at') createdAt!: number
  @readonly @date('updated_at') updatedAt!: number
}
