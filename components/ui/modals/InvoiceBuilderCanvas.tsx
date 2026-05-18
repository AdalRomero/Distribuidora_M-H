import React, { useState, useMemo, useEffect } from 'react';
import { 
  Type, Image as ImageIcon, QrCode, Barcode, Minus, Plus, Eye, 
  Settings2, Copy, Trash2, AlignLeft, AlignCenter, AlignRight, 
  AlignJustify, Bold, FileText, Check, Search, FileInput, Info,
  ArrowUp, ArrowDown, LayoutGrid, CheckSquare, Palette, Maximize,
  Layers, Settings, RefreshCw, X, HelpCircle
} from 'lucide-react';
import { InvoiceBlock, BlockType, InvoiceRow, InvoiceColumn, RowLayoutType } from '../../../types/invoice-builder';
import InvoiceBlockRenderer, { compileTemplate, defaultRowLayout, migrateLayout } from './InvoiceBlockRenderer';

export const defaultLayout = defaultRowLayout;

// Presets de Colores Premium
const PRESET_BG_COLORS = [
  { label: 'Transparente', value: 'transparent' },
  { label: 'Blanco', value: '#ffffff' },
  { label: 'Gris Claro', value: '#f8fafc' },
  { label: 'Gris Suave', value: '#f1f5f9' },
  { label: 'Azul Pálido', value: '#eff6ff' },
  { label: 'Esmeralda Pálido', value: '#ecfdf5' },
  { label: 'Cálido Pálido', value: '#fffbeb' },
  { label: 'Rojo Pálido', value: '#fef2f2' },
  { label: 'Indigo Oscuro', value: '#1e1b4b' },
  { label: 'Negro Elegante', value: '#0f172a' }
];

const PRESET_TEXT_COLORS = [
  { label: 'Negro', value: '#000000' },
  { label: 'Gris Carbón', value: '#1e293b' },
  { label: 'Gris Medio', value: '#475569' },
  { label: 'Gris Suave', value: '#64748b' },
  { label: 'Azul Real', value: '#1d4ed8' },
  { label: 'Azul Marino', value: '#1e3a8a' },
  { label: 'Esmeralda', value: '#047857' },
  { label: 'Rojo Alerta', value: '#b91c1c' },
  { label: 'Blanco Puro', value: '#ffffff' }
];

const PRESET_BORDER_COLORS = [
  { label: 'Gris Suave', value: '#e2e8f0' },
  { label: 'Gris Medio', value: '#cbd5e1' },
  { label: 'Gris Oscuro', value: '#94a3b8' },
  { label: 'Azul Claro', value: '#bfdbfe' },
  { label: 'Azul Rey', value: '#3b82f6' },
  { label: 'Rojo Borde', value: '#fca5a5' },
  { label: 'Negro', value: '#000000' }
];

const BLOCK_TYPES_METADATA: { value: BlockType; label: string; desc: string; icon: any }[] = [
  { value: 'emisor_info', label: 'Info Emisor', desc: 'Datos y logo del emisor', icon: ImageIcon },
  { value: 'cfdi_box', label: 'Caja CFDI / Folio', desc: 'Folio, Serie y Certificado', icon: FileText },
  { value: 'cliente_info', label: 'Info Cliente', desc: 'RFC y domicilio del cliente', icon: CheckSquare },
  { value: 'conceptos_table', label: 'Tabla Conceptos', desc: 'Conceptos y productos facturados', icon: LayoutGrid },
  { value: 'totales_box', label: 'Caja de Totales', desc: 'Importe, Impuestos e importe en letras', icon: Info },
  { value: 'fiscal_info', label: 'Datos Fiscales', desc: 'UUID y Certificado SAT', icon: Settings },
  { value: 'sellos_box', label: 'Sellos SAT', desc: 'Cadena original y sellos', icon: Layers },
  { value: 'pagare_box', label: 'Pagaré Comercial', desc: 'Texto legal y firmas', icon: FileInput },
  { value: 'custom_text', label: 'Texto Libre', desc: 'Párrafos o títulos editables', icon: Type },
  { value: 'custom_image', label: 'Logotipo / URL Imagen', desc: 'Renderizar imagen externa', icon: ImageIcon },
  { value: 'custom_qr', label: 'Código QR', desc: 'Encriptar datos en QR', icon: QrCode },
  { value: 'custom_barcode', label: 'Código de Barras', desc: 'Representación lineal', icon: Barcode },
  { value: 'custom_line', label: 'Divisor / Línea', desc: 'Línea horizontal decorativa', icon: Minus }
];

interface InvoiceBuilderCanvasProps {
  isEditMode: boolean;
  form: any;
  calcConcepto: (c: any) => any;
  totals: any;
  layout?: any;
  onChangeLayout?: (newLayout: any) => void;
}

