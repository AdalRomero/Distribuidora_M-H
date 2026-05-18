import React from 'react';
import { BlockType, InvoiceBlock, InvoiceRow, InvoiceColumn, RowLayoutType } from '../../../types/invoice-builder';
import { LOGO_MH_B64 } from '../../../constants/logo_base64';

const MARGIN_LEFT_RIGHT = 20; // x margin inside the 680px sheet (width of grid content is 640px)
const MARGIN_TOP_BOTTOM = 24; // y margin inside the 880px sheet

export const defaultRowLayout: InvoiceRow[] = [
  {
    id: 'row_1',
    layout: '2_cols_70_30',
    columns: [
      { width: '70%', block: { i: 'emisor_info', type: 'emisor_info' } },
      { width: '30%', block: { i: 'cfdi_box', type: 'cfdi_box' } }
    ]
  },
  {
    id: 'row_2',
    layout: '1_col',
    columns: [
      { width: '100%', block: { i: 'cliente_info', type: 'cliente_info' } }
    ]
  },
  {
    id: 'row_3',
    layout: '1_col',
    columns: [
      { width: '100%', block: { i: 'conceptos_table', type: 'conceptos_table' } }
    ]
  },
  {
    id: 'row_4',
    layout: '1_col',
    columns: [
      { width: '100%', block: { i: 'totales_box', type: 'totales_box' } }
    ]
  },
  {
    id: 'row_5',
    layout: '1_col',
    columns: [
      { width: '100%', block: { i: 'fiscal_info', type: 'fiscal_info' } }
    ]
  },
  {
    id: 'row_6',
    layout: '1_col',
    columns: [
      { width: '100%', block: { i: 'sellos_box', type: 'sellos_box' } }
    ]
  },
  {
    id: 'row_7',
    layout: '1_col',
    columns: [
      { width: '100%', block: { i: 'pagare_box', type: 'pagare_box' } }
    ]
  }
];

export const migrateLayout = (layout: any): InvoiceRow[] => {
  if (!layout || !Array.isArray(layout)) return defaultRowLayout;
  
  // If it's already in the Row/Column format, return it
  if (layout.length > 0 && 'columns' in layout[0]) {
    return layout as InvoiceRow[];
  }
  
  // Convert old absolute positioned blocks to Row/Column format
  // Sort blocks by y-coordinate first
  const sortedBlocks = [...layout].sort((a, b) => (a.y || 0) - (b.y || 0));
  
  const rows: InvoiceRow[] = [];
  let currentRowBlocks: any[] = [];
  let lastY = -1;
  
  for (const block of sortedBlocks) {
    const blockY = block.y || 0;
    if (lastY === -1) {
      currentRowBlocks.push(block);
      lastY = blockY;
    } else if (Math.abs(blockY - lastY) < 25) { // Tolerancia para agrupar horizontalmente
      currentRowBlocks.push(block);
    } else {
      rows.push(createRowFromBlocks(currentRowBlocks));
      currentRowBlocks = [block];
      lastY = blockY;
    }
  }
  
  if (currentRowBlocks.length > 0) {
    rows.push(createRowFromBlocks(currentRowBlocks));
  }
  
  return rows.length > 0 ? rows : defaultRowLayout;
};

const createRowFromBlocks = (blocks: any[]): InvoiceRow => {
  // Ordenar de izquierda a derecha
  const sorted = [...blocks].sort((a, b) => (a.x || 0) - (b.x || 0));
  const rowId = `row_${Math.random().toString(36).substr(2, 5)}`;
  
  let layoutType: RowLayoutType = '1_col';
  if (sorted.length === 2) {
    const w1 = sorted[0].w || 320;
    const w2 = sorted[1].w || 320;
    const ratio = w1 / (w1 + w2);
    if (ratio > 0.6 && ratio < 0.8) {
      layoutType = '2_cols_70_30';
    } else if (ratio < 0.4 && ratio > 0.2) {
      layoutType = '2_cols_30_70';
    } else {
      layoutType = '2_cols_50_50';
    }
  } else if (sorted.length >= 3) {
    layoutType = '3_cols_33_33_33';
  }
  
  const columns = sorted.map((block) => {
    let colWidth = '100%';
    if (layoutType === '2_cols_50_50') colWidth = '50%';
    else if (layoutType === '2_cols_70_30') colWidth = sorted.indexOf(block) === 0 ? '70%' : '30%';
    else if (layoutType === '2_cols_30_70') colWidth = sorted.indexOf(block) === 0 ? '30%' : '70%';
    else if (layoutType === '3_cols_33_33_33') colWidth = '33.33%';
    
    const { x, y, w, h, static: isStatic, ...cleanBlock } = block;
    return {
      width: colWidth,
      block: {
        ...cleanBlock,
        fontSize: cleanBlock.fontSize || 7.5,
        borderRadius: cleanBlock.borderRadius || 0,
        borderWidth: cleanBlock.borderWidth || 0,
        borderColor: cleanBlock.borderColor || '#e2e8f0',
        backgroundColor: cleanBlock.backgroundColor || 'transparent',
        padding: cleanBlock.padding !== undefined ? cleanBlock.padding : 4,
      } as InvoiceBlock
    };
  });
  
  return {
    id: rowId,
    layout: layoutType,
    columns
  };
};

