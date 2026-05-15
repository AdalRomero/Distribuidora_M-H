import { useEffect, useState } from 'react';
import { X, Building2, Contact, Package, Loader2, Plus, Trash2, Search, ChevronDown } from 'lucide-react';
import { database } from '../../../src/services/DB/indexBD';

// ==========================================
// INTERFACES
// ==========================================
export interface SupplierProductRow {
    id: string;
    productoId: string;
    productoNombre: string;
    codigoProveedor: string;
    precioCompra: string;
    tiempoEntregaDias: string;
}

export interface SupplierData {
    nombreComercial: string;
    razonSocial: string;
    rfc: string;
    telefono: string;
    correoContacto: string;
    estado: string;
    productos: SupplierProductRow[];
}

// ==========================================
// SEARCHABLE SELECT (reutilizado del patrón AddClient)
// ==========================================
const SearchableSelect = ({
    options,
    value,
    onChange,
    placeholder,
    searchPlaceholder,
    dropUp = false
}: {
    options: { id: string; label: string; subLabel?: string }[];
    value: string;
    onChange: (val: string) => void;
    placeholder: string;
    searchPlaceholder: string;
    dropUp?: boolean;
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");

    const selectedOption = options.find(o => o.id === value);

    const filteredOptions = options.filter(o =>
        o.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (o.subLabel && o.subLabel.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="relative w-full">
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between gap-3 px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 rounded-md text-xs font-medium text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-blue-500 outline-none transition-all hover:bg-slate-100 dark:hover:bg-slate-800"
            >
                <span className="truncate">{selectedOption ? selectedOption.label : placeholder}</span>
                <ChevronDown className={`w-4 h-4 transition-transform shrink-0 ${isOpen ? "rotate-180" : ""}`} />
            </button>

            {isOpen && (
                <>
                    <div className="fixed inset-0 z-[60]" onClick={() => setIsOpen(false)} />
                    <div className={`absolute ${dropUp ? 'bottom-full mb-1' : 'top-full mt-1'} left-0 right-0 w-full bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 z-[70] overflow-hidden animate-in fade-in ${dropUp ? 'slide-in-from-bottom-1' : 'slide-in-from-top-1'} duration-200`}>
                        <div className="p-2 border-b border-slate-100 dark:border-slate-700">
                            <div className="relative">
                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                                <input
                                    type="text"
                                    className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-900 border-none rounded-lg text-xs outline-none focus:ring-1 focus:ring-blue-500"
                                    placeholder={searchPlaceholder}
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    autoFocus
                                />
                            </div>
                        </div>
                        <div className="max-h-[200px] overflow-y-auto p-1 custom-scrollbar">
                            {filteredOptions.length === 0 ? (
                                <div className="px-3 py-4 text-center text-[10px] text-slate-400">
                                    No se encontraron resultados
                                </div>
                            ) : (
                                filteredOptions.map((opt) => (
                                    <button
                                        key={opt.id}
                                        type="button"
                                        onClick={() => {
                                            onChange(opt.id);
                                            setIsOpen(false);
                                            setSearchTerm("");
                                        }}
                                        className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors mb-0.5 ${value === opt.id ? "bg-blue-50 text-blue-600 dark:bg-blue-900/30" : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50"}`}
                                    >
                                        <div className="flex flex-col">
                                            {opt.subLabel && <span className="text-[10px] opacity-60 font-bold">{opt.subLabel}</span>}
                                            <span className="truncate">{opt.label}</span>
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

// ==========================================
// COMPONENTE PRINCIPAL
// ==========================================
interface AddSupplierProps {
    isOpen: boolean;
    onClose: () => void;
    onSave?: (data: SupplierData) => Promise<void>;
    isLoading?: boolean;
    editData?: SupplierData | null;
}

const initialState: SupplierData = {
    nombreComercial: '',
    razonSocial: '',
    rfc: '',
    telefono: '',
    correoContacto: '',
    estado: 'Activo',
    productos: [],
};

const inputClass = 'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors';

export default function AddSupplier({ isOpen, onClose, onSave, isLoading = false, editData }: AddSupplierProps) {
    const [form, setForm] = useState<SupplierData>(initialState);
    const isEditMode = !!editData;

    // Catálogo de productos para el buscador
    const [productosDisponibles, setProductosDisponibles] = useState<{ id: string; nombre: string; codigo: string }[]>([]);

    // Sync form when editData changes or modal opens
    useEffect(() => {
        if (isOpen && editData) {
            setForm(editData);
        } else if (isOpen && !editData) {
            setForm(initialState);
        }
        if (isOpen) {
            loadProductos();
        }
    }, [isOpen, editData]);

    const loadProductos = async () => {
        try {
            const prodDb = database.collections.get('productos');
            const allProd = await prodDb.query().fetch();
            setProductosDisponibles(allProd.map((p: any) => ({
                id: p.id,
                nombre: p.descripcion,
                codigo: p._raw.codigo_interno || p.codigoInterno || ''
            })));
        } catch (error) {
            console.error('Error al cargar productos:', error);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
    };

    // ==========================================
    // GESTIÓN DE PRODUCTOS OFERTADOS
    // ==========================================
    const addProductRow = () => {
        setForm(prev => ({
            ...prev,
            productos: [...prev.productos, {
                id: Math.random().toString(),
                productoId: '',
                productoNombre: '',
                codigoProveedor: '',
                precioCompra: '',
                tiempoEntregaDias: '',
            }]
        }));
    };

    const removeProductRow = (id: string) => {
        setForm(prev => ({
            ...prev,
            productos: prev.productos.filter(p => p.id !== id)
        }));
    };

    const updateProductRow = (id: string, field: string, value: string) => {
        setForm(prev => ({
            ...prev,
            productos: prev.productos.map(p => {
                if (p.id === id) {
                    const updated = { ...p, [field]: value };
                    if (field === 'productoId') {
                        updated.productoNombre = productosDisponibles.find(pr => pr.id === value)?.nombre || '';
                    }
                    return updated;
                }
                return p;
            })
        }));
    };

    const handleSave = async () => {
        if (!form.nombreComercial.trim()) {
            alert('El nombre comercial es obligatorio.');
            return;
        }
        if (onSave) {
            await onSave(form);
        }
        setForm(initialState);
        onClose();
    };

    const handleClose = () => {
        if (isLoading) return;
        setForm(initialState);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50">
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={handleClose} />
            <div className="fixed inset-0 overflow-y-auto">
                <div className="flex min-h-full items-center justify-center p-4">
                    <div className="w-full max-w-3xl flex flex-col max-h-[90vh] bg-white dark:bg-slate-800 rounded-2xl shadow-xl overflow-hidden relative z-10">

                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shrink-0">
                            <h3 className="text-xl font-bold text-slate-800 dark:text-white">{isEditMode ? 'Editar Proveedor' : 'Agregar Nuevo Proveedor'}</h3>
                            <button onClick={handleClose} disabled={isLoading} className="p-2 text-slate-400 hover:text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 dark:bg-slate-800/50 rounded-lg transition-colors disabled:opacity-50"><X className="w-5 h-5" /></button>
                        </div>

                        {/* Body */}
                        <div className="p-6 bg-slate-50 dark:bg-slate-900/50 overflow-y-auto flex-1">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                                {/* Card 1: Información General */}
                                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 shadow-sm">
                                    <div className="flex items-center gap-2 mb-4"><Building2 className="w-5 h-5 text-blue-800" /><h4 className="font-semibold text-blue-900 text-sm">Información General</h4></div>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nombre Comercial *</label>
                                            <input type="text" name="nombreComercial" value={form.nombreComercial} onChange={handleChange} placeholder="Ej: Harinas del Norte" className={inputClass} required />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Razón Social</label>
                                            <input type="text" name="razonSocial" value={form.razonSocial} onChange={handleChange} placeholder="Ej: Harinas del Norte S.A. de C.V." className={inputClass} />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">RFC</label>
                                            <input type="text" name="rfc" value={form.rfc} onChange={handleChange} placeholder="Ej: HNO850101AAA" className={inputClass} />
                                        </div>
                                    </div>
                                </div>

                                {/* Card 2: Contacto y Estado */}
                                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 shadow-sm">
                                    <div className="flex items-center gap-2 mb-4"><Contact className="w-5 h-5 text-blue-800" /><h4 className="font-semibold text-blue-900 text-sm">Contacto y Estado</h4></div>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Teléfono</label>
                                            <input type="text" name="telefono" value={form.telefono} onChange={handleChange} placeholder="Ej: 555-123-4567" className={inputClass} />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Correo de Contacto</label>
                                            <input type="email" name="correoContacto" value={form.correoContacto} onChange={handleChange} placeholder="Ej: ventas@harinas.com" className={inputClass} />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Estado</label>
                                            <select name="estado" value={form.estado} onChange={handleChange} className={inputClass}>
                                                <option value="Activo">Activo</option>
                                                <option value="Inactivo">Inactivo</option>
                                            </select>
                                            <p className="text-[10px] text-slate-400 mt-1">Los proveedores inactivos no aparecerán en compras nuevas.</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Card 3: Productos que ofrece — full width */}
                                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 shadow-sm md:col-span-2">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-2">
                                            <Package className="w-5 h-5 text-blue-800" />
                                            <h4 className="font-semibold text-blue-900 text-sm">Productos que Ofrece</h4>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={addProductRow}
                                            className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-400 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors border border-blue-200 dark:border-blue-800"
                                        >
                                            <Plus className="w-3 h-3" /> Agregar Producto
                                        </button>
                                    </div>

                                    {form.productos.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center p-8 border border-dashed border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-900/20">
                                            <Package className="w-10 h-10 text-slate-300 dark:text-slate-600 mb-3" />
                                            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Sin productos asignados</p>
                                            <p className="text-xs text-slate-400 mt-1 text-center">Agrega los productos que este proveedor distribuye,<br />incluyendo su precio de compra y tiempo de entrega.</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {/* Encabezados */}
                                            <div className="hidden md:grid md:grid-cols-12 gap-2 px-3 pb-2 border-b border-slate-100 dark:border-slate-700">
                                                <div className="col-span-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Producto</div>
                                                <div className="col-span-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Código Prov.</div>
                                                <div className="col-span-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Precio Compra</div>
                                                <div className="col-span-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Entrega (días)</div>
                                                <div className="col-span-2"></div>
                                            </div>

                                            {form.productos.map((row) => (
                                                <div key={row.id} className="grid grid-cols-1 md:grid-cols-12 gap-2 p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm hover:border-blue-300 dark:hover:border-blue-700 transition-colors items-center">
                                                    {/* Producto select */}
                                                    <div className="md:col-span-4">
                                                        <label className="md:hidden text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Producto</label>
                                                        <SearchableSelect
                                                            options={productosDisponibles.map(p => ({ id: p.id, label: p.nombre, subLabel: p.codigo }))}
                                                            value={row.productoId}
                                                            onChange={(val) => updateProductRow(row.id, 'productoId', val)}
                                                            placeholder="Selecciona producto..."
                                                            searchPlaceholder="Buscar por código o nombre..."
                                                            dropUp={false}
                                                        />
                                                    </div>
                                                    {/* Código proveedor */}
                                                    <div className="md:col-span-2">
                                                        <label className="md:hidden text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Código Prov.</label>
                                                        <input
                                                            type="text"
                                                            value={row.codigoProveedor}
                                                            onChange={(e) => updateProductRow(row.id, 'codigoProveedor', e.target.value)}
                                                            placeholder="SKU-001"
                                                            className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-2 py-2 text-xs text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                                                        />
                                                    </div>
                                                    {/* Precio compra */}
                                                    <div className="md:col-span-2">
                                                        <label className="md:hidden text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Precio Compra</label>
                                                        <div className="flex items-center bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-blue-500">
                                                            <span className="text-[10px] text-slate-500 font-bold pl-2 pr-1">$</span>
                                                            <input
                                                                type="number"
                                                                value={row.precioCompra}
                                                                onChange={(e) => updateProductRow(row.id, 'precioCompra', e.target.value)}
                                                                placeholder="0.00"
                                                                min="0"
                                                                step="0.01"
                                                                className="w-full px-1 py-2 text-xs font-bold bg-transparent outline-none text-slate-800 dark:text-slate-200"
                                                            />
                                                        </div>
                                                    </div>
                                                    {/* Tiempo entrega */}
                                                    <div className="md:col-span-2">
                                                        <label className="md:hidden text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Entrega (días)</label>
                                                        <div className="flex items-center bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-blue-500">
                                                            <input
                                                                type="number"
                                                                value={row.tiempoEntregaDias}
                                                                onChange={(e) => updateProductRow(row.id, 'tiempoEntregaDias', e.target.value)}
                                                                placeholder="0"
                                                                min="0"
                                                                className="w-full px-2 py-2 text-xs font-bold text-center bg-transparent outline-none text-slate-800 dark:text-slate-200"
                                                            />
                                                            <span className="text-[10px] text-slate-500 font-bold pr-2 bg-slate-50 dark:bg-slate-900/50 h-full flex items-center border-l border-slate-200 dark:border-slate-700 px-1.5 py-2">días</span>
                                                        </div>
                                                    </div>
                                                    {/* Eliminar */}
                                                    <div className="md:col-span-2 flex justify-end">
                                                        <button
                                                            type="button"
                                                            onClick={() => removeProductRow(row.id)}
                                                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-md transition-colors"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                            </div>
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shrink-0 flex justify-end gap-3">
                            <button type="button" onClick={handleClose} disabled={isLoading} className="px-6 py-2 rounded-xl text-slate-500 dark:text-slate-400 text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-700 dark:bg-slate-800/50 transition-colors disabled:opacity-50">Cancelar</button>
                            <button type="button" onClick={handleSave} disabled={isLoading} className="px-6 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold transition-all active:scale-95 shadow-md shadow-blue-500/20 disabled:opacity-50 flex items-center gap-2">
                                {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                                {isLoading ? 'Guardando...' : (isEditMode ? 'Actualizar Proveedor' : 'Guardar Proveedor')}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
