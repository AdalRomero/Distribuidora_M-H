import { Clock, Eye, FileCheck, FileCode, FileMinus, FileText, Loader2, Plus, Search, TrendingUp, RefreshCw } from 'lucide-react';
import { Fragment, useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useLocalSearchParams, router } from 'expo-router';
import { usePagination } from '../../src/hooks/usePagination';
import AddInvoice from '../../components/ui/modals/AddInvoice';
import SyncErrorBanner, { SyncError } from "../../components/ui/SyncErrorBanner";
import ErrorModal from '../../components/ui/modals/ErrorModal';
import { useSyncErrors } from "../../src/hooks/useSyncErrors";
import { database } from '../../src/services/DB/indexBD';
import { Q } from '@nozbe/watermelondb';

interface Partida { id: string; producto: string; cantidad: number; precioUnitario: number; descuentoAplicado: number; }
interface Invoice {
    id: string; folio: string; tipoDocumento: 'Factura' | 'Prefactura' | 'Cotización' | 'Nota de Devolución' | 'Nota de Crédito';
    cliente: string; versionCFDI: string; estado: 'Timbrada/Pagada' | 'En espera (Standby)' | 'Cancelada' | 'Generada' | 'Pendiente Timbrado' | 'Presupuesto'; total: number; partidas: Partida[];
}