export function InvoiceLayoutFlow({
  layout,
  form,
  calcConcepto,
  totals,
  pageSize = 'letter'
}: {
  layout: any;
  form: any;
  calcConcepto: (c: any) => any;
  totals: any;
  pageSize?: 'letter' | 'ticket';
}) {
  const rows = React.useMemo(() => migrateLayout(layout), [layout]);
  const contentWidth = pageSize === 'letter' ? 640 : 280;

  return (
    <div 
      style={{ 
        width: `${contentWidth}px`, 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '12px',
        boxSizing: 'border-box'
      }}
    >
      {rows.map((row) => (
        <div 
          key={row.id}
          style={{
            display: 'flex',
            width: '100%',
            gap: pageSize === 'letter' ? '16px' : '8px',
            boxSizing: 'border-box',
            alignItems: 'stretch'
          }}
        >
          {row.columns.map((col, idx) => (
            <div 
              key={idx}
              style={{
                width: col.width,
                boxSizing: 'border-box',
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              <InvoiceBlockRenderer 
                type={col.block.type}
                form={form}
                calcConcepto={calcConcepto}
                totals={totals}
                block={col.block}
              />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}


export const normalizeLayout = (blocks: InvoiceBlock[], pageSize: 'letter' | 'ticket'): InvoiceBlock[] => {
  const contentWidth = pageSize === 'letter' ? 640 : 280;
  
  return blocks.map(block => {
    // If w <= 12, it is a legacy grid-based block! We must upscale it dynamically to pixels
    const blockW = block.w !== undefined ? block.w : 12;
    const blockH = block.h !== undefined ? block.h : 8;
    const blockX = block.x !== undefined ? block.x : 0;
    const blockY = block.y !== undefined ? block.y : 0;
    
    const isLegacy = blockW <= 12 && blockH < 100;
    if (isLegacy) {
      // 12 columns mapping to contentWidth
      const xPx = Math.round((blockX / 12) * contentWidth);
      const wPx = Math.round((blockW / 12) * contentWidth);
      // y unit was 10px in react-grid-layout
      const yPx = Math.round(blockY * 10);
      const hPx = Math.round(blockH * 10);
      
      return {
        ...block,
        x: xPx,
        y: yPx,
        w: wPx,
        h: hPx,
        zIndex: 1,
        autoHeight: block.type === 'conceptos_table' || block.type === 'totales_box' ? true : false,
        overflow: 'hidden',
        fontSize: block.fontSize || 7.5,
        borderRadius: block.borderRadius || 0,
        borderWidth: block.borderWidth || 0,
        borderColor: block.borderColor || '#cbd5e1',
        backgroundColor: block.backgroundColor || 'transparent',
        padding: block.padding !== undefined ? block.padding : 4,
      };
    }
    
    // Modern pixel block: guarantee zIndex and other layout properties exist
    return {
      ...block,
      zIndex: block.zIndex !== undefined ? block.zIndex : 1,
      autoHeight: block.autoHeight !== undefined ? block.autoHeight : (block.type === 'conceptos_table' || block.type === 'totales_box' ? true : false),
      overflow: block.overflow || 'hidden',
      fontSize: block.fontSize || 7.5,
      borderRadius: block.borderRadius || 0,
      borderWidth: block.borderWidth || 0,
      borderColor: block.borderColor || '#cbd5e1',
      backgroundColor: block.backgroundColor || 'transparent',
      padding: block.padding !== undefined ? block.padding : 4,
    };
  });
};

const fmt = (n: number) => n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function toLetras(num: number): string { 
  if (num === 0) return 'CERO PESOS 00/100 M.N.'; 
  const entero = Math.floor(num); 
  const dec = Math.round((num - entero) * 100); 
  return `${entero.toLocaleString()} PESOS ${dec.toString().padStart(2, '0')}/100 M.N.`; 
}

function SelloBox({ title, value }: { title: string; value: string }) { 
  return (
    <div style={{ border: '1px solid #e2e8f0', marginBottom: 4, borderRadius: 4, overflow: 'hidden' }}>
      <p style={{ background: '#f1f5f9', padding: '2px 6px', fontSize: 6.5, fontWeight: 'bold', color: '#475569', marginBottom: 0 }}>{title}</p>
      <p style={{ padding: '4px 6px', fontSize: 5.5, wordBreak: 'break-all', fontFamily: 'monospace', color: '#64748b', lineHeight: 1.25 }}>{value}</p>
    </div>
  ); 
}

interface RendererProps {
  type: BlockType;
  form: any;
  calcConcepto: (c: any) => any;
  totals: { totalSubtotal: number; totalDesc: number; totalImpuestos: number; totalFinal: number };
  block?: InvoiceBlock; // Prop opcional para customizaciones
}

const FAKE_UUID = 'A1B2C3D4-E5F6-7890-ABCD-EF1234567890';
const FAKE_SELLO_CFDI = 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA2k9z7TbVe8X1JM5BzV1pKaAAAAAAAAAAAAAAAAAA==';
const FAKE_SELLO_SAT = 'GxR+PoIrGoTOYeVHvXzqBcN7Lw1fDpMjTGYkRsE0AaaZz9BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB==';
const FAKE_CERT_EMISOR = '30001000000500003416';
const FAKE_CERT_SAT = '20001000000300022323';
const FAKE_CADENA = '||4.0|MH|01|2026-03-21T10:00:00|01|00001000000500003416|1000.00|MXN|1160.00|I|PPD|83556|MICV9209288D2|VIANEY OMARA MIRANDA CASTRO|612|XAXX010101000|PÚBLICO EN GENERAL|83556|616|S01|...||';

// Generar variables dinámicas para render
export const getInterpolationData = (form: any, totals: any) => {
  return {
    empresa: {
      nombre: 'VIANEY OMARA MIRANDA CASTRO',
      rfc: 'MICV9209288D2',
      direccion: 'Blvd. Samuel Ocaña entre Puerto de Ensenada y Vicente Suarez 400/2 Col Lopez Portillo CP. 83556',
      telefono: '638 102 1180',
      regimen: '612 — Personas Físicas con Actividades Empresariales y Profesionales',
    },
    cliente: {
      codigo: form.codigoCliente || '01023',
      nombre: form.nombre || 'PÚBLICO EN GENERAL',
      rfc: form.rfc || 'XAXX010101000',
      direccion: form.domicilio || 'AVE. PUERTO DE ENSENADA S/N LOPEZ PORTILLO C.P. 83556, PUERTO PEÑASCO, SONORA',
      telefono: form.telefono || '638 102 1180',
      usoCFDI: form.usoCFDI || 'S01 - Sin efectos fiscales',
    },
    venta: {
      folio: form.folio || '001',
      serie: form.serie || 'MH',
      fecha: form.fecha || '2026-05-17',
      hora: form.hora || '12:00',
      subtotal: fmt(totals?.totalSubtotal || 0),
      descuento: fmt(totals?.totalDesc || 0),
      iva: fmt(totals?.totalImpuestos || 0),
      total: fmt(totals?.totalFinal || 0),
      letras: toLetras(totals?.totalFinal || 0),
      metodoPago: form.metodoPago || 'PPD - Pago en parcialidades o diferido',
      formaPago: form.formaPago || '99 - Por definir',
      moneda: form.moneda || 'MXN - Peso Mexicano',
      observaciones: form.observaciones || 'Ninguna',
      tipoComprobante: form.tipoComprobante || 'I - Ingreso',
      lugarExpedicion: form.lugarExpedicion || '83556',
      tipoRelacion: form.tipoRelacion || 'Ninguno',
      cfdiRelacionado: form.cfdiRelacionado || 'Ninguno',
    },
    usuario: {
      nombre: 'Administrador',
      rol: 'Administrador'
    }
  };
};

export const compileTemplate = (template: string, form: any, totals: any) => {
  if (!template) return '\u00A0';
  const data = getInterpolationData(form, totals);
  
  // 1. Procesar Loop de Productos: {{#productos}} ... {{/productos}}
  let processed = template;
  const loopRegex = /\{\{#productos\}\}([\s\S]*?)\{\{\/productos\}\}/g;
  processed = processed.replace(loopRegex, (_, loopContent) => {
    if (!form.conceptos || form.conceptos.length === 0) return '';
    return form.conceptos.map((prod: any, idx: number) => {
      const vu = parseFloat(prod.valorUnitario) || 0;
      const cant = parseFloat(prod.cantidad) || 0;
      const descPorc = parseFloat(prod.descuento) || 0;
      const baseVal = cant * vu;
      const descMonto = baseVal * (descPorc / 100);
      const sub = baseVal - descMonto;
      
      const prodData = {
        index: idx + 1,
        concepto: prod.concepto || '\u00A0',
        cantidad: prod.cantidad || '0',
        valorUnitario: fmt(vu),
        descuento: prod.descuento ? `${prod.descuento}%` : '0%',
        subtotal: fmt(sub),
        total: fmt(sub * (1 + (parseFloat(prod.porcImpuesto) || 0) / 100)),
      };
      
      return loopContent.replace(/\{\{([^}]+)\}\}/g, (__: string, key: string) => {
        const cleanKey = key.trim();
        const value = (prodData as any)[cleanKey];
        return value !== undefined && value !== '' ? String(value) : '\u00A0';
      });
    }).join('\n');
  });

  // 2. Procesar variables de nivel superior
  return processed.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
    const cleanKey = key.trim();
    const parts = cleanKey.split('.');
    let val: any = data;
    for (const part of parts) {
      if (val === null || val === undefined) return '\u00A0';
      val = val[part];
    }
    return val !== undefined && val !== '' ? String(val) : '\u00A0';
  });
};

export default function InvoiceBlockRenderer({ type, form, calcConcepto, totals, block }: RendererProps) {
  // Configurar estilos personalizados desde las propiedades del bloque
  const containerStyle: React.CSSProperties = {
    width: '100%',
    height: block?.autoHeight ? 'auto' : '100%',
    minHeight: block?.autoHeight ? '100%' : undefined,
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-start',
    padding: block?.padding !== undefined ? `${block.padding}px` : '4px',
    backgroundColor: block?.backgroundColor || 'transparent',
    color: block?.textColor || '#000000',
    border: block?.borderWidth ? `${block.borderWidth}px solid ${block.borderColor || '#cbd5e1'}` : 'none',
    borderRadius: block?.borderRadius ? `${block.borderRadius}px` : '0px',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    fontSize: block?.fontSize ? `${block.fontSize}px` : '7.5px',
    fontWeight: block?.fontWeight || 'normal',
    wordBreak: 'break-word',
  };

  switch (type) {
    case 'emisor_info':
      return (
        <div style={{ ...containerStyle, flexDirection: 'row', display: 'flex', gap: '16px', alignItems: 'center' }}>
          {/* Logo container */}
          <div style={{ 
            width: 72, 
            height: 72, 
            flexShrink: 0, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            background: '#ffffff', 
            borderRadius: 8, 
            border: '1.2px solid #e2e8f0', 
            padding: '6px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
          }}>
            <img src={`data:image/svg+xml;base64,${LOGO_MH_B64}`} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
          {/* Info container */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px', textAlign: 'left' }}>
            <h1 style={{ 
              fontWeight: '800', 
              fontSize: block?.fontSize ? block.fontSize + 3.5 : 12, 
              margin: '0 0 3px 0', 
              color: '#1e3a8a', 
              letterSpacing: '0.4px', 
              textTransform: 'uppercase',
              lineHeight: 1.1 
            }}>
              {compileTemplate('{{empresa.nombre}}', form, totals)}
            </h1>
            <p style={{ margin: 0, fontSize: block?.fontSize ? block.fontSize : 8, color: '#334155', fontWeight: '700' }}>
              RFC: <span style={{ color: '#0f172a', fontWeight: '800' }}>{compileTemplate('{{empresa.rfc}}', form, totals)}</span>
            </p>
            <p style={{ margin: 0, fontSize: block?.fontSize ? block.fontSize - 0.5 : 7.5, color: '#64748b', fontWeight: '500', lineHeight: 1.25 }}>
              Régimen: <span style={{ color: '#334155', fontWeight: '600' }}>{compileTemplate('{{empresa.regimen}}', form, totals)}</span>
            </p>
            <p style={{ margin: 0, fontSize: block?.fontSize ? block.fontSize - 0.5 : 7.5, color: '#64748b', fontWeight: '500', lineHeight: 1.25 }}>
              Dirección: <span style={{ color: '#334155', fontWeight: '600' }}>{compileTemplate('{{empresa.direccion}}', form, totals)}</span>
            </p>
            <p style={{ margin: '2px 0 0 0', fontSize: block?.fontSize ? block.fontSize : 8, color: '#475569', fontWeight: '700' }}>
              Contacto Tel: <span style={{ color: '#1e3a8a', fontWeight: '800' }}>{compileTemplate('{{empresa.telefono}}', form, totals)}</span>
            </p>
          </div>
        </div>
      );

    case 'cfdi_box':
      return (
        <div style={{ 
          ...containerStyle, 
          textAlign: 'left', 
          padding: '10px 14px', 
          fontSize: block?.fontSize ? `${block.fontSize}px` : '7.5px',
          border: '1.2px solid #e2e8f0',
          borderRadius: 8,
          background: '#f8fafc',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
        }}>
          <p style={{ 
            fontWeight: '800', 
            fontSize: block?.fontSize ? block.fontSize + 2 : 10.5, 
            margin: '0 0 8px 0', 
            color: '#1e3a8a', 
            textTransform: 'uppercase', 
            letterSpacing: '0.5px',
            borderBottom: '1.5px solid #e2e8f0',
            paddingBottom: '4px'
          }}>Comprobante</p>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'inherit', color: '#334155', lineHeight: 1.5 }}>
            <tbody>
              <tr><td style={{ padding: '3px 0', borderBottom: '1px solid #f1f5f9' }}><span style={{ color: '#64748b', fontWeight: '600' }}>Serie / Folio:</span></td><td style={{ padding: '3px 0', borderBottom: '1px solid #f1f5f9', textAlign: 'right' }}><strong style={{ color: '#0f172a' }}>{compileTemplate('{{venta.serie}}-{{venta.folio}}', form, totals)}</strong></td></tr>
              <tr><td style={{ padding: '3px 0', borderBottom: '1px solid #f1f5f9' }}><span style={{ color: '#64748b', fontWeight: '600' }}>Fecha:</span></td><td style={{ padding: '3px 0', borderBottom: '1px solid #f1f5f9', textAlign: 'right' }}><strong style={{ color: '#0f172a' }}>{compileTemplate('{{venta.fecha}}', form, totals)}</strong></td></tr>
              <tr><td style={{ padding: '3px 0', borderBottom: '1px solid #f1f5f9' }}><span style={{ color: '#64748b', fontWeight: '600' }}>Hora:</span></td><td style={{ padding: '3px 0', borderBottom: '1px solid #f1f5f9', textAlign: 'right' }}><strong style={{ color: '#0f172a' }}>{compileTemplate('{{venta.hora}}', form, totals)}</strong></td></tr>
              <tr><td style={{ padding: '3px 0', borderBottom: '1px solid #f1f5f9' }}><span style={{ color: '#64748b', fontWeight: '600' }}>Efecto:</span></td><td style={{ padding: '3px 0', borderBottom: '1px solid #f1f5f9', textAlign: 'right' }}><strong style={{ color: '#0f172a' }}>{compileTemplate('{{venta.tipoComprobante}}', form, totals)}</strong></td></tr>
              <tr><td style={{ padding: '3px 0' }}><span style={{ color: '#64748b', fontWeight: '600' }}>Lugar Exp:</span></td><td style={{ padding: '3px 0', textAlign: 'right' }}><strong style={{ color: '#0f172a' }}>{compileTemplate('{{venta.lugarExpedicion}}', form, totals)}</strong></td></tr>
            </tbody>
          </table>
        </div>
      );

    case 'cliente_info':
      return (
        <div style={{ 
          ...containerStyle, 
          border: '1.2px solid #e2e8f0', 
          borderRadius: 8, 
          padding: '12px 16px', 
          fontSize: block?.fontSize ? `${block.fontSize}px` : '7.5px',
          color: '#334155',
          background: '#ffffff',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          lineHeight: 1.4
        }}>
          <p style={{ 
            fontWeight: '800', 
            margin: '0 0 10px 0', 
            fontSize: block?.fontSize ? block.fontSize + 1.5 : 10, 
            color: '#1e3a8a', 
            textTransform: 'uppercase', 
            letterSpacing: '0.5px',
            borderBottom: '1.5px solid #e2e8f0',
            paddingBottom: '4px'
          }}>Datos del Cliente</p>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '10px 24px' }}>
            <div>
              <span style={{ color: '#64748b', fontWeight: '600', display: 'block', marginBottom: '2px', textTransform: 'uppercase', fontSize: '6.5px', letterSpacing: '0.2px' }}>Cliente / Razón Social</span>
              <strong style={{ color: '#0f172a', fontSize: '8.5px', fontWeight: '800' }}>{compileTemplate('{{cliente.nombre}}', form, totals)}</strong>
            </div>
            <div>
              <span style={{ color: '#64748b', fontWeight: '600', display: 'block', marginBottom: '2px', textTransform: 'uppercase', fontSize: '6.5px', letterSpacing: '0.2px' }}>Código de Cliente</span>
              <strong style={{ color: '#0f172a', fontSize: '8.5px', fontWeight: '800' }}>{compileTemplate('{{cliente.codigo}}', form, totals)}</strong>
            </div>
            
            <div style={{ gridColumn: 'span 2', borderTop: '1px solid #f1f5f9', paddingTop: '6px' }}>
              <span style={{ color: '#64748b', fontWeight: '600', display: 'block', marginBottom: '2px', textTransform: 'uppercase', fontSize: '6.5px', letterSpacing: '0.2px' }}>Domicilio Comercial</span>
              <strong style={{ color: '#334155', fontWeight: '700' }}>{compileTemplate('{{cliente.direccion}}', form, totals)}</strong>
            </div>

            <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '6px' }}>
              <span style={{ color: '#64748b', fontWeight: '600', display: 'block', marginBottom: '2px', textTransform: 'uppercase', fontSize: '6.5px', letterSpacing: '0.2px' }}>RFC del Receptor</span>
              <strong style={{ color: '#0f172a', fontWeight: '800' }}>{compileTemplate('{{cliente.rfc}}', form, totals)}</strong>
            </div>
            <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '6px' }}>
              <span style={{ color: '#64748b', fontWeight: '600', display: 'block', marginBottom: '2px', textTransform: 'uppercase', fontSize: '6.5px', letterSpacing: '0.2px' }}>Teléfono de Contacto</span>
              <strong style={{ color: '#0f172a', fontWeight: '800' }}>{compileTemplate('{{cliente.telefono}}', form, totals)}</strong>
            </div>

            <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '6px' }}>
              <span style={{ color: '#64748b', fontWeight: '600', display: 'block', marginBottom: '2px', textTransform: 'uppercase', fontSize: '6.5px', letterSpacing: '0.2px' }}>Método de Pago</span>
              <strong style={{ color: '#334155', fontWeight: '700' }}>{compileTemplate('{{venta.metodoPago}}', form, totals)}</strong>
            </div>
            <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '6px' }}>
              <span style={{ color: '#64748b', fontWeight: '600', display: 'block', marginBottom: '2px', textTransform: 'uppercase', fontSize: '6.5px', letterSpacing: '0.2px' }}>Forma de Pago</span>
              <strong style={{ color: '#334155', fontWeight: '700' }}>{compileTemplate('{{venta.formaPago}}', form, totals)}</strong>
            </div>

            <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '6px' }}>
              <span style={{ color: '#64748b', fontWeight: '600', display: 'block', marginBottom: '2px', textTransform: 'uppercase', fontSize: '6.5px', letterSpacing: '0.2px' }}>Moneda de Transacción</span>
              <strong style={{ color: '#334155', fontWeight: '700' }}>{compileTemplate('{{venta.moneda}}', form, totals)}</strong>
            </div>
            <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '6px' }}>
              <span style={{ color: '#64748b', fontWeight: '600', display: 'block', marginBottom: '2px', textTransform: 'uppercase', fontSize: '6.5px', letterSpacing: '0.2px' }}>Uso de CFDI Autorizado</span>
              <strong style={{ color: '#334155', fontWeight: '700' }}>{compileTemplate('{{cliente.usoCFDI}}', form, totals)}</strong>
            </div>
          </div>
        </div>
      );

    case 'conceptos_table':
      const conceptos = form?.conceptos || [];
      return (
        <div style={{ ...containerStyle, padding: 0, border: '1.2px solid #e2e8f0', borderRadius: 8, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', fontSize: block?.fontSize ? `${block.fontSize}px` : '7.5px', color: '#334155' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1.2px solid #e2e8f0' }}>
                {[
                  { h: 'CANT.', w: '8%' },
                  { h: 'UNIDAD', w: '12%' },
                  { h: 'CLAVE SAT', w: '14%' },
                  { h: 'DESCRIPCIÓN DEL CONCEPTO', w: '40%' },
                  { h: 'PRECIO UNIT.', w: '10%' },
                  { h: 'DESC.', w: '6%' },
                  { h: 'TOTAL', w: '10%' }
                ].map((col, idx) => (
                  <th key={idx} style={{ 
                    width: col.w, 
                    padding: '10px 8px', 
                    textAlign: idx === 3 ? 'left' : 'center', 
                    fontWeight: '800', 
                    color: '#475569',
                    textTransform: 'uppercase',
                    letterSpacing: '0.4px'
                  }}>{col.h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {conceptos.map((c: any) => {
                const { total } = calcConcepto(c);
                return (
                  <tr key={c.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '8px 8px', textAlign: 'center', fontWeight: '700', color: '#0f172a' }}>{c.cantidad}</td>
                    <td style={{ padding: '8px 8px', textAlign: 'center', color: '#475569', fontWeight: '600' }}>{c.unidadSat}</td>
                    <td style={{ padding: '8px 8px', textAlign: 'center', color: '#64748b', fontSize: '7px', fontFamily: 'monospace', fontWeight: '600' }}>{c.claveSat}</td>
                    <td style={{ padding: '8px 8px', textAlign: 'left', fontWeight: '700', color: '#0f172a' }}>
                      {c.concepto}
                    </td>
                    <td style={{ padding: '8px 8px', textAlign: 'right', fontWeight: '600', color: '#334155' }}>${fmt(parseFloat(c.valorUnitario))}</td>
                    <td style={{ padding: '8px 8px', textAlign: 'center', color: '#dc2626', fontWeight: '800' }}>{c.descuento ? `${c.descuento}%` : '0%'}</td>
                    <td style={{ padding: '8px 8px', textAlign: 'right', fontWeight: '800', color: '#0f172a' }}>${fmt(total)}</td>
                  </tr>
                );
              })}
              {conceptos.length < 4 && Array.from({ length: 4 - conceptos.length }).map((_, i) => (
                <tr key={`empty_${i}`} style={{ height: '28px', borderBottom: i === 3 - conceptos.length ? 'none' : '1px solid #f1f5f9' }}>
                  {Array.from({ length: 7 }).map((__, j) => (
                    <td key={j} style={{ padding: '8px' }}>&nbsp;</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );

    case 'totales_box':
      return (
        <div style={{ ...containerStyle, display: 'flex', flexDirection: 'row', padding: 0, border: 'none', borderRadius: 0, gap: '24px', fontSize: block?.fontSize ? `${block.fontSize}px` : '7.5px', color: '#334155' }}>
          {/* Lado izquierdo */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px', justifyContent: 'space-between' }}>
            <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: 8, border: '1.2px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.01)' }}>
              <span style={{ fontSize: '6.5px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '4px', letterSpacing: '0.3px' }}>Importe con Letra</span>
              <p style={{ margin: 0, fontWeight: '800', color: '#0f172a', textTransform: 'uppercase', lineHeight: 1.35 }}>
                {compileTemplate('{{venta.letras}}', form, totals)}
              </p>
            </div>
            
            <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
              {/* QR Code Placeholder Box */}
              <div style={{ 
                width: 68, 
                height: 68, 
                border: '1.2px solid #e2e8f0', 
                borderRadius: 8, 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                background: '#ffffff', 
                padding: '4px', 
                flexShrink: 0,
                boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
              }}>
                <div style={{ width: '100%', height: '100%', background: 'repeating-conic-gradient(#64748b 0% 25%, #ffffff 0% 50%) 0 0 / 6px 6px', borderRadius: 4 }} />
              </div>
              
              <div style={{ flex: 1, fontSize: '7.5px', color: '#475569', lineHeight: 1.4 }}>
                <p style={{ margin: '0 0 3px 0' }}><span style={{ fontWeight: '700', color: '#64748b' }}>Relación:</span> <strong style={{ color: '#0f172a' }}>{compileTemplate('{{venta.tipoRelacion}}', form, totals)}</strong></p>
                <p style={{ margin: 0 }}><span style={{ fontWeight: '700', color: '#64748b' }}>CFDI Relacionado:</span> <strong style={{ color: '#0f172a' }}>{compileTemplate('{{venta.cfdiRelacionado}}', form, totals)}</strong></p>
              </div>
            </div>
          </div>
          
          {/* Lado derecho: Totales Table */}
          <div style={{ 
            width: 210, 
            flexShrink: 0, 
            background: '#f8fafc', 
            padding: '12px 16px', 
            borderRadius: 8, 
            border: '1.2px solid #e2e8f0', 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '8px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '5px' }}>
              <span style={{ color: '#64748b', fontWeight: '600' }}>Subtotal:</span>
              <strong style={{ color: '#0f172a', fontWeight: '700' }}>${fmt(totals?.totalSubtotal || 0)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '5px' }}>
              <span style={{ color: '#64748b', fontWeight: '600' }}>Descuento:</span>
              <strong style={{ color: '#dc2626', fontWeight: '700' }}>${fmt(totals?.totalDesc || 0)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '5px' }}>
              <span style={{ color: '#64748b', fontWeight: '600' }}>IVA (16%):</span>
              <strong style={{ color: '#0f172a', fontWeight: '700' }}>${fmt(totals?.totalImpuestos || 0)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '3px' }}>
              <span style={{ color: '#1e3a8a', fontWeight: '800', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Total Facturado:</span>
              <strong style={{ color: '#1e3a8a', fontSize: '10px', fontWeight: '800' }}>${fmt(totals?.totalFinal || 0)}</strong>
            </div>
          </div>
        </div>
      );

    case 'fiscal_info':
      return (
        <div style={{ 
          ...containerStyle, 
          border: 'none', 
          borderRadius: 0, 
          padding: 0, 
          fontSize: block?.fontSize ? `${block.fontSize}px` : '7.5px', 
          color: '#64748b',
          textAlign: 'center'
        }}>
          <div style={{ borderTop: '1.2px solid #e2e8f0', paddingTop: '10px', marginTop: '6px' }}>
            <p style={{ margin: '0 0 3px 0', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
              Este documento es una representación impresa y editable de comprobante administrativo.
            </p>
            <p style={{ margin: 0, fontSize: '6.5px', color: '#94a3b8', fontWeight: '500' }}>
              Distribuidora M-H ERP &copy; {new Date().getFullYear()} — Todos los derechos reservados.
            </p>
          </div>
        </div>
      );

    case 'sellos_box':
      return (
        <div style={{ ...containerStyle, border: 'none', borderRadius: 0, padding: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-around', gap: '40px', marginTop: '12px' }}>
            <div style={{ flex: 1, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ width: '100%', maxWidth: '180px', borderBottom: '1.2px solid #94a3b8', height: '40px', marginBottom: '6px' }} />
              <span style={{ fontSize: '7.5px', fontWeight: '800', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Firma de Autorización</span>
            </div>
            <div style={{ flex: 1, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ width: '100%', maxWidth: '180px', borderBottom: '1.2px solid #94a3b8', height: '40px', marginBottom: '6px' }} />
              <span style={{ fontSize: '7.5px', fontWeight: '800', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Firma de Conformidad del Cliente</span>
            </div>
          </div>
        </div>
      );

    case 'pagare_box':
      return (
        <div style={{ 
          ...containerStyle, 
          border: '1.2px solid #e2e8f0', 
          borderRadius: 8, 
          padding: '10px 14px', 
          fontSize: block?.fontSize ? `${block.fontSize}px` : '7px', 
          color: '#475569',
          background: '#ffffff',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
        }}>
          <p style={{ textAlign: 'center', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.8px', margin: '0 0 8px 0', fontSize: block?.fontSize ? block.fontSize + 1 : '8px', color: '#1e3a8a' }}>PAGARÉ COMERCIAL</p>
          <p style={{ textAlign: 'justify', margin: '0 0 10px 0', lineHeight: 1.5, textJustify: 'inter-word' }}>
            DEBO(EMOS) Y PAGARE(MOS) INCONDICIONALMENTE Y SIN PRETEXTO POR ESTE PAGARE A LA ORDEN DE <strong>VIANEY OMARA MIRANDA CASTRO</strong> LA CANTIDAD DE{' '}
            <span style={{ textTransform: 'uppercase', fontWeight: '800', color: '#0f172a' }}>{compileTemplate('{{venta.letras}}', form, totals)}</span>{' '}
            (<strong style={{ color: '#0f172a' }}>{compileTemplate('{{venta.moneda}}', form, totals)} ${fmt(totals?.totalFinal || 0)}</strong>) EN LA CIUDAD DE PUERTO PEÑASCO, SONORA, EL DIA DE SU VENCIMIENTO. PAGAREMOS ADEMAS INTERESES MORATORIOS HASTA SU LIQUIDACION TOTAL A RAZON DEL 3% MENSUAL.
          </p>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', paddingTop: '6px', borderTop: '1.2px dashed #e2e8f0' }}>
            <span style={{ fontSize: '7px', fontWeight: '600' }}><span style={{ color: '#94a3b8' }}>Fecha de Emisión:</span> <strong style={{ color: '#475569' }}>{compileTemplate('{{venta.fecha}}', form, totals)}</strong></span>
            <div style={{ textAlign: 'right', display: 'flex', gap: '10px', alignItems: 'center' }}>
              <span style={{ fontSize: '7px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Acepto de Conformidad:</span>
              <div style={{ borderBottom: '1.2px solid #94a3b8', width: '120px', height: '16px' }} />
            </div>
          </div>
        </div>
      );

    case 'custom_text':
      return (
        <div style={containerStyle}>
          <div style={{ whiteSpace: 'pre-wrap', width: '100%' }}>
            {compileTemplate(block?.content || 'Texto Personalizado. Haz doble clic para editar.', form, totals)}
          </div>
        </div>
      );

    case 'custom_image':
      return (
        <div style={{ ...containerStyle, alignItems: 'center', justifyContent: 'center', padding: 0 }}>
          {block?.src ? (
            <img src={block.src} alt="Custom Block" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
          ) : (
            <div style={{ width: '100%', height: '100%', border: '1px dashed #cbd5e1', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: '8px' }}>
              Sin imagen (Ingresa URL)
            </div>
          )}
        </div>
      );

    case 'custom_qr':
      return (
        <div style={{ ...containerStyle, alignItems: 'center', justifyContent: 'center', padding: '4px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', background: '#fff', border: '1px solid #cbd5e1', borderRadius: 4 }}>
            {/* Generador QR Simple simulado con grilla compacta */}
            <div style={{ width: 44, height: 44, display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gridTemplateRows: 'repeat(5, 1fr)', gap: '1.5px', padding: '3px', background: '#fff' }}>
              {[
                1,1,1,1,1,
                1,0,0,0,1,
                1,0,1,0,1,
                1,0,0,0,1,
                1,1,1,1,1
              ].map((val, idx) => (
                <div key={idx} style={{ background: val ? '#000' : '#fff' }} />
              ))}
            </div>
            <span style={{ fontSize: '5.5px', color: '#64748b', marginTop: '2px', wordBreak: 'break-all', textAlign: 'center', display: 'block', width: '100%', padding: '0 2px' }}>
              {compileTemplate(block?.qrValue || '{{venta.total}}', form, totals)}
            </span>
          </div>
        </div>
      );

    case 'custom_barcode':
      return (
        <div style={{ ...containerStyle, alignItems: 'center', justifyContent: 'center', padding: '4px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', height: '100%', background: '#fff', border: '1px solid #f1f5f9', borderRadius: 4, padding: '3px' }}>
            <div style={{ flex: 1, width: '100%', display: 'flex', gap: '1px', alignItems: 'stretch' }}>
              {[3, 1, 2, 4, 1, 3, 2, 1, 4, 2, 3, 1, 2, 1, 3, 4, 2, 1, 3].map((w, idx) => (
                <div key={idx} style={{ flex: w, background: idx % 2 === 0 ? '#000' : 'transparent' }} />
              ))}
            </div>
            <span style={{ fontSize: '6px', color: '#334155', fontFamily: 'monospace', marginTop: '2px' }}>
              {compileTemplate(block?.barcodeValue || '{{cliente.codigo}}', form, totals)}
            </span>
          </div>
        </div>
      );

    case 'custom_line':
      return (
        <div style={{ ...containerStyle, justifyContent: 'center', padding: 0 }}>
          <div style={{ width: '100%', borderTop: `${block?.borderWidth || 2}px ${block?.fontWeight === 'bold' ? 'dashed' : 'solid'} ${block?.borderColor || '#334155'}` }} />
        </div>
      );

    default:
      return <div style={containerStyle}>Bloque no Soportado: {type}</div>;
  }
}
