export type BlockType = 
  | 'emisor_info' 
  | 'cfdi_box' 
  | 'cliente_info' 
  | 'conceptos_table' 
  | 'totales_box' 
  | 'fiscal_info' 
  | 'sellos_box' 
  | 'pagare_box';

export interface InvoiceBlock {
  i: string; // id del layout (react-grid-layout)
  type: BlockType;
  x: number;
  y: number;
  w: number;
  h: number;
  static?: boolean; // Si es true, el bloque no se puede mover/redimensionar temporalmente
}
