import React from 'react';
import { BlockType } from '../../../types/invoice-builder';

// Reusa algunas funciones auxiliares de AddInvoice si están en este archivo (o las podemos pasar por props).
const fmt = (n: number) => n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
function toLetras(num: number): string { if (num === 0) return 'CERO PESOS 00/100 M.N.'; const entero = Math.floor(num); const dec = Math.round((num - entero) * 100); return `${entero.toLocaleString()} PESOS ${dec.toString().padStart(2, '0')}/100 M.N.`; }
function HdrRow({ label, value }: { label: string; value: string }) { return (<tr><td style={{ padding: '1px 4px', fontWeight: 'bold', whiteSpace: 'nowrap' }}>{label}</td><td style={{ padding: '1px 4px' }}>{value}</td></tr>); }
function FiscalRow({ label, value }: { label: string; value: string }) { return (<p style={{ marginBottom: 2, fontSize: 7 }}><b>{label}</b> {value}</p>); }
function SelloBox({ title, value }: { title: string; value: string }) { return (<div style={{ border: '1px solid #000', borderTop: 'none' }}><p style={{ background: '#d8d8d8', padding: '1px 6px', fontWeight: 'bold', fontSize: 7, marginBottom: 0 }}>{title}</p><p style={{ padding: '2px 6px', fontSize: 6, wordBreak: 'break-all', fontFamily: 'monospace', lineHeight: 1.3 }}>{value}</p></div>); }

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
const FAKE_CADENA = '||4.0|A|1|2026-03-21|Puerto Peñasco|I|PPD|99|MXN|XAXX010101000|S01|...MICO1234567890||';

