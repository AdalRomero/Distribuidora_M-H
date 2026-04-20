import { useState, useEffect } from 'react';
import { X, Info, Calculator, Loader2, Search } from 'lucide-react';
import { database } from '../../../src/services/DB/indexBD';

export interface PriceFormData {
    clienteId: string;
    productoId: string;
    descuentoPorcentaje: string;
    precioFijo: string;
}

interface AddPricesProps {
    isOpen: boolean;
    onClose: () => void;
    onSave?: (data: PriceFormData) => Promise<void>;
    isLoading?: boolean;
    editData?: PriceFormData | null;
    recoverData?: any;
    onSaveSuccess?: () => void;
}

interface SelectOption { id: string; label: string; }

const initialState: PriceFormData = {
    clienteId: '',
    productoId: '',
    descuentoPorcentaje: '0',
    precioFijo: '0',
};

const inputClass = 'w-full border border-slate-300 dark:border-slate-600 dark:bg-slate-900/50 rounded-lg px-3 py-2 text-sm text-slate-700 dark:text-slate-300 bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors';

export default function AddPrices({ isOpen, onClose, onSave, isLoading = false, editData, recoverData, onSaveSuccess }: AddPricesProps) {
    const [form, setForm] = useState<PriceFormData>(initialState);
    const [clientes, setClientes] = useState<SelectOption[]>([]);
    const [productos, setProductos] = useState<SelectOption[]>([]);
    const [loadingOptions, setLoadingOptions] = useState(false);
    const [clientSearch, setClientSearch] = useState('');
    const [productSearch, setProductSearch] = useState('');

    const isEditMode = !!editData;

    // Load clients and products from WatermelonDB when modal opens
    useEffect(() => {
        if (isOpen) {
            loadOptions();
        }
    }, [isOpen]);

    // Sync form with editData or recoverData
    useEffect(() => {
        if (isOpen && editData) {
            setForm(editData);
        } else if (isOpen && recoverData) {
            setForm({
                clienteId: recoverData.cliente_id || recoverData.clienteId || '',
                productoId: recoverData.producto_id || recoverData.productoId || '',
                descuentoPorcentaje: String(recoverData.descuento_porcentaje ?? recoverData.descuentoPorcentaje ?? 0),
                precioFijo: String(recoverData.precio_fijo ?? recoverData.precioFijo ?? 0),
            });
        } else if (isOpen && !editData && !recoverData) {
            setForm(initialState);
        }
    }, [isOpen, editData, recoverData]);

    const loadOptions = async () => {
        setLoadingOptions(true);
        try {
            const clientesDb = database.collections.get('clientes');
            const allClientes = await clientesDb.query().fetch();
            setClientes(allClientes.map((c: any) => ({
                id: c.id,
                label: c.nombre || 'Sin nombre',
            })));

            const productosDb = database.collections.get('productos');
            const allProductos = await productosDb.query().fetch();
            setProductos(allProductos.map((p: any) => ({
                id: p.id,
                label: `${p.codigoInterno || 'S/C'} — ${p.descripcion || 'Sin descripción'}`,
            })));
        } catch (error) {
            console.error('Error al cargar opciones:', error);
        } finally {
            setLoadingOptions(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = async () => {
        if (!form.clienteId) {
            alert('Debes seleccionar un cliente.');
            return;
        }
        if (!form.productoId) {
            alert('Debes seleccionar un producto.');
            return;
        }
        const desc = parseFloat(form.descuentoPorcentaje) || 0;
        const fijo = parseFloat(form.precioFijo) || 0;
        if (desc === 0 && fijo === 0) {
            alert('Debes asignar un descuento porcentual o un precio fijo.');
            return;
        }

        if (onSave) {
            await onSave(form);
        }
        if (onSaveSuccess) onSaveSuccess();
        setForm(initialState);
        setClientSearch('');
        setProductSearch('');
        onClose();
    };

    const handleClose = () => {
        if (isLoading) return;
        setForm(initialState);
        setClientSearch('');
        setProductSearch('');
        onClose();
    };

    // Filtered lists for search
    const filteredClientes = clientes.filter(c =>
        c.label.toLowerCase().includes(clientSearch.toLowerCase())
    );
    const filteredProductos = productos.filter(p =>
        p.label.toLowerCase().includes(productSearch.toLowerCase())
    );

    // Resolve names for display
    const selectedClientName = clientes.find(c => c.id === form.clienteId)?.label || '';
    const selectedProductName = productos.find(p => p.id === form.productoId)?.label || '';

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50">
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={handleClose} />
            <div className="fixed inset-0 overflow-y-auto w-full h-full">
                <div className="flex min-h-full items-center justify-center p-4 text-center">
                    <div className="w-full max-w-3xl overflow-hidden rounded-2xl bg-white dark:bg-slate-800 text-left shadow-xl flex flex-col max-h-[90vh] relative z-10">

                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shrink-0">
                            <h3 className="text-xl font-bold text-slate-800 dark:text-white">
                                {isEditMode ? 'Editar Precio Especial' : 'Nuevo Precio Especial'}
                            </h3>
                            <button onClick={handleClose} disabled={isLoading} className="p-2 text-slate-400 hover:text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 dark:bg-slate-800/50 rounded-lg transition-colors disabled:opacity-50">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-6 bg-slate-50 dark:bg-slate-900/50 overflow-y-auto flex-1">
                            {loadingOptions ? (
                                <div className="flex items-center justify-center py-12 gap-2 text-slate-400">
                                    <Loader2 className="w-5 h-5 animate-spin" /> Cargando clientes y productos...
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                                    {/* Card 1: Selección de Cliente */}
                                    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 shadow-sm">
                                        <div className="flex items-center gap-2 mb-4">
                                            <Info className="w-5 h-5 text-blue-900 dark:text-blue-400" />
                                            <h4 className="font-semibold text-blue-900 dark:text-blue-400 text-sm">Cliente *</h4>
                                        </div>
                                        <div className="space-y-3">
                                            <div className="relative">
                                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                    <Search className="w-4 h-4 text-slate-400" />
                                                </div>
                                                <input
                                                    type="text"
                                                    placeholder="Buscar cliente..."
                                                    value={clientSearch}
                                                    onChange={(e) => setClientSearch(e.target.value)}
                                                    className="w-full pl-9 pr-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-900/50 rounded-lg text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                                                />
                                            </div>
                                            <div className="max-h-40 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-lg divide-y divide-slate-100 dark:divide-slate-700">
                                                {filteredClientes.length === 0 ? (
                                                    <div className="px-3 py-4 text-center text-slate-400 text-xs">No se encontraron clientes.</div>
                                                ) : (
                                                    filteredClientes.map(c => (
                                                        <button
                                                            key={c.id}
                                                            type="button"
                                                            onClick={() => setForm(prev => ({ ...prev, clienteId: c.id }))}
                                                            className={`w-full text-left px-3 py-2.5 text-sm transition-colors ${form.clienteId === c.id
                                                                ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-bold'
                                                                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                                                            }`}
                                                        >
                                                            {c.label}
                                                        </button>
                                                    ))
                                                )}
                                            </div>
                                            {selectedClientName && (
                                                <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold">
                                                    ✓ Seleccionado: {selectedClientName}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Card 2: Selección de Producto */}
                                    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 shadow-sm">
                                        <div className="flex items-center gap-2 mb-4">
                                            <Info className="w-5 h-5 text-blue-900 dark:text-blue-400" />
                                            <h4 className="font-semibold text-blue-900 dark:text-blue-400 text-sm">Producto *</h4>
                                        </div>
                                        <div className="space-y-3">
                                            <div className="relative">
                                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                    <Search className="w-4 h-4 text-slate-400" />
                                                </div>
                                                <input
                                                    type="text"
                                                    placeholder="Buscar producto..."
                                                    value={productSearch}
                                                    onChange={(e) => setProductSearch(e.target.value)}
                                                    className="w-full pl-9 pr-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-900/50 rounded-lg text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                                                />
                                            </div>
                                            <div className="max-h-40 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-lg divide-y divide-slate-100 dark:divide-slate-700">
                                                {filteredProductos.length === 0 ? (
                                                    <div className="px-3 py-4 text-center text-slate-400 text-xs">No se encontraron productos.</div>
                                                ) : (
                                                    filteredProductos.map(p => (
                                                        <button
                                                            key={p.id}
                                                            type="button"
                                                            onClick={() => setForm(prev => ({ ...prev, productoId: p.id }))}
                                                            className={`w-full text-left px-3 py-2.5 text-sm transition-colors ${form.productoId === p.id
                                                                ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-bold'
                                                                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                                                            }`}
                                                        >
                                                            {p.label}
                                                        </button>
                                                    ))
                                                )}
                                            </div>
                                            {selectedProductName && (
                                                <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold">
                                                    ✓ Seleccionado: {selectedProductName}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Card 3: Configuración de Precio */}
                                    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 shadow-sm md:col-span-2">
                                        <div className="flex items-center gap-2 mb-4">
                                            <Calculator className="w-5 h-5 text-blue-900 dark:text-blue-400" />
                                            <h4 className="font-semibold text-blue-900 dark:text-blue-400 text-sm">Configuración de Precio</h4>
                                        </div>
                                        <p className="text-xs text-slate-400 mb-4">
                                            Puedes asignar un descuento porcentual, un precio fijo, o ambos. Al menos uno debe ser mayor a 0.
                                        </p>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Descuento (%)</label>
                                                <div className="relative">
                                                    <input
                                                        type="number"
                                                        name="descuentoPorcentaje"
                                                        value={form.descuentoPorcentaje}
                                                        onChange={handleChange}
                                                        placeholder="Ej: 10"
                                                        min="0"
                                                        max="100"
                                                        step="0.1"
                                                        className={inputClass}
                                                    />
                                                    <span className="absolute inset-y-0 right-3 flex items-center text-slate-400 text-sm pointer-events-none">%</span>
                                                </div>
                                                <p className="text-xs text-slate-400 mt-1">Porcentaje de descuento sobre el precio base del producto.</p>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Precio Fijo</label>
                                                <div className="relative">
                                                    <span className="absolute inset-y-0 left-3 flex items-center text-slate-400 text-sm font-medium pointer-events-none">$</span>
                                                    <input
                                                        type="number"
                                                        name="precioFijo"
                                                        value={form.precioFijo}
                                                        onChange={handleChange}
                                                        placeholder="0.00"
                                                        min="0"
                                                        step="0.01"
                                                        className={`${inputClass} pl-8`}
                                                    />
                                                </div>
                                                <p className="text-xs text-slate-400 mt-1">Precio fijo especial que reemplaza el precio base para este cliente.</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shrink-0 flex justify-end gap-3">
                            <button type="button" onClick={handleClose} disabled={isLoading} className="px-6 py-2 rounded-xl text-slate-500 dark:text-slate-400 font-medium hover:bg-slate-100 dark:hover:bg-slate-700 dark:bg-slate-800/50 transition-colors disabled:opacity-50">
                                Cancelar
                            </button>
                            <button type="button" onClick={handleSave} disabled={isLoading || loadingOptions} className="px-6 py-2.5 rounded-xl font-medium text-sm text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/20 active:scale-95 transition-all disabled:opacity-50 flex items-center gap-2">
                                {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                                {isLoading ? 'Guardando...' : (isEditMode ? 'Actualizar Precio' : 'Guardar Precio')}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