export default function InvoiceBuilderCanvas({ 
  isEditMode, 
  form, 
  calcConcepto, 
  totals,
  layout = defaultRowLayout,
  onChangeLayout 
}: InvoiceBuilderCanvasProps) {

  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [zoom, setZoom] = useState<number>(1.0);
  const [editorMode, setEditorMode] = useState<'design' | 'preview'>('design');
  const [pageSize, setPageSize] = useState<'letter' | 'ticket'>('letter');
  const [varSearch, setVarSearch] = useState<string>('');
  const [copiedVar, setCopiedVar] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<'grid' | 'variables'>('grid');

  // Migrate on-the-fly if incoming layout is absolute positions
  const rows = useMemo(() => {
    return migrateLayout(layout);
  }, [layout]);

  // Synchronize layout if migrated
  useEffect(() => {
    if (layout && layout.length > 0 && !('columns' in layout[0])) {
      console.log('Migración de coordenadas absolutas a Row/Column ejecutada con éxito.');
      if (onChangeLayout) {
        onChangeLayout(rows);
      }
    }
  }, [layout, rows, onChangeLayout]);

  // Variables dinámicas para Mustache
  const availableVariables = [
    { key: 'empresa.nombre', label: 'Nombre Empresa', desc: 'Razón Social', category: 'Empresa' },
    { key: 'empresa.rfc', label: 'RFC Empresa', desc: 'Identificación Fiscal', category: 'Empresa' },
    { key: 'empresa.regimen', label: 'Régimen Fiscal', desc: 'Clave SAT', category: 'Empresa' },
    { key: 'empresa.direccion', label: 'Dirección Comercial', desc: 'Ubicación física', category: 'Empresa' },
    { key: 'empresa.telefono', label: 'Teléfono Empresa', desc: 'Contacto', category: 'Empresa' },
    
    { key: 'cliente.codigo', label: 'Código Cliente', desc: 'Identificador único', category: 'Cliente' },
    { key: 'cliente.nombre', label: 'Nombre Cliente', desc: 'Nombre comercial', category: 'Cliente' },
    { key: 'cliente.rfc', label: 'RFC Cliente', desc: 'Identificación Fiscal', category: 'Cliente' },
    { key: 'cliente.direccion', label: 'Dirección de Entrega', desc: 'Ubicación del cliente', category: 'Cliente' },
    { key: 'cliente.telefono', label: 'Teléfono Cliente', desc: 'Contacto directo', category: 'Cliente' },
    
    { key: 'venta.folio', label: 'Folio Documento', desc: 'Número consecutivo', category: 'Documento' },
    { key: 'venta.serie', label: 'Serie Documento', desc: 'Prefijo o lote', category: 'Documento' },
    { key: 'venta.fecha', label: 'Fecha Emisión', desc: 'Día del documento', category: 'Documento' },
    { key: 'venta.hora', label: 'Hora Emisión', desc: 'Momento de emisión', category: 'Documento' },
    { key: 'venta.subtotal', label: 'Subtotal ($)', desc: 'Suma de conceptos', category: 'Documento' },
    { key: 'venta.descuento', label: 'Descuento ($)', desc: 'Descuento global / productos', category: 'Documento' },
    { key: 'venta.iva', label: 'IVA Impuesto ($)', desc: '16% tasa estándar', category: 'Documento' },
    { key: 'venta.total', label: 'Importe Total ($)', desc: 'Total neto liquidación', category: 'Documento' },
    { key: 'venta.letras', label: 'Importe en Letras', desc: 'Texto formal legal', category: 'Documento' },
    { key: 'venta.metodoPago', label: 'Método Pago', desc: 'PPD o PUE', category: 'Documento' },
    { key: 'venta.formaPago', label: 'Forma Pago', desc: 'Efectivo, Tarjeta, etc.', category: 'Documento' },
    
    { key: 'usuario.nombre', label: 'Nombre Facturador', desc: 'Cajero / Administrador', category: 'Usuario' },
    { key: 'usuario.rol', label: 'Rol de Sistema', desc: 'Permiso y rango', category: 'Usuario' }
  ];

  const productVariables = [
    { key: 'concepto', label: 'Descripción Producto', category: 'Loop Productos' },
    { key: 'cantidad', label: 'Cantidad vendida', category: 'Loop Productos' },
    { key: 'valorUnitario', label: 'Precio Unitario', category: 'Loop Productos' },
    { key: 'descuento', label: 'Descuento aplicado', category: 'Loop Productos' },
    { key: 'subtotal', label: 'Importe Subtotal', category: 'Loop Productos' },
    { key: 'total', label: 'Importe Total con IVA', category: 'Loop Productos' }
  ];

  // Helper to find selected block and its column/row
  const selectedInfo = useMemo(() => {
    if (!selectedBlockId) return null;
    for (let rIdx = 0; rIdx < rows.length; rIdx++) {
      const row = rows[rIdx];
      for (let cIdx = 0; cIdx < row.columns.length; cIdx++) {
        const col = row.columns[cIdx];
        if (col.block.i === selectedBlockId) {
          return {
            row,
            rowIndex: rIdx,
            column: col,
            columnIndex: cIdx,
            block: col.block
          };
        }
      }
    }
    return null;
  }, [selectedBlockId, rows]);

  const updateSelectedBlock = (updatedFields: Partial<InvoiceBlock>) => {
    if (!selectedBlockId || !onChangeLayout) return;
    const updated = rows.map(row => {
      const cols = row.columns.map(col => {
        if (col.block.i === selectedBlockId) {
          return {
            ...col,
            block: {
              ...col.block,
              ...updatedFields
            }
          };
        }
        return col;
      });
      return { ...row, columns: cols };
    });
    onChangeLayout(updated);
  };

  // Agregar fila con layout rígido
  const handleAddRow = (layoutType: RowLayoutType) => {
    if (!onChangeLayout) return;
    const rowId = `row_${Math.random().toString(36).substr(2, 5)}`;
    
    let columns: InvoiceColumn[] = [];
    const makeBlock = (type: BlockType, content: string): InvoiceBlock => ({
      i: `block_${Math.random().toString(36).substr(2, 5)}`,
      type,
      fontSize: 8,
      textAlign: 'left',
      padding: 6,
      borderRadius: 0,
      borderWidth: 0,
      borderColor: '#e2e8f0',
      backgroundColor: 'transparent',
      content
    });

    if (layoutType === '1_col') {
      columns = [{ width: '100%', block: makeBlock('custom_text', '### Título Nuevo\nIngresa tu texto libre.') }];
    } else if (layoutType === '2_cols_50_50') {
      columns = [
        { width: '50%', block: makeBlock('custom_text', 'Columna izquierda (50%)') },
        { width: '50%', block: makeBlock('custom_text', 'Columna derecha (50%)') }
      ];
    } else if (layoutType === '2_cols_70_30') {
      columns = [
        { width: '70%', block: makeBlock('custom_text', 'Contenido Principal (70%)') },
        { width: '30%', block: makeBlock('custom_text', 'Contenido Secundario (30%)') }
      ];
    } else if (layoutType === '2_cols_30_70') {
      columns = [
        { width: '30%', block: makeBlock('custom_text', 'Contenido Secundario (30%)') },
        { width: '70%', block: makeBlock('custom_text', 'Contenido Principal (70%)') }
      ];
    } else if (layoutType === '3_cols_33_33_33') {
      columns = [
        { width: '33.33%', block: makeBlock('custom_text', 'C1') },
        { width: '33.33%', block: makeBlock('custom_text', 'C2') },
        { width: '33.33%', block: makeBlock('custom_text', 'C3') }
      ];
    }

    const newRow: InvoiceRow = {
      id: rowId,
      layout: layoutType,
      columns
    };

    const newLayout = [...rows, newRow];
    onChangeLayout(newLayout);
    setSelectedRowId(rowId);
    setSelectedBlockId(columns[0].block.i);
  };

  // Reordenar filas
  const handleMoveRow = (index: number, direction: 'up' | 'down') => {
    if (!onChangeLayout) return;
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= rows.length) return;
    
    const updated = [...rows];
    const temp = updated[index];
    updated[index] = updated[targetIdx];
    updated[targetIdx] = temp;
    
    onChangeLayout(updated);
  };

  // Eliminar Fila
  const handleDeleteRow = (id: string) => {
    if (!onChangeLayout) return;
    const updated = rows.filter(r => r.id !== id);
    onChangeLayout(updated);
    if (selectedRowId === id) {
      setSelectedRowId(null);
      setSelectedBlockId(null);
    }
  };

  // Cambiar tipo de bloque de un slot
  const handleSwapBlockType = (blockId: string, newType: BlockType) => {
    if (!onChangeLayout) return;
    
    let defaultOptions: Partial<InvoiceBlock> = {
      fontSize: 8,
      textAlign: 'left',
      padding: 6,
      borderRadius: 0,
      borderWidth: 0,
      borderColor: '#e2e8f0',
      backgroundColor: 'transparent'
    };

    switch (newType) {
      case 'custom_text':
        defaultOptions.content = '### Nuevo Texto Libre\nModifica el contenido en el panel superior.';
        break;
      case 'custom_qr':
        defaultOptions.qrValue = '{{venta.total}}';
        break;
      case 'custom_barcode':
        defaultOptions.barcodeValue = '{{cliente.codigo}}';
        break;
      case 'custom_image':
        defaultOptions.src = 'https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=150&q=80';
        defaultOptions.padding = 0;
        break;
      case 'custom_line':
        defaultOptions.borderWidth = 2;
        defaultOptions.borderColor = '#475569';
        break;
    }

    const updated = rows.map(row => {
      const cols = row.columns.map(col => {
        if (col.block.i === blockId) {
          return {
            ...col,
            block: {
              i: blockId,
              type: newType,
              ...defaultOptions
            }
          };
        }
        return col;
      });
      return { ...row, columns: cols };
    });
    
    onChangeLayout(updated);
  };

  // Copiar variables de Mustache al portapapeles y pegarlas directamente
  const handleCopyVariable = (key: string) => {
    const tag = `{{${key}}}`;
    navigator.clipboard.writeText(tag).then(() => {
      setCopiedVar(tag);
      setTimeout(() => setCopiedVar(null), 2000);
      
      if (selectedInfo && selectedInfo.block.type === 'custom_text') {
        const currentContent = selectedInfo.block.content || '';
        updateSelectedBlock({ content: currentContent + ' ' + tag });
      }
    });
  };

  const filteredVars = availableVariables.filter(v => 
    v.key.toLowerCase().includes(varSearch.toLowerCase()) ||
    v.label.toLowerCase().includes(varSearch.toLowerCase())
  );

  return (
    <div className="flex h-full w-full bg-slate-900 text-slate-100 overflow-hidden font-sans select-none relative">
      
      {/* 1. SIDEBAR IZQUIERDO: SECCIONES Y VARIABLES */}
      {isEditMode && (
        <div className="w-[260px] shrink-0 border-r border-slate-800 bg-slate-950 flex flex-col h-full overflow-hidden">
          
          {/* Tabs del Sidebar */}
          <div className="flex border-b border-slate-800 bg-slate-950/60 p-1">
            <button
              onClick={() => setActiveSection('grid')}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                activeSection === 'grid' 
                  ? 'bg-slate-850 text-white border border-slate-800 shadow-sm' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" /> Grilla & Bloques
            </button>
            <button
              onClick={() => setActiveSection('variables')}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                activeSection === 'variables' 
                  ? 'bg-slate-850 text-white border border-slate-800 shadow-sm' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Type className="w-3.5 h-3.5" /> Variables `{"{{ }}"}`
            </button>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col min-h-0">
            {activeSection === 'grid' ? (
              <div className="p-4 space-y-5">
                
                {/* Herramientas de Inserción de Filas */}
                <div className="space-y-3">
                  <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                    <LayoutGrid className="w-3.5 h-3.5 text-indigo-400" /> Insertar Fila
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {[
                      { type: '1_col' as RowLayoutType, label: '1 Columna (100%)', cols: 'Grid 100%' },
                      { type: '2_cols_50_50' as RowLayoutType, label: '2 Columnas (50% / 50%)', cols: '50/50' },
                      { type: '2_cols_70_30' as RowLayoutType, label: '2 Columnas (70% / 30%)', cols: '70/30' },
                      { type: '2_cols_30_70' as RowLayoutType, label: '2 Columnas (30% / 70%)', cols: '30/70' },
                      { type: '3_cols_33_33_33' as RowLayoutType, label: '3 Columnas (33% / 33% / 33%)', cols: '33/33/33' }
                    ].map(grid => (
                      <button
                        key={grid.type}
                        onClick={() => handleAddRow(grid.type)}
                        className="flex items-center justify-between p-2.5 bg-slate-900 border border-slate-850 hover:border-indigo-500 rounded-lg text-xs font-semibold text-slate-200 transition-all hover:bg-slate-850 active:scale-95 group"
                      >
                        <span className="flex items-center gap-2">
                          <LayoutGrid className="w-3.5 h-3.5 text-slate-500 group-hover:text-indigo-400" />
                          {grid.label}
                        </span>
                        <span className="text-[9px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-mono font-bold group-hover:bg-indigo-900/30 group-hover:text-indigo-300">{grid.cols}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Swap del Bloque Seleccionado */}
                {selectedInfo && (
                  <div className="pt-4 border-t border-slate-800 space-y-3">
                    <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                      <RefreshCw className="w-3.5 h-3.5 text-indigo-400 animate-spin-slow" /> Reemplazar Contenido
                    </div>
                    <p className="text-[10px] text-slate-500 leading-normal mb-2">Reemplaza el tipo de componente en el slot activo:</p>
                    
                    <div className="grid grid-cols-1 gap-1.5 max-h-[220px] overflow-y-auto custom-scrollbar pr-1">
                      {BLOCK_TYPES_METADATA.map(meta => {
                        const MetaIcon = meta.icon;
                        const isCurrent = selectedInfo.block.type === meta.value;
                        return (
                          <button
                            key={meta.value}
                            onClick={() => handleSwapBlockType(selectedInfo.block.i, meta.value)}
                            className={`flex items-start gap-2.5 p-2 rounded-lg text-xs transition-all border text-left ${
                              isCurrent 
                                ? 'bg-indigo-950/40 border-indigo-500 text-indigo-200 font-bold'
                                : 'bg-slate-900 border-slate-850 hover:border-slate-700 text-slate-300'
                            }`}
                          >
                            <MetaIcon className={`w-4 h-4 mt-0.5 shrink-0 ${isCurrent ? 'text-indigo-400' : 'text-slate-500'}`} />
                            <div>
                              <p className="font-semibold text-xs leading-none">{meta.label}</p>
                              <p className="text-[9px] text-slate-500 mt-1 font-medium leading-tight">{meta.desc}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

              </div>
            ) : (
              <div className="flex flex-col h-full min-h-0">
                {/* Buscador de Variables */}
                <div className="p-3 border-b border-slate-800 bg-slate-950/40">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
                    <input 
                      type="text" 
                      placeholder="Buscar variable..." 
                      value={varSearch}
                      onChange={e => setVarSearch(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-850 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                  </div>
                </div>

                {/* Listado con scroll */}
                <div className="flex-1 overflow-y-auto p-3 space-y-4 custom-scrollbar">
                  {copiedVar && (
                    <div className="bg-indigo-900/80 border border-indigo-500 text-indigo-100 p-2 rounded-lg text-center text-[10px] animate-pulse">
                      Copiado e insertado: <strong className="font-mono">{copiedVar}</strong>
                    </div>
                  )}

                  {/* Bucle de productos */}
                  <div className="space-y-1">
                    <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-ping"></span> Bucle de Productos
                    </div>
                    <div className="p-2.5 bg-indigo-950/40 border border-indigo-900/40 rounded-lg text-[10px] text-indigo-200 space-y-1.5 mb-2 leading-relaxed">
                      Para tablas dinámicas usa:<br />
                      <code className="bg-indigo-900/40 px-1 py-0.5 rounded text-white font-mono font-bold">{"{{#productos}}"}</code><br />
                      Y al final del bloque de repetición:<br />
                      <code className="bg-indigo-900/40 px-1 py-0.5 rounded text-white font-mono font-bold">{"{{/productos}}"}</code>
                    </div>
                    <div className="grid grid-cols-1 gap-1">
                      {productVariables.map(pv => (
                        <button
                          key={pv.key}
                          onClick={() => handleCopyVariable(pv.key)}
                          className="text-left w-full p-2 bg-slate-900 border border-slate-850 hover:border-slate-700 rounded-lg text-[11px] font-mono text-indigo-300 hover:text-white flex justify-between items-center transition-all active:scale-[0.98]"
                        >
                          <span>{"{?" + pv.key + "}"}</span>
                          <span className="text-[9px] text-slate-500 uppercase font-sans font-bold">Copiar</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Categorías Generales */}
                  {['Empresa', 'Cliente', 'Documento', 'Usuario'].map(cat => {
                    const catVars = filteredVars.filter(v => v.category === cat);
                    if (catVars.length === 0) return null;
                    return (
                      <div key={cat} className="space-y-1.5">
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{cat}</div>
                        <div className="grid grid-cols-1 gap-1">
                          {catVars.map(v => (
                            <button
                              key={v.key}
                              onClick={() => handleCopyVariable(v.key)}
                              className="text-left w-full p-2 bg-slate-900 hover:bg-slate-850 border border-slate-850 hover:border-slate-750 rounded-lg text-[11px] font-mono text-emerald-400 hover:text-white flex flex-col transition-all active:scale-[0.98]"
                              title={v.desc}
                            >
                              <span className="font-bold">{"{{" + v.key + "}}"}</span>
                              <span className="text-[9px] text-slate-500 font-sans mt-1 leading-none">{v.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. PANEL CENTRAL: LIENZO Y HERRAMIENTAS */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-900">
        
        {/* TOP BAR PRINCIPAL */}
        <div className="h-14 border-b border-slate-800 px-6 flex items-center justify-between bg-slate-950 shrink-0">
          {/* Modo de Edición */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setEditorMode('design')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                editorMode === 'design' 
                  ? 'bg-indigo-600 border-indigo-500 text-white shadow-md'
                  : 'bg-slate-900 border-slate-850 text-slate-400 hover:bg-slate-850'
              }`}
            >
              <Settings2 className="w-3.5 h-3.5" /> Diseño Grid-First
            </button>
            <button
              onClick={() => setEditorMode('preview')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                editorMode === 'preview' 
                  ? 'bg-emerald-600 border-emerald-500 text-white shadow-md'
                  : 'bg-slate-900 border-slate-850 text-slate-400 hover:bg-slate-850'
              }`}
            >
              <Eye className="w-3.5 h-3.5" /> Vista Previa Compilada
            </button>
          </div>

          {/* Zoom y Formatos */}
          <div className="flex items-center gap-4">
            <div className="flex items-center bg-slate-900 border border-slate-850 rounded-lg p-0.5">
              <button 
                onClick={() => setPageSize('letter')}
                className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${pageSize === 'letter' ? 'bg-slate-800 text-white' : 'text-slate-500'}`}
              >
                Carta (Carta/A4)
              </button>
              <button 
                onClick={() => setPageSize('ticket')}
                className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${pageSize === 'ticket' ? 'bg-slate-800 text-white' : 'text-slate-500'}`}
              >
                Ticket (80mm)
              </button>
            </div>

            <div className="flex items-center gap-2 bg-slate-900 border border-slate-850 rounded-lg p-0.5">
              <button 
                onClick={() => setZoom(Math.max(zoom - 0.1, 0.6))}
                className="p-1 text-slate-400 hover:text-white rounded"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="text-[11px] font-mono w-10 text-center text-slate-300 font-extrabold">{Math.round(zoom * 100)}%</span>
              <button 
                onClick={() => setZoom(Math.min(zoom + 0.1, 1.4))}
                className="p-1 text-slate-400 hover:text-white rounded"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* 3. BARRA DE HERRAMIENTAS CONTEXTUAL SUPERIOR (Estilo Google Docs) */}
        {isEditMode && editorMode === 'design' && selectedInfo && (
          <div className="bg-slate-950 border-b border-slate-850 px-6 py-2 flex flex-wrap items-center justify-between gap-4 shrink-0 animate-fadeIn relative z-[99]">
            <div className="flex flex-wrap items-center gap-2.5">
              
              {/* Estilos del Bloque */}
              <div className="flex items-center gap-1 bg-slate-900 p-0.5 border border-slate-850 rounded-lg">
                
                {/* Font Size */}
                <select
                  value={selectedInfo.block.fontSize || 8}
                  onChange={e => updateSelectedBlock({ fontSize: parseFloat(e.target.value) })}
                  className="bg-slate-900 text-slate-200 text-xs font-bold px-2 py-1 rounded focus:outline-none border-none cursor-pointer"
                  title="Tamaño de Letra"
                >
                  {[5, 6, 7, 7.5, 8, 9, 10, 11, 12, 14, 16, 18, 20].map(size => (
                    <option key={size} value={size}>{size} px</option>
                  ))}
                </select>

                <div className="w-[1px] h-4 bg-slate-800 mx-1"></div>

                {/* Bold */}
                <button
                  onClick={() => updateSelectedBlock({ fontWeight: selectedInfo.block.fontWeight === 'bold' ? 'normal' : 'bold' })}
                  className={`p-1 rounded transition-colors ${
                    selectedInfo.block.fontWeight === 'bold' ? 'bg-indigo-600 text-white font-bold' : 'hover:bg-slate-850 text-slate-400'
                  }`}
                  title="Negrita"
                >
                  <Bold className="w-3.5 h-3.5" />
                </button>

                <div className="w-[1px] h-4 bg-slate-800 mx-1"></div>

                {/* Alignment */}
                {[
                  { val: 'left', icon: AlignLeft },
                  { val: 'center', icon: AlignCenter },
                  { val: 'right', icon: AlignRight },
                  { val: 'justify', icon: AlignJustify }
                ].map(item => {
                  const AlignIcon = item.icon;
                  const isAct = (selectedInfo.block.textAlign || 'left') === item.val;
                  return (
                    <button
                      key={item.val}
                      onClick={() => updateSelectedBlock({ textAlign: item.val as any })}
                      className={`p-1 rounded transition-colors ${
                        isAct ? 'bg-indigo-600 text-white' : 'hover:bg-slate-850 text-slate-400'
                      }`}
                      title={`Alinear a la ${item.val}`}
                    >
                      <AlignIcon className="w-3.5 h-3.5" />
                    </button>
                  );
                })}
              </div>

              {/* Color Presets Picker */}
              <div className="flex items-center gap-1.5 bg-slate-900 p-0.5 border border-slate-850 rounded-lg">
                <Palette className="w-3.5 h-3.5 text-slate-500 ml-1.5 shrink-0" />
                
                {/* Background color */}
                <select
                  value={selectedInfo.block.backgroundColor || 'transparent'}
                  onChange={e => updateSelectedBlock({ backgroundColor: e.target.value })}
                  className="bg-slate-900 text-[11px] font-semibold px-2 py-1 rounded text-slate-300 border-none cursor-pointer focus:outline-none"
                  title="Fondo"
                >
                  <option value="transparent">Fondo: Transparente</option>
                  {PRESET_BG_COLORS.filter(c => c.value !== 'transparent').map(c => (
                    <option key={c.value} value={c.value}>Fondo: {c.label}</option>
                  ))}
                </select>

                <div className="w-[1px] h-4 bg-slate-800 mx-0.5"></div>

                {/* Text color */}
                <select
                  value={selectedInfo.block.textColor || '#000000'}
                  onChange={e => updateSelectedBlock({ textColor: e.target.value })}
                  className="bg-slate-900 text-[11px] font-semibold px-2 py-1 rounded text-slate-300 border-none cursor-pointer focus:outline-none"
                  title="Color de Texto"
                >
                  {PRESET_TEXT_COLORS.map(c => (
                    <option key={c.value} value={c.value}>Texto: {c.label}</option>
                  ))}
                </select>
              </div>

              {/* Padding & Borders */}
              <div className="flex items-center gap-1 bg-slate-900 p-0.5 border border-slate-850 rounded-lg">
                {/* Padding */}
                <select
                  value={selectedInfo.block.padding !== undefined ? selectedInfo.block.padding : 4}
                  onChange={e => updateSelectedBlock({ padding: parseInt(e.target.value) })}
                  className="bg-slate-900 text-[11px] font-semibold px-2 py-1 rounded text-slate-300 border-none cursor-pointer focus:outline-none"
                  title="Relleno Interno"
                >
                  {[0, 2, 4, 6, 8, 10, 12, 16].map(p => (
                    <option key={p} value={p}>Padding: {p}px</option>
                  ))}
                </select>

                <div className="w-[1px] h-4 bg-slate-800 mx-1"></div>

                {/* Borders */}
                <select
                  value={selectedInfo.block.borderWidth || 0}
                  onChange={e => updateSelectedBlock({ borderWidth: parseInt(e.target.value) })}
                  className="bg-slate-900 text-[11px] font-semibold px-2 py-1 rounded text-slate-300 border-none cursor-pointer focus:outline-none"
                  title="Grosor de Borde"
                >
                  {[0, 1, 2, 3, 4].map(w => (
                    <option key={w} value={w}>{w === 0 ? 'Sin bordes' : `Borde: ${w}px`}</option>
                  ))}
                </select>

                {selectedInfo.block.borderWidth && selectedInfo.block.borderWidth > 0 && (
                  <>
                    <div className="w-[1px] h-4 bg-slate-800 mx-1"></div>
                    <select
                      value={selectedInfo.block.borderColor || '#cbd5e1'}
                      onChange={e => updateSelectedBlock({ borderColor: e.target.value })}
                      className="bg-slate-900 text-[11px] font-semibold px-2 py-1 rounded text-slate-300 border-none cursor-pointer focus:outline-none"
                      title="Color de Borde"
                    >
                      {PRESET_BORDER_COLORS.map(c => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                    </select>
                  </>
                )}
              </div>
            </div>

            {/* Inputs de Contenido Contextuales */}
            <div className="flex items-center gap-3 flex-1 min-w-[280px] md:max-w-md justify-end">
              {selectedInfo.block.type === 'custom_text' && (
                <div className="flex items-center gap-2 w-full">
                  <textarea
                    rows={1}
                    value={selectedInfo.block.content || ''}
                    onChange={e => updateSelectedBlock({ content: e.target.value })}
                    placeholder="Contenido de Texto Libre (Markdown / Variables)..."
                    className="w-full bg-slate-900 border border-slate-800 hover:border-slate-700 focus:border-indigo-500 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none transition-all font-mono resize-y min-h-[32px] max-h-[80px]"
                  />
                </div>
              )}

              {selectedInfo.block.type === 'custom_image' && (
                <input
                  type="text"
                  value={selectedInfo.block.src || ''}
                  onChange={e => updateSelectedBlock({ src: e.target.value })}
                  placeholder="URL o Base64 de la Imagen..."
                  className="w-full max-w-[220px] bg-slate-900 border border-slate-850 hover:border-slate-750 focus:border-indigo-500 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:outline-none"
                />
              )}

              {selectedInfo.block.type === 'custom_qr' && (
                <input
                  type="text"
                  value={selectedInfo.block.qrValue || ''}
                  onChange={e => updateSelectedBlock({ qrValue: e.target.value })}
                  placeholder="Ej: Total: {{venta.total}}"
                  className="w-full max-w-[180px] bg-slate-900 border border-slate-850 hover:border-slate-750 focus:border-indigo-500 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:outline-none font-mono font-bold"
                  title="Valor para código QR"
                />
              )}

              {selectedInfo.block.type === 'custom_barcode' && (
                <input
                  type="text"
                  value={selectedInfo.block.barcodeValue || ''}
                  onChange={e => updateSelectedBlock({ barcodeValue: e.target.value })}
                  placeholder="Ej: {{cliente.codigo}}"
                  className="w-full max-w-[180px] bg-slate-900 border border-slate-850 hover:border-slate-750 focus:border-indigo-500 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:outline-none font-mono font-bold"
                  title="Valor para código de barras"
                />
              )}
            </div>
          </div>
        )}

        {/* CONTENEDOR DEL LIENZO */}
        <div 
          className="flex-1 overflow-auto p-8 flex items-start justify-center bg-slate-900 custom-scrollbar"
          style={{ backgroundImage: 'radial-gradient(#1e293b 1.5px, transparent 1.5px)', backgroundSize: '24px 24px' }}
        >
          <div 
            className="transition-transform duration-100 origin-top shadow-2xl relative"
            style={{ 
              transform: `scale(${zoom})`,
              marginBottom: '100px'
            }}
          >
            
            {/* HOJA DE PAPEL TAMAÑO CARTA */}
            <div 
              className="bg-white text-slate-950 transition-all shadow-2xl relative" 
              style={{ 
                width: pageSize === 'letter' ? 680 : 320, 
                minHeight: pageSize === 'letter' ? 880 : 'auto',
                padding: '24px 20px',
                border: isEditMode && editorMode === 'design' ? '2.5px solid #4f46e5' : 'none',
                boxSizing: 'border-box'
              }}
            >
              
              {/* Grid visual del papel */}
              {isEditMode && editorMode === 'design' && (
                <div className="absolute inset-0 pointer-events-none opacity-[0.025]" style={{ backgroundImage: 'linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)', backgroundSize: '15px 15px' }}></div>
              )}

              {/* CONTENEDOR DE FILAS Y COLUMNAS */}
              <div 
                style={{
                  width: pageSize === 'letter' ? 640 : 280,
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '12px',
                  boxSizing: 'border-box' 
                }}
              >
                {rows.map((row, rIdx) => {
                  const isRowSelected = selectedRowId === row.id;
                  
                  return (
                    <div 
                      key={row.id}
                      onClick={() => isEditMode && setSelectedRowId(row.id)}
                      className={`relative group flex w-full transition-all rounded-lg border ${
                        isEditMode && editorMode === 'design'
                          ? isRowSelected
                            ? 'border-indigo-600 bg-indigo-500/[0.01] ring-2 ring-indigo-500/20' 
                            : 'border-slate-100 hover:border-slate-300 border-dashed hover:bg-slate-50/10'
                          : 'border-transparent'
                      }`}
                      style={{
                        gap: pageSize === 'letter' ? '16px' : '8px',
                        boxSizing: 'border-box',
                        alignItems: 'stretch',
                        padding: isEditMode && editorMode === 'design' ? '4px' : '0'
                      }}
                    >
                      {/* ACCIONES DE FILA (SUBIR / BAJAR / ELIMINAR) */}
                      {isEditMode && editorMode === 'design' && (
                        <div className="absolute -left-[54px] top-1/2 -translate-y-1/2 hidden group-hover:flex flex-col gap-1 bg-slate-950 border border-slate-800 p-1 rounded-lg shadow-xl z-50 animate-fadeIn">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleMoveRow(rIdx, 'up'); }}
                            className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded transition-colors"
                            title="Subir Fila"
                            disabled={rIdx === 0}
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleMoveRow(rIdx, 'down'); }}
                            className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded transition-colors"
                            title="Bajar Fila"
                            disabled={rIdx === rows.length - 1}
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDeleteRow(row.id); }}
                            className="p-1 hover:bg-red-950 text-red-400 rounded transition-colors border-t border-slate-800 mt-1 pt-1"
                            title="Eliminar Fila Completa"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}

                      {/* RENDER COLUMNAS / SLOTS */}
                      {row.columns.map((col, cIdx) => {
                        const isBlockSelected = selectedBlockId === col.block.i;
                        
                        return (
                          <div 
                            key={col.block.i}
                            style={{
                              width: col.width,
                              boxSizing: 'border-box',
                              display: 'flex',
                              flexDirection: 'column'
                            }}
                          >
                            {/* BLOCK WRAPPER */}
                            <div
                              onClick={(e) => {
                                if (!isEditMode) return;
                                e.stopPropagation();
                                setSelectedRowId(row.id);
                                setSelectedBlockId(col.block.i);
                              }}
                              className={`relative transition-all ${
                                isEditMode && editorMode === 'design'
                                  ? `hover:shadow-md border cursor-pointer rounded-lg p-0.5 ${
                                      isBlockSelected
                                        ? 'border-indigo-600 bg-indigo-500/5 ring-1 ring-indigo-500' 
                                        : 'border-slate-200 border-dashed hover:border-indigo-400 hover:bg-slate-50/20'
                                    }`
                                  : 'border border-transparent'
                              }`}
                              style={{
                                boxSizing: 'border-box',
                                minHeight: '40px'
                              }}
                            >
                              {/* RENDER COMPONENT */}
                              <InvoiceBlockRenderer 
                                type={col.block.type} 
                                form={editorMode === 'preview' ? form : {}} 
                                calcConcepto={calcConcepto} 
                                totals={totals}
                                block={col.block}
                              />

                              {/* Label indicativo de bloque */}
                              {isEditMode && editorMode === 'design' && (
                                <div className="absolute bottom-0 right-0 bg-slate-900/90 text-white text-[6.5px] px-1 py-0.5 rounded-tl font-mono font-bold uppercase tracking-wider opacity-60">
                                  {col.block.type.replace('custom_', '')}
                                </div>
                              )}

                              {/* Borde e indicador si seleccionado */}
                              {isEditMode && editorMode === 'design' && isBlockSelected && (
                                <div className="absolute inset-0 border border-indigo-600 rounded-lg pointer-events-none" />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>

            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
