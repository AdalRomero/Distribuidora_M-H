import { Model } from '@nozbe/watermelondb'
import { field, text, date, readonly } from '@nozbe/watermelondb/decorators'

export default class InvoiceTemplate extends Model {
  static table = 'invoice_templates'

  @text('name') name!: string
  @text('layout_json') layoutJson!: string
  @field('is_default') isDefault!: boolean

  @readonly @date('created_at') createdAt!: Date
  @readonly @date('updated_at') updatedAt!: Date
}
