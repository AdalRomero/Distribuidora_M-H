import * as Crypto from 'expo-crypto';
import { Calculator, DollarSign, Edit2, Loader2, Percent, Plus, Search, Trash2, Users } from 'lucide-react';
import { useState, useMemo, useEffect } from 'react';
import AddPrices, { PriceFormData } from '../../components/ui/modals/AddPrices';
import SyncErrorBanner, { SyncError } from "../../components/ui/SyncErrorBanner";
import { useSyncErrors } from "../../src/hooks/useSyncErrors";
import ErrorModal from '../../components/ui/modals/ErrorModal';
import SuccessModal from '../../components/ui/modals/SuccessModal';
import WarningModal from '../../components/ui/modals/WarningModal';
import { database } from '../../src/services/DB/indexBD';
import { syncApp } from '../../src/sync';

interface PriceListItem {
    id: string;
    clienteId: string;
    clienteNombre: string;
    productoId: string;
    productoNombre: string;
    descuentoPorcentaje: number;
    precioFijo: number;
}

export default function Prices() {
    const [searchTerm, setSearchTerm] = useState('');
    const [isPriceModalOpen, setIsPriceModalOpen] = useState(false);
    const [pricesList, setPricesList] = useState<PriceListItem[]>([]);
    const [isLoadingTable, setIsLoadingTable] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [warningModalConfig, setWarningModalConfig] = useState<{
        isOpen: boolean; title: string; message: string; onConfirm: () => void;
    }>({ isOpen: false, title: '', message: '', onConfirm: () => { } });

    // Edit state
    const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
    const [editData, setEditData] = useState<PriceFormData | null>(null);

    // Sync error recovery
    const [recoverData, setRecoverData] = useState<any>(null);
    const [recoveringErrorId, setRecoveringErrorId] = useState<string | null>(null);

    const tablesToWatch = useMemo(() => ["precios_especiales_clientes"], []);
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
        setEditingPriceId(null);
        setEditData(null);
        setIsPriceModalOpen(true);
    };

    // Auto-dismiss success messages
    useEffect(() => {
        if (message?.type === 'success') {
            const timer = setTimeout(() => setMessage(null), 4000);
            return () => clearTimeout(timer);
        }
    }, [message]);

    // Load data on mount
    useEffect(() => {
        loadPrices();
    }, []);

    // ==========================================
    // CARGAR PRECIOS DESDE WATERMELONDB
    // ==========================================
    const loadPrices = async () => {
        setIsLoadingTable(true);
        try {
            const preciosDb = database.collections.get('precios_especiales_clientes');
            const clientesDb = database.collections.get('clientes');
            const productosDb = database.collections.get('productos');

            const allPrecios = await preciosDb.query().fetch();

            // Build lookup maps
            const allClientes = await clientesDb.query().fetch();
            const allProductos = await productosDb.query().fetch();

            const clienteMap = new Map<string, string>();
            allClientes.forEach((c: any) => clienteMap.set(c.id, c.nombre || 'Sin nombre'));

            const productoMap = new Map<string, string>();
            allProductos.forEach((p: any) => productoMap.set(p.id, `${p.codigoInterno || 'S/C'} — ${p.descripcion || 'Sin descripción'}`));

            const mapped: PriceListItem[] = allPrecios.map((record: any) => {
                const cId = record._raw.cliente_id || '';
                const pId = record._raw.producto_id || '';
                return {
                    id: record.id,
                    clienteId: cId,
                    clienteNombre: clienteMap.get(cId) || 'Cliente desconocido',
                    productoId: pId,
                    productoNombre: productoMap.get(pId) || 'Producto desconocido',
                    descuentoPorcentaje: record.descuentoPorcentaje || 0,
                    precioFijo: record.precioFijo || 0,
                };
            });

            setPricesList(mapped);
        } catch (error) {
            console.error('Error al cargar precios especiales:', error);
        } finally {
            setIsLoadingTable(false);
        }
    };

    // ==========================================
    // GUARDAR NUEVO PRECIO ESPECIAL
    // ==========================================
    const handleSavePrice = async (formData: PriceFormData) => {
        setIsLoading(true);
        try {
            const preciosDb = database.collections.get('precios_especiales_clientes');
            const newId = Crypto.randomUUID();

            await database.write(async () => {
                await preciosDb.create((record: any) => {
                    record._raw.id = newId;
                    record._raw.cliente_id = formData.clienteId;
                    record._raw.producto_id = formData.productoId;
                    record.descuentoPorcentaje = parseFloat(formData.descuentoPorcentaje) || 0;
                    record.precioFijo = parseFloat(formData.precioFijo) || 0;
                });
            });

            setMessage({ type: 'success', text: 'Precio especial registrado exitosamente. Sincronizando...' });
            if (recoveringErrorId) {
                handleDismissError(recoveringErrorId);
                setRecoveringErrorId(null);
                setRecoverData(null);
            }
            loadPrices();
            syncApp().catch(console.error);
        } catch (error: any) {
            setMessage({ type: 'error', text: 'Error al guardar el precio especial: ' + error.message });
        } finally {
            setIsLoading(false);
        }
    };

    // ==========================================
    // EDITAR PRECIO EXISTENTE
    // ==========================================
    const startEdit = (item: PriceListItem) => {
        setEditingPriceId(item.id);
        setEditData({
            clienteId: item.clienteId,
            productoId: item.productoId,
            descuentoPorcentaje: String(item.descuentoPorcentaje),
            precioFijo: String(item.precioFijo),
        });
        setRecoverData(null);
        setIsPriceModalOpen(true);
    };

    const handleUpdatePrice = async (formData: PriceFormData) => {
        if (!editingPriceId) return;
        setIsLoading(true);
        try {
            const preciosDb = database.collections.get('precios_especiales_clientes');
            const record = await preciosDb.find(editingPriceId) as any;

            await database.write(async () => {
                await record.update((r: any) => {
                    r._raw.cliente_id = formData.clienteId;
                    r._raw.producto_id = formData.productoId;
                    r.descuentoPorcentaje = parseFloat(formData.descuentoPorcentaje) || 0;
                    r.precioFijo = parseFloat(formData.precioFijo) || 0;
                });
            });

            setMessage({ type: 'success', text: 'Precio especial actualizado correctamente. Sincronizando...' });
            if (recoveringErrorId) {
                handleDismissError(recoveringErrorId);
                setRecoveringErrorId(null);
                setRecoverData(null);
            }
            setEditingPriceId(null);
            setEditData(null);
            loadPrices();
            syncApp().catch(console.error);
        } catch (error: any) {
            setMessage({ type: 'error', text: 'Error al actualizar el precio especial: ' + error.message });
        } finally {
            setIsLoading(false);
        }
    };

    // ==========================================
    // ELIMINAR PRECIO ESPECIAL
    // ==========================================
    const handleDeletePrice = (item: PriceListItem) => {
        setWarningModalConfig({
            isOpen: true,
            title: 'Eliminar Precio Especial',
            message: `¿Estás seguro que deseas eliminar el precio especial de "${item.clienteNombre}" para "${item.productoNombre}"? Esta acción no se puede deshacer.`,
            onConfirm: async () => {
                setWarningModalConfig(prev => ({ ...prev, isOpen: false }));
                try {
                    const preciosDb = database.collections.get('precios_especiales_clientes');
                    const record = await preciosDb.find(item.id) as any;
                    await database.write(async () => {
                        await record.markAsDeleted();
                    });
                    setMessage({ type: 'success', text: 'Precio especial eliminado correctamente. Sincronizando...' });
                    loadPrices();
                    syncApp().catch(console.error);
                } catch (error: any) {
                    setMessage({ type: 'error', text: 'Error al eliminar el precio especial: ' + error.message });
                }
            },
        });
    };

    const handleCloseModal = () => {
        setIsPriceModalOpen(false);
        setEditingPriceId(null);
        setEditData(null);
        setRecoverData(null);
        setRecoveringErrorId(null);
    };

    // ==========================================
    // FILTRO DE BÚSQUEDA
    // ==========================================
    const filteredPrices = useMemo(() => {
        if (!searchTerm) return pricesList;
        const s = searchTerm.toLowerCase();
        return pricesList.filter(p =>
            p.clienteNombre.toLowerCase().includes(s) ||
            p.productoNombre.toLowerCase().includes(s)
        );
    }, [pricesList, searchTerm]);

    // ==========================================
    // KPIs
    // ==========================================
    const totalRegistros = pricesList.length;
    const clientesUnicos = new Set(pricesList.map(p => p.clienteId)).size;
    const promedioDescuento = pricesList.length > 0
        ? (pricesList.reduce((acc, p) => acc + p.descuentoPorcentaje, 0) / pricesList.length).toFixed(1)
        : '0';

    return (
        <div className="p-4 sm:p-8 bg-slate-50 dark:bg-slate-900 min-h-screen font-sans">
            <div className="max-w-7xl mx-auto">
                {/* MODALES */}
                <SuccessModal isOpen={message?.type === 'success'} onClose={() => setMessage(null)} title="¡Éxito!" message={message?.type === 'success' ? message.text : ''} />
                <ErrorModal isOpen={message?.type === 'error'} onClose={() => setMessage(null)} title="Ocurrió un problema" message={message?.type === 'error' ? message.text : ''} />
                <WarningModal isOpen={warningModalConfig.isOpen} onClose={() => setWarningModalConfig(prev => ({ ...prev, isOpen: false }))} onConfirm={warningModalConfig.onConfirm} title={warningModalConfig.title} message={warningModalConfig.message} />

                {/* Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-mh-blue-dark dark:text-white tracking-tight">Precios Especiales por Cliente</h1>
                        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Asigna descuentos o precios fijos especiales por cliente y producto.</p>
                    </div>
                    <button onClick={() => { setEditingPriceId(null); setEditData(null); setRecoverData(null); setIsPriceModalOpen(true); }} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium text-sm shadow-sm">
                        <Plus className="w-4 h-4" /><span>Nuevo Precio Especial</span>
                    </button>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-mh-blue dark:text-blue-400"><Calculator className="w-6 h-6" /></div>
                        <div><p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total de Registros</p><p className="text-2xl font-bold text-mh-blue-dark dark:text-white">{totalRegistros}</p></div>
                    </div>
                    <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400"><Users className="w-6 h-6" /></div>
                        <div><p className="text-sm font-medium text-slate-500 dark:text-slate-400">Clientes con Precio Especial</p><p className="text-2xl font-bold text-mh-blue-dark dark:text-white">{clientesUnicos}</p></div>
                    </div>
                    <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-mh-pink/10 dark:bg-rose-900/30 flex items-center justify-center text-mh-pink dark:text-rose-400"><Percent className="w-6 h-6" /></div>
                        <div><p className="text-sm font-medium text-slate-500 dark:text-slate-400">Descuento Promedio</p><p className="text-2xl font-bold text-mh-blue-dark dark:text-white">{promedioDescuento}%</p></div>
                    </div>
                </div>

                {/* Search Bar */}
                <div className="flex flex-col md:flex-row gap-4 mb-6 bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                    <div className="relative flex-1">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Search className="w-5 h-5 text-slate-400" /></div>
                        <input type="text" className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none placeholder:text-slate-400" placeholder="Buscar por nombre de cliente o producto..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                    </div>
                </div>

                <SyncErrorBanner
                    errors={syncErrors}
                    onRecover={triggerRecoveryWrapper}
                    onDismiss={handleDismissError}
                    contextName="Precio Especial"
                    isHighPriority={false}
                />

                {/* Table */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="bg-slate-50 dark:bg-slate-900/80 text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-700 text-xs uppercase tracking-wider font-bold">
                                <tr>
                                    <th className="px-6 py-4">Cliente</th>
                                    <th className="px-6 py-4">Producto</th>
                                    <th className="px-6 py-4 text-center">Descuento (%)</th>
                                    <th className="px-6 py-4 text-center">Precio Fijo</th>
                                    <th className="px-6 py-4 text-center">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {isLoadingTable ? (
                                    <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                                        <div className="flex items-center justify-center gap-2"><Loader2 className="w-5 h-5 animate-spin" /> Cargando precios especiales...</div>
                                    </td></tr>
                                ) : filteredPrices.length === 0 ? (
                                    <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                                        {searchTerm ? 'No se encontraron precios que coincidan con la búsqueda.' : 'No hay precios especiales registrados. ¡Agrega el primero!'}
                                    </td></tr>
                                ) : (
                                    filteredPrices.map((price) => (
                                        <tr key={price.id} className="hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-900/50 transition-colors group">
                                            <td className="px-6 py-4">
                                                <p className="text-mh-blue-dark dark:text-white font-bold">{price.clienteNombre}</p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-slate-700 dark:text-slate-300 font-medium text-sm">{price.productoNombre}</span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {price.descuentoPorcentaje > 0 ? (
                                                    <div className="inline-flex items-center justify-center gap-1.5 px-3 py-1 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-full font-bold text-xs">
                                                        <Percent className="w-3.5 h-3.5" />{price.descuentoPorcentaje}%
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-slate-400">—</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {price.precioFijo > 0 ? (
                                                    <div className="inline-flex items-center justify-center gap-1.5 px-3 py-1 bg-blue-50 dark:bg-blue-900/30 text-mh-blue-dark dark:text-blue-400 rounded-full font-bold text-xs">
                                                        <DollarSign className="w-3.5 h-3.5" />${price.precioFijo.toFixed(2)}
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-slate-400">—</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => startEdit(price)}
                                                        className="p-2 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                                                        title="Editar Precio"
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeletePrice(price)}
                                                        className="p-2 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-colors"
                                                        title="Eliminar Precio"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                <AddPrices
                    isOpen={isPriceModalOpen}
                    onClose={handleCloseModal}
                    onSave={editingPriceId ? handleUpdatePrice : handleSavePrice}
                    isLoading={isLoading}
                    editData={editData}
                    recoverData={recoverData}
                    onSaveSuccess={() => {
                        if (recoveringErrorId) {
                            handleDismissError(recoveringErrorId);
                            setRecoveringErrorId(null);
                            setRecoverData(null);
                        }
                    }}
                />
            </div>
        </div>
    );
}