export default function InvoiceBlockRenderer({ type, form, calcConcepto, totals }: RendererProps) {
  switch (type) {
    case 'emisor_info':
      return (
        <div style={{ display: 'flex', width: '100%', height: '100%' }}>
          <div style={{ width: 82, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dashed #bbb', marginRight: 6, background: '#f5f5f5' }}>
            <span style={{ color: '#aaa', fontSize: 7, textAlign: 'center', padding: 4 }}>LOGO<br />EMPRESA</span>
          </div>
          <div style={{ flex: 1, textAlign: 'center', paddingRight: 6, paddingBottom: 4 }}>
            <p style={{ fontWeight: 'bold', fontSize: 10.5, textTransform: 'uppercase', marginBottom: 1 }}>VIANEY OMARA MIRANDA CASTRO</p>
            <p style={{ marginBottom: 1 }}>MICV9209288D2</p>
            <p style={{ marginBottom: 1 }}>612 — Personas Físicas con Actividades Empresariales y Profesionales</p>
            <p style={{ marginBottom: 1 }}>Blvd. Samuel Ocaña entre Puerto de Ensenada y Vicente Suarez 400/2 Col Lopez Portillo CP. 83556</p>
            <p style={{ marginBottom: 1 }}>Puerto Peñasco, Sonora, Mexico</p>
            <p>Tel: 638 102 1180</p>
          </div>
        </div>
      );

    case 'cfdi_box':
      return (
        <div style={{ width: '100%', height: '100%', border: '1px solid #000' }}>
            <p style={{ textAlign: 'center', fontWeight: 'bold', fontSize: 9, borderBottom: '1px solid #000', padding: '2px 0', margin: 0 }}>Factura</p>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 7 }}><tbody>
                <HdrRow label="Serie:" value={form.serie || 'MH'} /><HdrRow label="Folio:" value={form.folio || '—'} /><HdrRow label="Fecha:" value={form.fecha} /><HdrRow label="Hora:" value={form.hora} /><HdrRow label="Tipo de comprobante:" value={`${form.tipoComprobante} — Ingreso`} /><HdrRow label="Lugar de expedición CP:" value={form.lugarExpedicion || '83556'} /><HdrRow label="Versión del comprobante:" value="4.0" />
            </tbody></table>
        </div>
      );

    case 'cliente_info':
      return (
        <div style={{ border: '1px solid #000', padding: '4px 6px', height: '100%' }}>
            <p style={{ fontWeight: 'bold', fontSize: 7.5, marginBottom: 2 }}>Datos del cliente:</p>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 1 }}><span><b>Codigo Cliente:</b> {form.codigoCliente || '01023'}</span><span><b>Agente:</b> {form.agente || '1'}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 1 }}><span><b>Cliente:</b> {form.nombre || 'Público en General'}</span><span><b>Uso CFDI:</b> {form.usoCFDI || 'S01'} Sin efectos fiscales</span></div>
            <div style={{ marginBottom: 1 }}><b>RFC:</b> {form.rfc || 'XAXX010101000'}</div>
            <div style={{ marginBottom: 3 }}><b>Domicilio:</b> {form.domicilio || 'AVE. PUERTO DE ENSENADA S/N LOPEZ PORTILLO  C.P. 83556 PTO. PEÑASCO, SONORA, MEXICO'}</div>
            <div style={{ display: 'flex', gap: 24, marginBottom: 1 }}><span><b>Método de pago:</b> {form.metodoPago || 'PPD'} — Pago en parcialidades o diferido</span><span><b>Forma de pago:</b> {form.formaPago || '99'} — Por definir</span></div>
            <div style={{ display: 'flex', gap: 24 }}><span><b>Moneda:</b> {form.moneda || 'MXN'} — Peso Mexicano</span><span><b>Observaciones:</b> {form.observaciones || ''}</span></div>
        </div>
      );

    case 'conceptos_table':
      return (
        <table style={{ width: '100%', height: '100%', borderCollapse: 'collapse', border: '1px solid #000', fontSize: 7, margin: 0 }}>
            <thead><tr style={{ background: '#d8d8d8' }}>
                {[{ h: 'CANT', w: 28 }, { h: 'UNIDAD\nSAT', w: 38 }, { h: 'CLAVE\nSAT', w: 38 }, { h: 'CONCEPTO', w: undefined }, { h: 'V.U.', w: 42 }, { h: 'DESC', w: 26 }, { h: 'SUBTOTAL', w: 48 }, { h: 'PORC\nIMP', w: 28 }, { h: 'IMPUESTOS', w: 60 }, { h: 'TOTAL', w: 50 }].map(({ h, w }) => (
                    <th key={h} style={{ border: '1px solid #000', padding: '2px 2px', textAlign: 'center', whiteSpace: 'pre-line', fontWeight: 'bold', width: w }}>{h}</th>
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
                        <td style={{ border: '1px solid #000', padding: '2px 2px', textAlign: 'left', fontSize: 6.5 }}>IVA — Importe: {fmt(impuestos)}</td>
                        <td style={{ border: '1px solid #000', padding: '2px 2px', textAlign: 'right', fontWeight: 'bold' }}>${fmt(total)}</td>
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
        <div style={{ display: 'flex', border: '1px solid #000', height: '100%' }}>
            <div style={{ flex: 1, padding: '4px 6px', borderRight: '1px solid #000' }}><p style={{ fontWeight: 'bold', marginBottom: 1 }}>IMPORTE CON LETRA:</p><p style={{ textTransform: 'uppercase' }}>{toLetras(totals.totalFinal)}</p></div>
            <div style={{ width: 162, padding: '2px 0' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 7.5 }}><tbody>
                    <tr><td style={{ padding: '1px 8px', fontWeight: 'bold' }}>Subtotal:</td><td style={{ padding: '1px 8px', textAlign: 'right' }}>${fmt(totals.totalSubtotal)}</td></tr>
                    <tr><td style={{ padding: '1px 8px', fontWeight: 'bold' }}>IEPS:</td><td style={{ padding: '1px 8px', textAlign: 'right' }}>$0.00</td></tr>
                    <tr><td style={{ padding: '1px 8px', fontWeight: 'bold' }}>IEPS C.:</td><td style={{ padding: '1px 8px', textAlign: 'right' }}>$0.00</td></tr>
                    <tr><td style={{ padding: '1px 8px', fontWeight: 'bold' }}>IVA:</td><td style={{ padding: '1px 8px', textAlign: 'right' }}>${fmt(totals.totalImpuestos)}</td></tr>
                    <tr><td style={{ padding: '1px 8px', fontWeight: 'bold' }}>Descuento:</td><td style={{ padding: '1px 8px', textAlign: 'right' }}>${fmt(totals.totalDesc)}</td></tr>
                    <tr style={{ borderTop: '1px solid #000', fontWeight: 'bold' }}><td style={{ padding: '1px 8px' }}>Total:</td><td style={{ padding: '1px 8px', textAlign: 'right' }}>${fmt(totals.totalFinal)}</td></tr>
                </tbody></table>
            </div>
        </div>
      );

    case 'fiscal_info':
      return (
        <div style={{ display: 'flex', border: '1px solid #000', height: '100%' }}>
            <div style={{ width: 108, borderRight: '1px solid #000', padding: '4px 6px', flexShrink: 0 }}>
                <p style={{ marginBottom: 2 }}><b>TIPO DE RELACIÓN:</b> —</p>
                <p style={{ marginBottom: 4 }}><b>CFDI RELACIONADO:</b></p>
                <div style={{ width: 78, height: 78, border: '2px solid #000', background: 'repeating-conic-gradient(#444 0% 25%, #fff 0% 50%) 0 0 / 6px 6px', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', inset: '20%', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={{ width: 16, height: 16, background: '#000' }} /></div>
                </div>
            </div>
            <div style={{ flex: 1, padding: '4px 8px' }}>
                <p style={{ textAlign: 'center', fontWeight: 'bold', fontSize: 8, marginBottom: 5 }}>Este documento es una representación impresa de un CFDI</p>
                <FiscalRow label="Serie del Certificado del emisor:" value={FAKE_CERT_EMISOR} />
                <FiscalRow label="Folio Fiscal:" value={FAKE_UUID} />
                <FiscalRow label="No. de serie del Certificado del SAT:" value={FAKE_CERT_SAT} />
                <FiscalRow label="Fecha y hora de certificación:" value={`${form.fecha}T${form.hora}:05`} />
                <p style={{ textAlign: 'right', fontStyle: 'italic', fontSize: 6.5, marginTop: 3 }}>*Efectos fiscales al pago</p>
            </div>
        </div>
      );

    case 'sellos_box':
      return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <SelloBox title="Sello del CFDI" value={FAKE_SELLO_CFDI + FAKE_SELLO_CFDI} />
            <SelloBox title="Sello del SAT" value={FAKE_SELLO_SAT + FAKE_SELLO_SAT} />
            <SelloBox title="Cadena del complemento de la certificación digital del SAT" value={FAKE_CADENA + FAKE_CADENA + FAKE_CADENA} />
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