export default function Invoices() {
    const [searchTerm, setSearchTerm] = useState('');
    const [showAddInvoice, setShowAddInvoice] = useState(false);
    const [recoverData, setRecoverData] = useState<any>(null);
    const [recoveringErrorId, setRecoveringErrorId] = useState<string | null>(null);
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [readonlyMode, setReadonlyMode] = useState(false);
    const [autoDownloadPDF, setAutoDownloadPDF] = useState(false);
    const [autoDownloadXML, setAutoDownloadXML] = useState(false);
    const [isErrorModalOpen, setIsErrorModalOpen] = useState(false);

    const tablesToWatch = useMemo(() => ["documentos", "documentos_detalles"], []);
    const { syncErrors, handleDismissError } = useSyncErrors(tablesToWatch);

    // ==========================================
    // CARGAR FACTURAS DESDE DB
    // ==========================================
    const loadInvoices = useCallback(async () => {
        try {
            setIsLoading(true);
            const docsCollection = database.collections.get('documentos');
            const allDocs = await docsCollection.query().fetch();

            const mapped: Invoice[] = await Promise.all(allDocs.map(async (doc: any) => {
                // Cargar detalles
                const detallesCollection = database.collections.get('documentos_detalles');
                const detalles = await detallesCollection.query(Q.where('documento_id', doc.id)).fetch();

                // Obtener nombre del cliente
                let clienteNombre = 'Público General';
                try {
                    if (doc._raw.cliente_id && doc._raw.cliente_id !== 'publico_general') {
                        const clienteRecord = await database.collections.get('clientes').find(doc._raw.cliente_id);
                        clienteNombre = (clienteRecord as any).nombre || clienteNombre;
                    }
                } catch { /* cliente no encontrado */ }

                // Mapear tipo (doc.tipo se almacena en UPPERCASE)
                const tipoRaw = (doc.tipo || 'factura').toLowerCase();
                const tipoMap: Record<string, Invoice['tipoDocumento']> = {
                    'factura': 'Factura',
                    'prefactura': 'Prefactura',
                    'cotizacion': 'Cotización',
                    'nota_devolucion': 'Nota de Devolución',
                    'nota_credito': 'Nota de Crédito',
                };

                // Mapear estado
                const estadoRaw = (doc.estado || 'generada').toLowerCase();
                const estadoMap: Record<string, Invoice['estado']> = {
                    'generada': 'Generada',
                    'timbrada': 'Timbrada/Pagada',
                    'pagada': 'Timbrada/Pagada',
                    'cancelada': 'Cancelada',
                    'standby': 'En espera (Standby)',
                    'pendiente_timbrado': 'Pendiente Timbrado',
                    'presupuesto': 'Presupuesto',
                };

                return {
                    id: doc.id,
                    folio: doc.folio || 'SIN-FOLIO',
                    tipoDocumento: tipoMap[tipoRaw] || 'Factura',
                    cliente: clienteNombre,
                    versionCFDI: tipoRaw === 'factura' ? 'CFDI v4.0' : 'N/A',
                    estado: estadoMap[estadoRaw] || 'Generada',
                    total: doc.total || 0,
                    partidas: detalles.map((d: any) => ({
                        id: d.id,
                        producto: d.descripcionAplicada || 'Producto',
                        cantidad: d.cantidad || 0,
                        precioUnitario: d.precioUnitarioAplicado || 0,
                        descuentoAplicado: d.descuentoAplicado || 0,
                    })),
                } as Invoice;
            }));

            setInvoices(mapped);
        } catch (err) {
            console.error('Error cargando facturas:', err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadInvoices();
    }, [loadInvoices]);

    useEffect(() => {
        const autoRecoverId = new URLSearchParams(window.location.search).get("recoverErrorId");
        if (autoRecoverId && syncErrors.length > 0) {
          const err = syncErrors.find(e => e.id === autoRecoverId);
          if (err) triggerRecoveryWrapper(err);
        }
    }, [syncErrors]);

    const triggerRecoveryWrapper = (err: SyncError) => {
        setRecoverData(err.datosAtrapados);
        setRecoveringErrorId(err.id);
        setShowAddInvoice(true);
    };

    const openInvoiceModal = async (invId: string, action: 'view' | 'pdf' | 'xml' | 'convert') => {
        try {
            const docRecord: any = await database.collections.get('documentos').find(invId);
            const detalles = await database.collections.get('documentos_detalles').query(Q.where('documento_id', invId)).fetch();
            
            let clienteRecord: any = null;
            if (docRecord._raw.cliente_id && docRecord._raw.cliente_id !== 'publico_general') {
                try {
                    clienteRecord = await database.collections.get('clientes').find(docRecord._raw.cliente_id);
                } catch { }
            }

            const recData = {
                serie: docRecord.folio ? docRecord.folio.split('-')[0] : 'A',
                folio: docRecord.folio && docRecord.folio.includes('-') ? docRecord.folio.split('-')[1] : docRecord.folio || '1',
                fecha: docRecord._raw.created_at ? new Date(docRecord._raw.created_at).toISOString() : new Date().toISOString(),
                clienteId: docRecord._raw.cliente_id,
                nombre: clienteRecord ? clienteRecord.nombre : 'Público General',
                rfc: clienteRecord ? clienteRecord.rfc : 'XAXX010101000',
                domicilio: clienteRecord ? `${clienteRecord.calle || ''} ${clienteRecord.colonia || ''} ${clienteRecord.cp || ''} ${clienteRecord.ciudad || ''}`.trim() : '',
                codigoCliente: clienteRecord ? clienteRecord.id.slice(0, 6).toUpperCase() : '',
                conceptos: detalles.map((d: any) => {
                    const jsonImpuestosStr = d._raw.json_impuestos_aplicados || d.jsonImpuestosAplicados;
                    const jsonImpuestos = jsonImpuestosStr ? JSON.parse(jsonImpuestosStr) : { iva: 16 };
                    const qty = d.cantidad || 0;
                    const vu = d.precioUnitarioAplicado || d._raw.precio_unitario_aplicado || 0;
                    const desc = d.descuentoAplicado || d._raw.descuento_aplicado || 0;
                    const descPct = (qty > 0 && vu > 0 && desc > 0) ? ((desc / (qty * vu)) * 100).toFixed(2) : '0';
                    return {
                        id: Math.random().toString(36).slice(2),
                        cantidad: String(qty),
                        concepto: d.descripcionAplicada || d._raw.descripcion_aplicada || '',
                        valorUnitario: String(vu),
                        productoId: d._raw.producto_id,
                        descuento: descPct,
                        porcImpuesto: String(jsonImpuestos.iva || 16),
                        unidadSat: 'H87',
                        claveSat: '',
                    }
                }),
                usoCFDI: docRecord._raw.uso_cfdi || docRecord.uso_cfdi || 'G03',
                tipoComprobante: 'I',
                metodoPago: docRecord._raw.metodo_pago || docRecord.metodo_pago || 'PUE',
                formaPago: docRecord._raw.forma_pago || docRecord.forma_pago || '01',
                moneda: docRecord._raw.moneda || docRecord.moneda || 'MXN',
                lugarExpedicion: docRecord._raw.lugar_expedicion || docRecord.lugar_expedicion || '83554',
                agente: docRecord._raw.agente || docRecord.agente || '',
                observaciones: docRecord._raw.observaciones || docRecord.observaciones || '',
                cfdiRelacionado: docRecord._raw.cfdi_relacionado || docRecord.cfdi_relacionado || '',
                tipoRelacion: docRecord._raw.tipo_relacion || docRecord.tipo_relacion || '',
                tipoDocumento: action === 'convert' ? 'factura' : ((docRecord.tipo || 'factura').toLowerCase()),
            };

            setRecoverData(recData);
            setReadonlyMode(action !== 'convert');
            setAutoDownloadPDF(action === 'pdf');
            setAutoDownloadXML(action === 'xml');
            setShowAddInvoice(true);
        } catch (error) {
            console.error("Error opening invoice details:", error);
            setIsErrorModalOpen(true);
        }
    };

    const params = useLocalSearchParams();

    useEffect(() => {
        if (params.openModal === 'action_add_invoice') {
            setShowAddInvoice(true);
            router.setParams({ openModal: '' });
        }
    }, [params.openModal]);

    // Listener para hotkey de acción
    useEffect(() => {
        const handleActionHotkey = (e: any) => {
            if (e.detail?.actionId === 'action_add_invoice') {
                setShowAddInvoice(true);
            }
        };
        window.addEventListener('action_hotkey', handleActionHotkey);
        return () => window.removeEventListener('action_hotkey', handleActionHotkey);
    }, []);

    const filteredInvoices = invoices.filter(inv =>
        inv.folio.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inv.cliente.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const { visible: visibleInvoices, hasMore: hasMoreInvoices, loadMore: loadMoreInvoices, reset: resetInvPricePage } = usePagination(filteredInvoices, 6);
    
    // Infinite Scroll Observer
    const observerTarget = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && hasMoreInvoices) {
                    loadMoreInvoices();
                }
            },
            { threshold: 0.1 }
        );

        if (observerTarget.current) {
            observer.observe(observerTarget.current);
        }

        return () => {
            if (observerTarget.current) {
                observer.unobserve(observerTarget.current);
            }
        };
    }, [hasMoreInvoices, loadMoreInvoices]);

    useEffect(() => { resetInvPricePage(); }, [searchTerm]);

    const getTipoDocumentoBadge = (tipo: string) => {
        switch (tipo) {
            case 'Factura': return 'bg-blue-50 dark:bg-blue-900/30 text-mh-blue dark:text-blue-400 border-blue-100 dark:border-blue-800/50';
            case 'Prefactura': return 'bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 border-orange-100 dark:border-orange-800/50';
            case 'Cotización': return 'bg-slate-100 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700';
            case 'Nota de Devolución': case 'Nota de Crédito': return 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-500 border-amber-100 dark:border-amber-800/50';
            default: return 'bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700';
        }
    };

    const getEstadoBadge = (estado: string) => {
        switch (estado) {
            case 'Timbrada/Pagada': return 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50';
            case 'En espera (Standby)': return 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-700';
            case 'Cancelada': return 'bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800/50';
            case 'Generada': return 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800/50';
            case 'Pendiente Timbrado': return 'bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-800/50';
            case 'Presupuesto': return 'bg-violet-50 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 border-violet-200 dark:border-violet-800/50';
            default: return 'bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700';
        }
    };

    const formatCurrency = (amount: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount);

    return (
        <Fragment>
            <div className="p-4 sm:p-8 bg-slate-50 dark:bg-slate-900 min-h-screen font-sans">
                <div className="max-w-7xl mx-auto">
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                        <div>
                            <h1 className="text-2xl font-bold text-mh-blue-dark dark:text-white tracking-tight">Facturación y Documentos</h1>
                            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Administra tus comprobantes, cotizaciones y notas de crédito.</p>
                        </div>
                        <button onClick={() => setShowAddInvoice(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium text-sm shadow-sm">
                            <Plus className="w-4 h-4" /><span>Nueva Factura</span>
                        </button>
                    </div>

                    <SyncErrorBanner 
                        errors={syncErrors} 
                        onRecover={triggerRecoveryWrapper} 
                        onDismiss={handleDismissError} 
                        contextName="Factura" 
                        isHighPriority={true} 
                    />

                    {/* KPI Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-mh-blue dark:text-blue-500"><TrendingUp className="w-6 h-6" /></div>
                            <div><p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Facturado</p><p className="text-xl font-bold text-mh-blue-dark dark:text-white">{formatCurrency(invoices.filter(i => i.total > 0 && i.tipoDocumento === 'Factura').reduce((s, i) => s + i.total, 0))}</p></div>
                        </div>
                        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-slate-50 dark:bg-slate-900 flex items-center justify-center text-slate-500 dark:text-slate-400"><Clock className="w-6 h-6" /></div>
                            <div><p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Facturas Generadas</p><p className="text-xl font-bold text-mh-blue-dark dark:text-white">{invoices.filter(i => i.tipoDocumento === 'Factura' && (i.estado === 'Generada' || i.estado === 'Timbrada/Pagada')).length}</p></div>
                        </div>
                        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center text-amber-500"><FileMinus className="w-6 h-6" /></div>
                            <div><p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Notas de Crédito</p><p className="text-xl font-bold text-mh-blue-dark dark:text-white">{invoices.filter(i => i.tipoDocumento === 'Nota de Crédito').length}</p></div>
                        </div>
                        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-500"><FileCheck className="w-6 h-6" /></div>
                            <div><p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Contabilizable</p><p className="text-xl font-bold text-mh-blue-dark dark:text-white">{invoices.filter(i => i.tipoDocumento === 'Factura' || i.tipoDocumento === 'Nota de Crédito' || i.tipoDocumento === 'Nota de Devolución').length}</p></div>
                        </div>
                    </div>

                    {/* Search Bar */}
                    <div className="flex flex-col md:flex-row gap-4 mb-6 bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                        <div className="relative flex-1">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Search className="w-5 h-5 text-slate-400" /></div>
                            <input type="text" className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none placeholder:text-slate-400" placeholder="Buscar por folio o nombre del cliente..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                        </div>
                    </div>

                    {/* Table */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left font-sans whitespace-nowrap">
                                <thead className="bg-slate-50 dark:bg-slate-900/80 text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-700 text-xs uppercase tracking-wider font-bold">
                                    <tr>
                                        <th className="px-6 py-4">Documento</th>
                                        <th className="px-6 py-4">Cliente y CFDI</th>
                                        <th className="px-6 py-4">Estado</th>
                                        <th className="px-6 py-4">Resumen de Partidas</th>
                                        <th className="px-6 py-4 text-right">Total</th>
                                        <th className="px-6 py-4 text-center">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 text-sm">
                                    {visibleInvoices.map((inv) => {
                                        const firstProduct = inv.partidas[0];
                                        const extraItemsAmount = inv.partidas.length - 1;
                                        return (
                                            <tr key={inv.id} className="hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-900/50 transition-colors group">
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col items-start space-y-1.5">
                                                        <span className="font-bold text-slate-800 dark:text-white">{inv.folio}</span>
                                                        <span className={`inline-flex px-2 py-0.5 border rounded text-[10px] font-semibold uppercase tracking-wide ${getTipoDocumentoBadge(inv.tipoDocumento)}`}>{inv.tipoDocumento}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col">
                                                        <span className="font-semibold text-mh-blue-dark dark:text-white">{inv.cliente}</span>
                                                        <span className="text-xs text-slate-400 mt-0.5">{inv.versionCFDI}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${getEstadoBadge(inv.estado)}`}>{inv.estado}</span>
                                                </td>
                                                <td className="px-6 py-4 max-w-xs">
                                                    <div className="flex flex-col">
                                                        <span className="font-semibold text-slate-700 dark:text-slate-300">{inv.partidas.length} {inv.partidas.length === 1 ? 'Partida' : 'Partidas'}</span>
                                                        <div className="text-xs text-slate-400 mt-0.5 truncate flex items-center gap-1">
                                                            <span>{firstProduct.producto.length > 20 ? firstProduct.producto.substring(0, 20) + '...' : firstProduct.producto}</span>
                                                            {extraItemsAmount > 0 && <span>+{extraItemsAmount} más</span>}
                                                            {firstProduct.descuentoAplicado > 0 && <span className="text-mh-pink ml-1">| Desc: {firstProduct.descuentoAplicado}%</span>}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <span className={`font-bold ${inv.total < 0 ? 'text-rose-600' : 'text-slate-900 dark:text-white'}`}>{formatCurrency(inv.total)}</span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button onClick={() => openInvoiceModal(inv.id, 'view')} className="p-1.5 text-slate-400 hover:text-mh-blue hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-mh-blue/20" title="Ver Detalle"><Eye className="w-4 h-4" /></button>
                                                        <button onClick={() => openInvoiceModal(inv.id, 'pdf')} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border border-transparent hover:border-rose-200" title="Descargar PDF"><FileText className="w-4 h-4" /></button>
                                                        <button onClick={() => openInvoiceModal(inv.id, 'xml')} className="p-1.5 text-slate-400 hover:text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:bg-indigo-500/10 rounded-lg transition-colors border border-transparent hover:border-indigo-200" title="Descargar XML"><FileCode className="w-4 h-4" /></button>
                                                        {(inv.tipoDocumento === 'Prefactura' || inv.tipoDocumento === 'Cotización') && (
                                                            <button onClick={() => openInvoiceModal(inv.id, 'convert')} className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors border border-transparent hover:border-emerald-200" title="Convertir a Factura"><RefreshCw className="w-4 h-4" /></button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {isLoading && (
                                        <tr><td colSpan={6} className="px-6 py-12 text-center"><div className="flex items-center justify-center gap-2 text-slate-400"><Loader2 className="w-5 h-5 animate-spin" /><span>Cargando documentos...</span></div></td></tr>
                                    )}
                                    {!isLoading && filteredInvoices.length === 0 && (
                                        <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-400">{searchTerm ? 'No se encontraron documentos relacionados a la búsqueda.' : 'Aún no hay documentos generados. Crea tu primera factura.'}</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                     {/* Infinite Scroll Trigger */}
                     {hasMoreInvoices && (
                         <div ref={observerTarget} className="flex justify-center mt-6 py-4">
                             <div className="flex items-center gap-2 text-slate-400">
                                 <Loader2 className="w-5 h-5 animate-spin" />
                                 <span className="text-sm font-medium">Cargando más documentos...</span>
                             </div>
                         </div>
                     )}
                </div>
            </div>
            <AddInvoice 
                isOpen={showAddInvoice} 
                onClose={() => { 
                    setShowAddInvoice(false); 
                    setRecoverData(null); 
                    setRecoveringErrorId(null); 
                    setReadonlyMode(false);
                    setAutoDownloadPDF(false);
                    setAutoDownloadXML(false);
                }} 
                recoverData={recoverData} 
                readonlyMode={readonlyMode}
                autoDownloadPDF={autoDownloadPDF}
                autoDownloadXML={autoDownloadXML}
                onSaveSuccess={() => {
                if (recoveringErrorId) {
                    handleDismissError(recoveringErrorId);
                    setRecoveringErrorId(null);
                    setRecoverData(null);
                }
                loadInvoices();
            }} />
            <ErrorModal
                isOpen={isErrorModalOpen}
                onClose={() => setIsErrorModalOpen(false)}
                title="Error al Cargar Factura"
                message="No se pudo cargar la factura especificada. Intenta nuevamente."
            />
        </Fragment>
    );
}
