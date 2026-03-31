import { Model, Relation, Query } from '@nozbe/watermelondb'
import { field, text, date, readonly, relation, children } from '@nozbe/watermelondb/decorators'
import Cliente from '../bases/cliente'
import DocumentoDetalle from './documentoDetalle'

export default class Documento extends Model {
  static table = 'documentos'

  @relation('clientes', 'cliente_id') cliente!: Relation<Cliente>
  @text('usuario_id') usuarioId!: string 
  
  @text('tipo') tipo!: string 
  @text('folio') folio?: string
  @text('estado') estado!: string
  @field('subtotal') subtotal!: number
  @field('total_impuestos') totalImpuestos!: number
  @field('total') total!: number
  
  @readonly @date('created_at') createdAt!: number
  @readonly @date('updated_at') updatedAt!: number

  @children('documentos_detalles') detalles!: Query<DocumentoDetalle>
}