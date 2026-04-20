import React from 'react';
import { BlockType } from '../../../types/invoice-builder';
import { ChefHat } from 'lucide-react';

const fmt = (n: number) => n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
function toLetras(num: number): string { if (num === 0) return 'CERO PESOS 00/100 M.N.'; const entero = Math.floor(num); const dec = Math.round((num - entero) * 100); return `${entero.toLocaleString()} PESOS ${dec.toString().padStart(2, '0')}/100 M.N.`; }
function SelloBox({ title, value }: { title: string; value: string }) { return (<div style={{ border: '1px solid #000', marginBottom: 4 }}><p style={{ background: '#d8d8d8', padding: '1px 6px', fontSize: 7, marginBottom: 0 }}>{title}</p><p style={{ padding: '2px 6px', fontSize: 6, wordBreak: 'break-all', fontFamily: 'monospace', lineHeight: 1.3 }}>{value}</p></div>); }

interface RendererProps {
  type: BlockType;
  form: any;
  calcConcepto: (c: any) => any;
  totals: { totalSubtotal: number; totalDesc: number; totalImpuestos: number; totalFinal: number };
}

const FAKE_UUID = 'A1B2C3D4-E5F6-7890-ABCD-EF1234567890';
const FAKE_SELLO_CFDI = 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA2k9z7TbVe8X1JM5BzV1pKaAAAAAAAAAAAAAAAAAA==';
const FAKE_SELLO_SAT = 'GxR+PoIrGoTOYeVHvXzqBcN7Lw1fDpMjTGYkRsE0AaaZz9BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB==';
const FAKE_CERT_EMISOR = '30001000000500003416';
const FAKE_CERT_SAT = '20001000000300022323';
const FAKE_CADENA = '||4.0|MH|01|2026-03-21T10:00:00|01|00001000000500003416|1000.00|MXN|1160.00|I|PPD|83556|MICV9209288D2|VIANEY OMARA MIRANDA CASTRO|612|XAXX010101000|PÚBLICO EN GENERAL|83556|616|S01|...||';

