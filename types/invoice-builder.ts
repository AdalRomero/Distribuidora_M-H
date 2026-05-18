export type BlockType = 
  | 'emisor_info' 
  | 'cfdi_box' 
  | 'cliente_info' 
  | 'conceptos_table' 
  | 'totales_box' 
  | 'fiscal_info' 
  | 'sellos_box' 
  | 'pagare_box'
  | 'custom_text'
  | 'custom_image'
  | 'custom_qr'
  | 'custom_barcode'
  | 'custom_line';

export interface InvoiceBlock {
  i: string; // id del bloque
  type: BlockType;
  x?: number; // Posición absoluta opcional (legacy compatibility)
  y?: number; // Posición absoluta opcional (legacy compatibility)
  w?: number; // Ancho opcional (legacy compatibility)
  h?: number; // Alto opcional (legacy compatibility)
  static?: boolean; // Bloque inamovible (legacy compatibility)
  // Custom styling and content options
  content?: string; // Para texto personalizado, soporte de variables: {{cliente.nombre}}
  src?: string; // Para imagenes
  qrValue?: string; // Valor codificado en QR (admite variables)
  barcodeValue?: string; // Valor del codigo de barras
  fontSize?: number; // Tamaño de letra
  fontWeight?: 'normal' | 'bold';
  textAlign?: 'left' | 'center' | 'right' | 'justify';
  backgroundColor?: string;
  textColor?: string;
  borderColor?: string;
  borderWidth?: number;
  padding?: number;
  borderRadius?: number;
  // Visual layout engine extensions
  zIndex?: number; // Orden de capa
  autoHeight?: boolean; // Auto expandir altura por contenido
  overflow?: 'hidden' | 'visible' | 'scroll'; // Control de desbordamiento de texto
}

export interface InvoiceColumn {
  width: string; // Ancho en porcentaje (e.g. '100%', '50%', '70%', '30%', '33.33%')
  block: InvoiceBlock;
  style?: React.CSSProperties;
}

export type RowLayoutType = 
  | '1_col' 
  | '2_cols_50_50' 
  | '2_cols_70_30' 
  | '2_cols_30_70' 
  | '3_cols_33_33_33';

export interface InvoiceRow {
  id: string;
  layout: RowLayoutType;
  columns: InvoiceColumn[];
  style?: React.CSSProperties;
}
