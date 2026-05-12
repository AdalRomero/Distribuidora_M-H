import { Model, Query } from '@nozbe/watermelondb'
import { field, text, date, readonly, children } from '@nozbe/watermelondb/decorators'
import PrecioEspecialCliente from '../catalogo/precioEspecialCliente'
import Documento from '../registros/documento'
import Contacto from './contacto'

export default class Cliente extends Model {
  static table = 'clientes'
  static associations = {
    precios_especiales_clientes: { type: 'has_many' as const, foreignKey: 'cliente_id' },
    documentos: { type: 'has_many' as const, foreignKey: 'cliente_id' },
    contactos: { type: 'has_many' as const, foreignKey: 'cliente_id' },
  };

  @text('nombre') nombre!: string
  @text('rfc') rfc!: string
  @text('categoria') categoria!: string
  @text('lista_precio_base') listaPrecioBase!: string
  @field('descuento_global') descuentoGlobal!: number
  @text('contacto') contacto!: string
  @text('calle') calle!: string
  @text('colonia') colonia!: string
  @text('cp') cp!: string
  @text('ciudad') ciudad!: string
  @field('estado') estado!: boolean
  @readonly @date('created_at') createdAt!: number
  @readonly @date('updated_at') updatedAt!: number

  @children('precios_especiales_clientes') preciosEspeciales!: Query<PrecioEspecialCliente>
  @children('documentos') documentos!: Query<Documento>
  @children('contactos') contactos!: Query<Contacto>
}