export default function InvoiceBlockRenderer({ type, form, calcConcepto, totals }: RendererProps) {
  switch (type) {
    case 'emisor_info':
      return (
        <div style={{ display: 'flex', width: '100%', height: '100%', paddingTop: 4 }}>
          <div style={{ width: 120, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', paddingTop: 10 }}>
            <ChefHat size={60} strokeWidth={1} color="#0052cc" />
          </div>
          <div style={{ flex: 1, textAlign: 'center', paddingRight: 6 }}>
            <p style={{ fontWeight: 'bold', fontSize: 11, textTransform: 'uppercase', marginBottom: 2 }}>VIANEY OMARA MIRANDA CASTRO</p>
            <p style={{ marginBottom: 1, fontSize: 8 }}>MICV9209288D2</p>
            <p style={{ marginBottom: 1, fontSize: 8 }}>612 — Personas Físicas con Actividades Empresariales y Profesionales</p>
            <p style={{ marginBottom: 1, fontSize: 8 }}>Blvd. Samuel Ocaña entre Puerto de Ensenada y Vicente Suarez 400/2 Col Lopez Portillo CP. 83556</p>
            <p style={{ marginBottom: 1, fontSize: 8 }}>Puerto Peñasco, Sonora, Mexico</p>
            <p style={{ fontSize: 8 }}>Tel: 638 102 1180</p>
            <div style={{ border: '1px solid #ccc', margin: '8px auto', padding: 4, width: '90%', color: '#666', fontSize: 6, textAlign: 'left' }}>
                Image: No se puede encontrar una parte de la ruta de acceso 'E:\Compac\Empresas\Reportes\Formatos Digitales\REPTES_Cliente\imagenes_DSCFacturaFinal\BANNER1.png'.
            </div>
          </div>
        </div>
      );

    case 'cfdi_box':
      return (
        <div style={{ width: '100%', height: '100%', fontSize: 7, textAlign: 'right', paddingRight: 8, paddingTop: 14 }}>
            <div style={{ marginBottom: 2 }}>Serie: {form.serie || 'MH'}</div>
            <div style={{ marginBottom: 2 }}>Folio: {form.folio || '—'}</div>
            <div style={{ marginBottom: 2 }}>Fecha: {form.fecha}</div>
            <div style={{ marginBottom: 2 }}>Hora: {form.hora}</div>
            <div style={{ marginBottom: 2, display: 'flex', justifyContent: 'flex-end', alignItems: 'flex-start' }}>
                <span style={{ width: 60, textAlign: 'right', lineHeight: 1.1 }}>Tipo de<br/>comprobante:</span>
                <span style={{ marginLeft: 4 }}>{form.tipoComprobante || 'I'}</span>
            </div>
            <div style={{ marginBottom: 2, display: 'flex', justifyContent: 'flex-end', alignItems: 'flex-start' }}>
                <span style={{ width: 60, textAlign: 'right', lineHeight: 1.1 }}>Lugar de<br/>expedicion CP:</span>
                <span style={{ marginLeft: 4 }}>{form.lugarExpedicion || '83556'}</span>
            </div>
            <div style={{ marginBottom: 2 }}>Versión del comprobante: 4.0</div>
        </div>
      );

    case 'cliente_info':
      return (
        <div style={{ border: '1px solid #000', padding: '4px 6px', height: '100%' }}>
            <p style={{ fontSize: 7.5, marginBottom: 4 }}>Datos del cliente:</p>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}><span>Codigo Cliente: {form.codigoCliente || '01023'}</span><span>Agente: {form.agente || '1'}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}><span>Cliente: {form.nombre || 'Público en General'}</span><span>Uso CFDI: {form.usoCFDI || 'S01'}</span></div>
            <div style={{ marginBottom: 2 }}>RFC: {form.rfc || 'XAXX010101000'}</div>
            <div style={{ marginBottom: 4 }}>Domicilio: {form.domicilio || 'AVE. PUERTO DE ENSENADA S/N LOPEZ PORTILLO  C.P. 83556 PTO. PEÑASCO, SONORA, MEXICO'}</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}><span>Método de pago: {form.metodoPago || 'PPD'}</span><span>Forma de pago: {form.formaPago || '99'}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Moneda: {form.moneda || 'MXN'}</span><span>Observaciones: {form.observaciones || ''}</span></div>
        </div>
      );

    case 'conceptos_table':
      return (
        <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000', fontSize: 7, margin: 0 }}>
            <thead><tr style={{ background: '#eaeaea' }}>
                {[{ h: 'CANT', w: 30 }, { h: 'UNIDAD\nSAT', w: 38 }, { h: 'CLAVE\nSAT', w: 38 }, { h: 'CONCEPTO', w: undefined }, { h: 'V.U.', w: 45 }, { h: 'DESC', w: 35 }, { h: 'SUBTOTAL', w: 55 }, { h: 'PORC.\nIMP', w: 35 }, { h: 'IMPUESTOS', w: 60 }, { h: 'TOTAL', w: 55 }].map(({ h, w }) => (
                    <th key={h} style={{ border: '1px solid #000', padding: '2px 2px', textAlign: 'center', whiteSpace: 'pre-line', width: w }}>{h}</th>
                ))}
            </tr></thead>
            <tbody>
                {form.conceptos.map((c: any) => { const { subtotal, impuestos, total } = calcConcepto(c); return (
                    <tr key={c.id}>
                        <td style={{ border: '1px solid #000', padding: '2px 2px', textAlign: 'center' }}>{c.cantidad || '—'}</td>
                        <td style={{ border: '1px solid #000', padding: '2px 2px', textAlign: 'center' }}>{c.unidadSat || '—'}</td>
                        <td style={{ border: '1px solid #000', padding: '2px 2px', textAlign: 'center' }}>{c.claveSat || '—'}</td>
                        <td style={{ border: '1px solid #000', padding: '2px 3px' }}>{c.concepto || '—'}</td>
                        <td style={{ border: '1px solid #000', padding: '2px 2px', textAlign: 'right' }}>{c.valorUnitario ? `$${fmt(parseFloat(c.valorUnitario))}` : '—'}</td>
                        <td style={{ border: '1px solid #000', padding: '2px 2px', textAlign: 'center' }}>{c.descuento ? `${c.descuento}%` : '0%'}</td>
                        <td style={{ border: '1px solid #000', padding: '2px 2px', textAlign: 'right' }}>${fmt(subtotal)}</td>
                        <td style={{ border: '1px solid #000', padding: '2px 2px', textAlign: 'center' }}>{c.porcImpuesto}%</td>
                        <td style={{ border: '1px solid #000', padding: '2px 2px', textAlign: 'left', fontSize: 6.5 }}>IVA: {fmt(impuestos)}</td>
                        <td style={{ border: '1px solid #000', padding: '2px 2px', textAlign: 'right' }}>${fmt(total)}</td>
                    </tr>
                ); })}
                {form.conceptos.length < 3 && Array.from({ length: 3 - form.conceptos.length }).map((_, i) => (
                    <tr key={`emp${i}`} style={{ height: 16 }}>{Array.from({ length: 10 }).map((__, j) => (<td key={j} style={{ border: '1px solid #000', padding: '2px 2px' }}>&nbsp;</td>))}</tr>
                ))}
            </tbody>
        </table>
      );

    case 'totales_box':
      return (
        <div style={{ display: 'flex', height: '100%', fontSize: 7.5, paddingTop: 6 }}>
            <div style={{ flex: 1, paddingRight: 10 }}>
                <p style={{ marginBottom: 6 }}>IMPORTE CON LETRA: <span style={{ textTransform: 'uppercase' }}>{toLetras(totals.totalFinal)}</span></p>
                <div style={{ marginTop: 8 }}>
                    <p style={{ marginBottom: 4 }}>TIPO DE RELACION: {form.tipoRelacion || '—'}</p>
                    <p style={{ marginBottom: 4, wordBreak: 'break-all' }}>CFDI RELACIONADO: {form.cfdiRelacionado || '—'}</p>
                </div>
                <div style={{ marginTop: 8 }}>
                    <p style={{ marginBottom: 2 }}>Database Image:</p>
                    <div style={{ width: 78, height: 78, border: '2px solid #000', background: 'repeating-conic-gradient(#444 0% 25%, #fff 0% 50%) 0 0 / 6px 6px', position: 'relative', overflow: 'hidden' }}>
                        <div style={{ position: 'absolute', inset: '20%', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={{ width: 16, height: 16, background: '#000' }} /></div>
                    </div>
                </div>
            </div>
            <div style={{ width: 180 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 7.5 }}><tbody>
                    <tr><td style={{ padding: '2px 8px', textAlign: 'right' }}>Subtotal:</td><td style={{ padding: '2px 8px', textAlign: 'right' }}>${fmt(totals.totalSubtotal)}</td></tr>
                    <tr><td style={{ padding: '2px 8px', textAlign: 'right' }}>IEPS:</td><td style={{ padding: '2px 8px', textAlign: 'right' }}>$0.00</td></tr>
                    <tr><td style={{ padding: '2px 8px', textAlign: 'right' }}>Descuento:</td><td style={{ padding: '2px 8px', textAlign: 'right' }}>${fmt(totals.totalDesc)}</td></tr>
                    <tr><td style={{ padding: '2px 8px', textAlign: 'right' }}>IVA:</td><td style={{ padding: '2px 8px', textAlign: 'right' }}>${fmt(totals.totalImpuestos)}</td></tr>
                    <tr><td style={{ padding: '2px 8px', textAlign: 'right' }}>Total:</td><td style={{ padding: '2px 8px', textAlign: 'right' }}>${fmt(totals.totalFinal)}</td></tr>
                </tbody></table>
            </div>
        </div>
      );

    case 'fiscal_info':
      return (
        <div style={{ width: '100%', height: '100%', padding: '0 8px', fontSize: 7 }}>
            <p style={{ textAlign: 'center', fontWeight: 'bold', fontSize: 8, marginBottom: 5 }}>Este documento es una representación impresa de un CFDI</p>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}><tbody>
                <tr><td style={{ border: '1px solid #000', padding: '2px 8px', width: '40%' }}>Serie del Certificado del emisor: {FAKE_CERT_EMISOR}</td></tr>
                <tr><td style={{ border: '1px solid #000', borderTop: 'none', padding: '2px 8px' }}>Folio Fiscal: {FAKE_UUID}</td></tr>
                <tr><td style={{ border: '1px solid #000', borderTop: 'none', padding: '2px 8px' }}>No. de serie del Certificado del SAT: {FAKE_CERT_SAT}</td></tr>
                <tr><td style={{ border: '1px solid #000', borderTop: 'none', padding: '2px 8px' }}>Fecha y hora de certificación: {form.fecha}T{form.hora}:05</td></tr>
            </tbody></table>
            <p style={{ textAlign: 'right', fontSize: 6.5, marginTop: 3 }}>*Efectos fiscales al pago</p>
        </div>
      );

    case 'sellos_box':
      return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <SelloBox title="Sello digital del CFDI" value={FAKE_SELLO_CFDI + FAKE_SELLO_CFDI} />
            <SelloBox title="Sello del SAT" value={FAKE_SELLO_SAT + FAKE_SELLO_SAT} />
            <SelloBox title="Cadena original del complemento de la certificación digital del SAT" value={FAKE_CADENA + FAKE_CADENA + FAKE_CADENA} />
        </div>
      );

    case 'pagare_box':
      return (
        <div style={{ border: '1px solid #000', padding: '4px 6px', height: '100%' }}>
            <p style={{ textAlign: 'center', fontWeight: 'bold', textTransform: 'uppercase', textDecoration: 'underline', marginBottom: 3, fontSize: 7.5 }}>PAGARÉ</p>
            <p style={{ fontSize: 7, textAlign: 'justify', marginBottom: 6 }}>
                DEBO (EMOS) Y PAGARE (MOS) INCONDICIONALMENTE Y SIN PROTESTO POR ESTE PAGARÉ A LA ORDEN DE VIANEY OMARA MIRANDA CASTRO LA CANTIDAD DE {toLetras(totals.totalFinal)} ({form.moneda} ${fmt(totals.totalFinal)}) EN LA CIUDAD DE __ EL DÍA DE SU VENCIMIENTO, PAGAREMOS ADEMÁS INTERESES MORATORIOS HASTA SU LIQUIDACIÓN TOTAL A RAZÓN DEL 3% MENSUAL SIN QUE ESTO SE CONSIDERE EL PLAZO FIJADO PARA EL CUMPLIMIENTO DE ESTA OBLIGACIÓN.
            </p>
            <p style={{ fontSize: 7.5 }}>ACEPTO Y PAGARÉ: _____________________</p>
        </div>
      );

    default:
      return <div>Bloque no Soportado</div>;
  }
}

