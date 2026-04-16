import { Clock, Eye, FileCheck, FileCode, FileMinus, FileText, Plus, Search, TrendingUp } from 'lucide-react';
import { Fragment, useState, useMemo, useEffect } from 'react';
import AddInvoice from '../../components/ui/modals/AddInvoice';
import SyncErrorBanner, { SyncError } from "../../components/ui/SyncErrorBanner";
import { useSyncErrors } from "../../src/hooks/useSyncErrors";

interface Partida { id: string; producto: string; cantidad: number; precioUnitario: number; descuentoAplicado: number; }
interface Invoice {
    id: string; folio: string; tipoDocumento: 'Factura' | 'Prefactura/Cotización' | 'Nota de Devolución' | 'Nota de Crédito';
    cliente: string; versionCFDI: string; estado: 'Timbrada/Pagada' | 'En espera (Standby)' | 'Cancelada'; total: number; partidas: Partida[];
}

const mockInvoices: Invoice[] = [
    {
        id: '1', folio: 'FAC-2026-089', tipoDocumento: 'Factura', cliente: 'Panadería El Trigo S.A de C.V.', versionCFDI: 'CFDI v4.0', estado: 'Timbrada/Pagada', total: 12450.00, partidas: [
            { id: 'p1', producto: 'Harina Selecta 50kg', cantidad: 5, precioUnitario: 1200, descuentoAplicado: 10 },
            { id: 'p2', producto: 'Azúcar Refinada 25kg', cantidad: 2, precioUnitario: 800, descuentoAplicado: 0 },
            { id: 'p3', producto: 'Levadura Fresca', cantidad: 10, precioUnitario: 450, descuentoAplicado: 5 },
        ]
    },
    {
        id: '2', folio: 'COT-2026-004', tipoDocumento: 'Prefactura/Cotización', cliente: 'Dulces La Estrella', versionCFDI: 'N/A', estado: 'En espera (Standby)', total: 5600.50, partidas: [
            { id: 'p4', producto: 'Colorante Rojo Caramelo', cantidad: 3, precioUnitario: 700, descuentoAplicado: 0 },
            { id: 'p5', producto: 'Esencia de Vainilla 1L', cantidad: 5, precioUnitario: 350, descuentoAplicado: 15 },
        ]
    },
    {
        id: '3', folio: 'FAC-2026-088', tipoDocumento: 'Factura', cliente: 'Bodega Aurrera - Sur', versionCFDI: 'CFDI v4.0', estado: 'Cancelada', total: 3200.00, partidas: [
            { id: 'p6', producto: 'Cajas de Cartón Corrugado', cantidad: 100, precioUnitario: 32, descuentoAplicado: 0 },
        ]
    },
    {
        id: '4', folio: 'NC-2026-012', tipoDocumento: 'Nota de Crédito', cliente: 'Panadería Rosa', versionCFDI: 'CFDI v4.0', estado: 'Timbrada/Pagada', total: -850.00, partidas: [
            { id: 'p7', producto: 'Devolución de Levadura (Caducada)', cantidad: 2, precioUnitario: 425, descuentoAplicado: 0 },
        ]
    },
    {
        id: '5', folio: 'COT-2026-005', tipoDocumento: 'Prefactura/Cotización', cliente: 'Restaurante El Cometa', versionCFDI: 'N/A', estado: 'En espera (Standby)', total: 18400.00, partidas: [
            { id: 'p8', producto: 'Aceite Vegetal 20L', cantidad: 10, precioUnitario: 850, descuentoAplicado: 5 },
            { id: 'p9', producto: 'Manteca de Cerdo 10kg', cantidad: 5, precioUnitario: 600, descuentoAplicado: 0 },
            { id: 'p10', producto: 'Sal Yodada 50kg', cantidad: 20, precioUnitario: 150, descuentoAplicado: 0 },
            { id: 'p11', producto: 'Sazonador Universal 5kg', cantidad: 4, precioUnitario: 975, descuentoAplicado: 10 },
        ]
    },
];

export default function Invoices() {
    const [searchTerm, setSearchTerm] = useState('');
    const [showAddInvoice, setShowAddInvoice] = useState(false);
    const [recoverData, setRecoverData] = useState<any>(null);
    const [recoveringErrorId, setRecoveringErrorId] = useState<string | null>(null);

    const tablesToWatch = useMemo(() => ["documentos", "documentos_detalles"], []);
    const { syncErrors, handleDismissError } = useSyncErrors(tablesToWatch);

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

    const filteredInvoices = mockInvoices.filter(inv =>
        inv.folio.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inv.cliente.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getTipoDocumentoBadge = (tipo: string) => {
        switch (tipo) {
            case 'Factura': return 'bg-blue-50 dark:bg-blue-900/30 text-mh-blue dark:text-blue-400 border-blue-100 dark:border-blue-800/50';
            case 'Prefactura/Cotización': return 'bg-slate-100 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700';
            case 'Nota de Devolución': case 'Nota de Crédito': return 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-500 border-amber-100 dark:border-amber-800/50';
            default: return 'bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700';
        }
    };

    const getEstadoBadge = (estado: string) => {
        switch (estado) {
            case 'Timbrada/Pagada': return 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50';
            case 'En espera (Standby)': return 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-700';
            case 'Cancelada': return 'bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800/50';
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
                            <div><p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Ventas del Mes</p><p className="text-xl font-bold text-mh-blue-dark dark:text-white">$145,230.00</p></div>
                        </div>
                        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-slate-50 dark:bg-slate-900 flex items-center justify-center text-slate-500 dark:text-slate-400"><Clock className="w-6 h-6" /></div>
                            <div><p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Cotizaciones en Espera</p><p className="text-xl font-bold text-mh-blue-dark dark:text-white">12</p></div>
                        </div>
                        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center text-amber-500"><FileMinus className="w-6 h-6" /></div>
                            <div><p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Notas de Crédito</p><p className="text-xl font-bold text-mh-blue-dark dark:text-white">3</p></div>
                        </div>
                        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-500"><FileCheck className="w-6 h-6" /></div>
                            <div><p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Timbrados SAT</p><p className="text-xl font-bold text-mh-blue-dark dark:text-white">89</p></div>
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
                                    {filteredInvoices.map((inv) => {
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
                                                        <button className="p-1.5 text-slate-400 hover:text-mh-blue hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-mh-blue/20" title="Ver Detalle"><Eye className="w-4 h-4" /></button>
                                                        <button className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border border-transparent hover:border-rose-200" title="Descargar PDF"><FileText className="w-4 h-4" /></button>
                                                        <button className="p-1.5 text-slate-400 hover:text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:bg-indigo-500/10 rounded-lg transition-colors border border-transparent hover:border-indigo-200" title="Descargar XML"><FileCode className="w-4 h-4" /></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {filteredInvoices.length === 0 && (
                                        <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-400">No se encontraron documentos relacionados a la búsqueda.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
            <AddInvoice isOpen={showAddInvoice} onClose={() => { setShowAddInvoice(false); setRecoverData(null); setRecoveringErrorId(null); }} recoverData={recoverData} onSaveSuccess={() => {
                if (recoveringErrorId) {
                    handleDismissError(recoveringErrorId);
                    setRecoveringErrorId(null);
                    setRecoverData(null);
                }
            }} />
        </Fragment>
    );
}
