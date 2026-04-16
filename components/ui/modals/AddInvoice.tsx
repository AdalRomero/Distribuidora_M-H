import { Edit3, Eye, FileText, Plus, ShoppingCart, Trash2, User, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import InvoiceBuilderCanvas from './InvoiceBuilderCanvas';

interface AddInvoiceProps { isOpen: boolean; onClose: () => void; recoverData?: any; onSaveSuccess?: () => void; }
interface Concepto { id: string; cantidad: string; unidadSat: string; claveSat: string; concepto: string; valorUnitario: string; descuento: string; porcImpuesto: string; }
interface InvoiceForm { serie: string; folio: string; fecha: string; hora: string; tipoComprobante: string; lugarExpedicion: string; metodoPago: string; formaPago: string; moneda: string; codigoCliente: string; nombre: string; rfc: string; domicilio: string; agente: string; usoCFDI: string; observaciones: string; conceptos: Concepto[]; }

const newConcepto = (): Concepto => ({ id: Math.random().toString(36).slice(2), cantidad: '', unidadSat: '', claveSat: '', concepto: '', valorUnitario: '', descuento: '', porcImpuesto: '16' });
const initialForm: InvoiceForm = { serie: 'A', folio: '1', fecha: new Date().toISOString().split('T')[0], hora: new Date().toTimeString().slice(0, 5), tipoComprobante: 'I', lugarExpedicion: '83554', metodoPago: 'PPD', formaPago: '99', moneda: 'MXN', codigoCliente: '', nombre: '', rfc: 'XAXX010101000', domicilio: '', agente: '', usoCFDI: 'S01', observaciones: '', conceptos: [newConcepto()] };

const inputClass = 'w-full border border-slate-300 rounded-lg px-3 py-1.5 text-sm text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors';
const labelClass = 'block text-xs font-medium text-slate-600 dark:text-slate-300 mb-0.5';

function calcConcepto(c: Concepto) { const cant = parseFloat(c.cantidad) || 0; const vu = parseFloat(c.valorUnitario) || 0; const desc = parseFloat(c.descuento) || 0; const porc = parseFloat(c.porcImpuesto) || 0; const subtotal = cant * vu; const impuestos = subtotal * (porc / 100); const total = subtotal - desc + impuestos; return { subtotal, impuestos, total }; }
function toLetras(num: number): string { if (num === 0) return 'CERO PESOS 00/100 M.N.'; const entero = Math.floor(num); const dec = Math.round((num - entero) * 100); return `${entero.toLocaleString()} PESOS ${dec.toString().padStart(2, '0')}/100 M.N.`; }

const FAKE_UUID = 'A1B2C3D4-E5F6-7890-ABCD-EF1234567890';
const FAKE_SELLO_CFDI = 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA2k9z7TbVe8X1JM5BzV1pKaAAAAAAAAAAAAAAAAAA==';
const FAKE_SELLO_SAT = 'GxR+PoIrGoTOYeVHvXzqBcN7Lw1fDpMjTGYkRsE0AaaZz9BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB==';
const FAKE_CERT_EMISOR = '30001000000500003416';
const FAKE_CERT_SAT = '20001000000300022323';
const FAKE_CADENA = '||4.0|A|1|2026-03-21|Puerto Peñasco|I|PPD|99|MXN|XAXX010101000|S01|...MICO1234567890||';

export default function AddInvoice({ isOpen, onClose, recoverData, onSaveSuccess }: AddInvoiceProps) {
    const [form, setForm] = useState<InvoiceForm>(initialForm);
    const [isEditMode, setIsEditMode] = useState(false);
    useEffect(() => {
        if (recoverData) {
            setForm({
                serie: recoverData.serie || 'A',
                folio: recoverData.folio || '1',
                fecha: recoverData.fecha ? new Date(recoverData.fecha).toISOString().split('T')[0] : initialForm.fecha,
                hora: initialForm.hora,
                tipoComprobante: recoverData.tipoComprobante || 'I',
                lugarExpedicion: recoverData.lugarExpedicion || '83554',
                metodoPago: recoverData.metodoPago || 'PPD',
                formaPago: recoverData.formaPago || '99',
                moneda: recoverData.moneda || 'MXN',
                codigoCliente: recoverData.codigoCliente || '',
                nombre: recoverData.nombre || '',
                rfc: recoverData.rfc || 'XAXX010101000',
                domicilio: recoverData.domicilio || '',
                agente: recoverData.agente || '',
                usoCFDI: recoverData.usoCFDI || 'S01',
                observaciones: recoverData.observaciones || '',
                conceptos: recoverData.conceptos?.length ? recoverData.conceptos.map((c: any) => ({
                    id: Math.random().toString(36).slice(2),
                    cantidad: c.cantidad ? String(c.cantidad) : '',
                    unidadSat: c.unidadSat || '',
                    claveSat: c.claveSat || '',
                    concepto: c.concepto || '',
                    valorUnitario: c.valorUnitario ? String(c.valorUnitario) : '',
                    descuento: c.descuento ? String(c.descuento) : '',
                    porcImpuesto: c.porcImpuesto ? String(c.porcImpuesto) : '16'
                })) : [newConcepto()]
            });
        }
    }, [recoverData]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => { const { name, value } = e.target; setForm(prev => ({ ...prev, [name]: value })); };
    const handleClose = () => { setForm(initialForm); onClose(); };
    const updateConcepto = (id: string, field: keyof Concepto, value: string) => { setForm(prev => ({ ...prev, conceptos: prev.conceptos.map(c => c.id === id ? { ...c, [field]: value } : c) })); };
    const addConcepto = () => setForm(prev => ({ ...prev, conceptos: [...prev.conceptos, newConcepto()] }));
    const removeConcepto = (id: string) => setForm(prev => ({ ...prev, conceptos: prev.conceptos.filter(c => c.id !== id) }));

    const totalSubtotal = form.conceptos.reduce((s, c) => s + calcConcepto(c).subtotal, 0);
    const totalDesc = form.conceptos.reduce((s, c) => s + (parseFloat(c.descuento) || 0), 0);
    const totalImpuestos = form.conceptos.reduce((s, c) => s + calcConcepto(c).impuestos, 0);
    const totalFinal = form.conceptos.reduce((s, c) => s + calcConcepto(c).total, 0);
    const fmt = (n: number) => n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50">
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} />
            <div className="fixed inset-0 flex items-center justify-center p-3">
                <div className="w-[95vw] max-w-7xl h-[90vh] bg-white dark:bg-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden relative z-10">

                    {/* HEADER */}
                    <div className="flex items-center justify-between px-6 py-3 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-100 rounded-lg"><FileText className="w-5 h-5 text-blue-700" /></div>
                            <h3 className="text-lg font-bold text-slate-800 dark:text-white">Generar Factura — CFDI 4.0</h3>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setIsEditMode(!isEditMode)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${isEditMode ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                    }`}
                            >
                                {isEditMode ? <><Eye className="w-4 h-4" /> Finalizar Diseño</> : <><Edit3 className="w-4 h-4" /> Editar Plantilla</>}
                            </button>
                            <button onClick={handleClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"><X className="w-5 h-5" /></button>
                        </div>
                    </div>

                    {/* BODY (Split View) */}
                    <div className="flex-1 grid grid-cols-2 overflow-hidden">

                        {/* LEFT - Form */}
                        <div className="overflow-y-auto p-5 pr-3 bg-slate-50 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700 space-y-4">

                            {/* Card 1: Datos del Comprobante */}
                            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 shadow-sm">
                                <div className="flex items-center gap-2 mb-3"><FileText className="w-4 h-4 text-blue-700" /><h4 className="font-semibold text-blue-900 text-sm">Datos del Comprobante</h4></div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div><label className={labelClass}>Serie</label><input type="text" name="serie" value={form.serie} onChange={handleChange} className={inputClass} /></div>
                                    <div><label className={labelClass}>Folio</label><input type="text" name="folio" value={form.folio} onChange={handleChange} className={inputClass} /></div>
                                    <div><label className={labelClass}>Fecha</label><input type="date" name="fecha" value={form.fecha} onChange={handleChange} className={inputClass} /></div>
                                    <div><label className={labelClass}>Hora</label><input type="time" name="hora" value={form.hora} onChange={handleChange} className={inputClass} /></div>
                                    <div><label className={labelClass}>Tipo de Comprobante</label><select name="tipoComprobante" value={form.tipoComprobante} onChange={handleChange} className={inputClass}><option value="I">I — Ingreso</option><option value="E">E — Egreso</option><option value="T">T — Traslado</option><option value="N">N — Nómina</option><option value="P">P — Pago</option></select></div>
                                    <div><label className={labelClass}>Lugar de Expedición (CP)</label><input type="text" name="lugarExpedicion" value={form.lugarExpedicion} onChange={handleChange} className={inputClass} placeholder="83554" /></div>
                                    <div><label className={labelClass}>Método de Pago</label><select name="metodoPago" value={form.metodoPago} onChange={handleChange} className={inputClass}><option value="PPD">PPD — Pago en Parcialidades o Diferido</option><option value="PUE">PUE — Pago en Una Sola Exhibición</option></select></div>
                                    <div><label className={labelClass}>Forma de Pago</label><select name="formaPago" value={form.formaPago} onChange={handleChange} className={inputClass}><option value="99">99 — Por Definir</option><option value="01">01 — Efectivo</option><option value="02">02 — Cheque nominativo</option><option value="03">03 — Transferencia electrónica</option><option value="04">04 — Tarjeta de crédito</option><option value="28">28 — Tarjeta de débito</option></select></div>
                                    <div className="col-span-2"><label className={labelClass}>Moneda</label><select name="moneda" value={form.moneda} onChange={handleChange} className={inputClass}><option value="MXN">MXN — Peso Mexicano</option><option value="USD">USD — Dólar Americano</option><option value="EUR">EUR — Euro</option></select></div>
                                </div>
                            </div>

                            {/* Card 2: Datos del Receptor */}
                            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 shadow-sm">
                                <div className="flex items-center gap-2 mb-3"><User className="w-4 h-4 text-blue-700" /><h4 className="font-semibold text-blue-900 text-sm">Datos del Cliente (Receptor)</h4></div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div><label className={labelClass}>Código de Cliente</label><input type="text" name="codigoCliente" value={form.codigoCliente} onChange={handleChange} className={inputClass} placeholder="000001" /></div>
                                    <div><label className={labelClass}>Nombre / Razón Social</label><input type="text" name="nombre" value={form.nombre} onChange={handleChange} className={inputClass} placeholder="Ej: Panadería La Esperanza" /></div>
                                    <div><label className={labelClass}>RFC</label><input type="text" name="rfc" value={form.rfc} onChange={handleChange} className={inputClass} placeholder="XAXX010101000" /></div>
                                    <div><label className={labelClass}>Agente</label><input type="text" name="agente" value={form.agente} onChange={handleChange} className={inputClass} placeholder="Nombre del agente" /></div>
                                    <div className="col-span-2"><label className={labelClass}>Domicilio Completo</label><input type="text" name="domicilio" value={form.domicilio} onChange={handleChange} className={inputClass} placeholder="Calle, Número, Colonia, Ciudad, Estado, CP" /></div>
                                    <div><label className={labelClass}>Uso CFDI</label><select name="usoCFDI" value={form.usoCFDI} onChange={handleChange} className={inputClass}><option value="S01">S01 — Sin efectos fiscales</option><option value="G01">G01 — Adquisición de mercancias</option><option value="G03">G03 — Gastos en general</option><option value="P01">P01 — Por definir</option><option value="CP01">CP01 — Pagos</option></select></div>
                                    <div><label className={labelClass}>Observaciones</label><input type="text" name="observaciones" value={form.observaciones} onChange={handleChange} className={inputClass} placeholder="Notas adicionales" /></div>
                                </div>
                            </div>

                            {/* Card 3: Conceptos */}
                            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 shadow-sm">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2"><ShoppingCart className="w-4 h-4 text-blue-700" /><h4 className="font-semibold text-blue-900 text-sm">Conceptos (Items)</h4></div>
                                    <button type="button" onClick={addConcepto} className="flex items-center gap-1 px-3 py-1 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors"><Plus className="w-3 h-3" /> Agregar</button>
                                </div>
                                <div className="space-y-4">
                                    {form.conceptos.map((c, idx) => (
                                        <div key={c.id} className="border border-slate-200 dark:border-slate-700 rounded-lg p-3 bg-slate-50 dark:bg-slate-900">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Artículo #{idx + 1}</span>
                                                {form.conceptos.length > 1 && (<button type="button" onClick={() => removeConcepto(c.id)} className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>)}
                                            </div>
                                            <div className="grid grid-cols-3 gap-2">
                                                <div><label className={labelClass}>Cantidad</label><input type="number" value={c.cantidad} onChange={(e) => updateConcepto(c.id, 'cantidad', e.target.value)} className={inputClass} placeholder="1" /></div>
                                                <div><label className={labelClass}>Unidad SAT</label><input type="text" value={c.unidadSat} onChange={(e) => updateConcepto(c.id, 'unidadSat', e.target.value)} className={inputClass} placeholder="H87" /></div>
                                                <div><label className={labelClass}>Clave SAT</label><input type="text" value={c.claveSat} onChange={(e) => updateConcepto(c.id, 'claveSat', e.target.value)} className={inputClass} placeholder="50171529" /></div>
                                                <div className="col-span-3"><label className={labelClass}>Concepto (Descripción)</label><input type="text" value={c.concepto} onChange={(e) => updateConcepto(c.id, 'concepto', e.target.value)} className={inputClass} placeholder="Describe el producto o servicio" /></div>
                                                <div><label className={labelClass}>Valor Unitario</label><input type="number" value={c.valorUnitario} onChange={(e) => updateConcepto(c.id, 'valorUnitario', e.target.value)} className={inputClass} placeholder="0.00" /></div>
                                                <div><label className={labelClass}>Descuento</label><input type="number" value={c.descuento} onChange={(e) => updateConcepto(c.id, 'descuento', e.target.value)} className={inputClass} placeholder="0.00" /></div>
                                                <div><label className={labelClass}>% Impuesto</label><select value={c.porcImpuesto} onChange={(e) => updateConcepto(c.id, 'porcImpuesto', e.target.value)} className={inputClass}><option value="16">16% IVA</option><option value="8">8% IVA</option><option value="0">0% Exento</option></select></div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* RIGHT - PDF Preview */}
                        <InvoiceBuilderCanvas
                            isEditMode={isEditMode}
                            form={form}
                            calcConcepto={calcConcepto}
                            totals={{ totalSubtotal, totalDesc, totalImpuestos, totalFinal }}
                        />
                    </div >

                    {/* FOOTER */}
                    < div className="px-6 py-3 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shrink-0 flex justify-end gap-3" >
                        <button type="button" onClick={handleClose} className="px-6 py-2 rounded-xl text-slate-500 dark:text-slate-400 text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-700 dark:bg-slate-800/50 transition-colors">Cancelar</button>
                        <button type="button" className="px-6 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold transition-all active:scale-95 shadow-md shadow-blue-500/20">Generar Factura</button>
                    </div >
                </div >
            </div >
        </div >
    );
}

