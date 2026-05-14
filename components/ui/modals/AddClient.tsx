import { useEffect, useState } from 'react';
import { X, Building2, Tags, Contact, MapPin, Loader2, Plus, Trash2, ChevronDown, Search } from 'lucide-react';

export interface DiscountRule {
    id: string;
    type: 'global' | 'familia' | 'producto';
    targetId: string;
    targetName: string;
    percentage: string;
}

export interface ClientData {
    nombre: string;
    rfc: string;
    categoria: string;
    listaPrecios: string;
    descuentoGlobal: string; // kept for legacy if needed, or we can just use rules
    discountRules: DiscountRule[];
    contactos: string[];
    estado: string;
    calle: string;
    colonia: string;
    cp: string;
    ciudad: string;
}

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

interface AddClientProps {
    isOpen: boolean;
    onClose: () => void;
    onSave?: (data: ClientData) => Promise<void>;
    isLoading?: boolean;
    /** If provided, the modal opens in edit mode with pre-filled fields */
    editData?: ClientData | null;
}

interface Categoria {
    id: string;
    nombre: string;
}

import { database } from '../../../src/services/DB/indexBD';

const initialState: ClientData = {
    nombre: '',
    rfc: '',
    categoria: '',
    listaPrecios: '',
    descuentoGlobal: '0',
    discountRules: [],
    contactos: [''],
    estado: 'Activo',
    calle: '',
    colonia: '',
    cp: '',
    ciudad: '',
};

const inputClass = 'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors';

export default function AddClient({ isOpen, onClose, onSave, isLoading = false, editData }: AddClientProps) {
    const [form, setForm] = useState<ClientData>(initialState);
    const isEditMode = !!editData;

    const [categorias, setCategorias] = useState<Categoria[]>([]);
    const [isAddingCategory, setIsAddingCategory] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [isLoadingCategories, setIsLoadingCategories] = useState(false);

    // New Price List state
    const [isAddingPriceList, setIsAddingPriceList] = useState(false);
    const [newPriceListName, setNewPriceListName] = useState('');
    const [customPriceLists, setCustomPriceLists] = useState<string[]>([]);

    // Sync form when editData changes or modal opens
    useEffect(() => {
        if (isOpen && editData) {
            setForm(editData);
        } else if (isOpen && !editData) {
            setForm(initialState);
        }
        if (isOpen) {
            loadCategorias();
        }
    }, [isOpen, editData]);

    const loadCategorias = async () => {
        setIsLoadingCategories(true);
        try {
            const catDb = database.collections.get('categorias_clientes');
            const allCats = await catDb.query().fetch();
            setCategorias(allCats.map((c: any) => ({ id: c.id, nombre: c.nombre })));
        } catch (error) {
            console.error('Error al cargar categorías:', error);
        } finally {
            setIsLoadingCategories(false);
        }
    };

    const handleAddCategory = async () => {
        if (!newCategoryName.trim()) return;
        try {
            const catDb = database.collections.get('categorias_clientes');
            let newId = '';
            await database.write(async () => {
                const newCat = await catDb.create((record: any) => {
                    record.nombre = newCategoryName.trim();
                    record.estado = true;
                });
                newId = newCat.id;
            });
            setCategorias(prev => [...prev, { id: newId, nombre: newCategoryName.trim() }]);
            setForm(prev => ({ ...prev, categoria: newCategoryName.trim() }));
            setIsAddingCategory(false);
            setNewCategoryName('');
        } catch (error) {
            console.error('Error al crear categoría:', error);
        }
    };

    const handleAddPriceList = () => {
        if (!newPriceListName.trim()) return;
        const name = newPriceListName.trim();
        setCustomPriceLists(prev => [...prev, name]);
        setForm(prev => ({ ...prev, listaPrecios: name }));
        setIsAddingPriceList(false);
        setNewPriceListName('');
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
    };

    const handleContactChange = (index: number, value: string) => {
        setForm(prev => {
            const newContactos = [...prev.contactos];
            newContactos[index] = value;
            return { ...prev, contactos: newContactos };
        });
    };

    const addContact = () => {
        if (form.contactos.length < 4) {
            setForm(prev => ({ ...prev, contactos: [...prev.contactos, ''] }));
        }
    };

    const [familias, setFamilias] = useState<{id: string, nombre: string, codigo: string}[]>([]);
    const [productos, setProductos] = useState<{id: string, nombre: string, codigo: string}[]>([]);

    useEffect(() => {
        if (isOpen) {
            loadCategorias();
            loadFamiliasYProductos();
        }
    }, [isOpen, editData]);

    const loadFamiliasYProductos = async () => {
        try {
            const famDb = database.collections.get('familias');
            const prodDb = database.collections.get('productos');
            const [allFam, allProd] = await Promise.all([
                famDb.query().fetch(),
                prodDb.query().fetch()
            ]);
            setFamilias(allFam.map((f: any) => ({ id: f.id, nombre: f.nombre, codigo: f._raw.codigoFamilia || '' })));
            setProductos(allProd.map((p: any) => ({ id: p.id, nombre: p.descripcion, codigo: p._raw.codigoInterno || '' })));
        } catch (error) {
            console.error('Error loading catalogos:', error);
        }
    };

    const addDiscountRule = () => {
        setForm(prev => ({
            ...prev,
            discountRules: [...(prev.discountRules || []), {
                id: Math.random().toString(),
                type: 'global',
                targetId: '',
                targetName: '',
                percentage: '0'
            }]
        }));
    };

    const removeDiscountRule = (id: string) => {
        setForm(prev => ({
            ...prev,
            discountRules: (prev.discountRules || []).filter(r => r.id !== id)
        }));
    };

    const updateDiscountRule = (id: string, field: string, value: string) => {
        setForm(prev => ({
            ...prev,
            discountRules: (prev.discountRules || []).map(r => {
                if (r.id === id) {
                    const newRule = { ...r, [field]: value };
                    if (field === 'type') {
                        newRule.targetId = '';
                        newRule.targetName = '';
                    }
                    if (field === 'targetId') {
                        if (newRule.type === 'familia') {
                            newRule.targetName = familias.find(f => f.id === value)?.nombre || '';
                        } else if (newRule.type === 'producto') {
                            newRule.targetName = productos.find(p => p.id === value)?.nombre || '';
                        }
                    }
                    return newRule as typeof r;
                }
                return r;
            })
        }));
    };

    const removeContact = (index: number) => {
        setForm(prev => ({
            ...prev,
            contactos: prev.contactos.filter((_, i) => i !== index)
        }));
    };

    const handleSave = async () => {
        if (!form.nombre.trim()) {
            alert('El nombre o razón social es obligatorio.');
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
                            <h3 className="text-xl font-bold text-slate-800 dark:text-white">{isEditMode ? 'Editar Cliente' : 'Agregar Nuevo Cliente'}</h3>
                            <button onClick={handleClose} disabled={isLoading} className="p-2 text-slate-400 hover:text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 dark:bg-slate-800/50 rounded-lg transition-colors disabled:opacity-50"><X className="w-5 h-5" /></button>
                        </div>

                        {/* Body */}
                        <div className="p-6 bg-slate-50 dark:bg-slate-900/50 overflow-y-auto flex-1">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                                {/* Card 1: Información General */}
                                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 shadow-sm">
                                    <div className="flex items-center gap-2 mb-4"><Building2 className="w-5 h-5 text-blue-800" /><h4 className="font-semibold text-blue-900 text-sm">Información General</h4></div>
                                    <div className="space-y-4">
                                        <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nombre / Razón Social *</label><input type="text" name="nombre" value={form.nombre} onChange={handleChange} placeholder="Ej: Panadería La Esperanza" className={inputClass} required /></div>
                                        <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">RFC o Identificador</label><input type="text" name="rfc" value={form.rfc} onChange={handleChange} placeholder="Ej: XAXX010101000" className={inputClass} /></div>
                                    </div>
                                </div>

                                {/* Card 2: Dirección (Moved up) */}
                                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 shadow-sm">
                                    <div className="flex items-center gap-2 mb-4"><MapPin className="w-5 h-5 text-blue-800" /><h4 className="font-semibold text-blue-900 text-sm">Dirección</h4></div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="col-span-2"><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Calle</label><input type="text" name="calle" value={form.calle} onChange={handleChange} placeholder="Calle y número" className={inputClass} /></div>
                                        <div className="col-span-2"><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Colonia</label><input type="text" name="colonia" value={form.colonia} onChange={handleChange} placeholder="Colonia" className={inputClass} /></div>
                                        <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">C.P.</label><input type="text" name="cp" value={form.cp} onChange={handleChange} placeholder="CP" className={inputClass} /></div>
                                        <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Ciudad</label><input type="text" name="ciudad" value={form.ciudad} onChange={handleChange} placeholder="Ciudad" className={inputClass} /></div>
                                    </div>
                                </div>

                                {/* Card 3: Contacto y Estado */}
                                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 shadow-sm md:col-span-2">
                                    <div className="flex items-center gap-2 mb-4"><Contact className="w-5 h-5 text-blue-800" /><h4 className="font-semibold text-blue-900 text-sm">Contacto y Estado</h4></div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <div className="flex items-center justify-between mb-2">
                                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Teléfono / Correo de contacto (Max 4)</label>
                                                {form.contactos.length < 4 && (
                                                    <button type="button" onClick={addContact} className="text-blue-600 hover:text-blue-700 dark:text-blue-400 text-xs font-medium flex items-center gap-1">
                                                        <Plus className="w-3 h-3" /> Agregar
                                                    </button>
                                                )}
                                            </div>
                                            <div className="space-y-3">
                                                {form.contactos.map((contacto, idx) => (
                                                    <div key={idx} className="flex items-center gap-2">
                                                        <input type="text" value={contacto} onChange={(e) => handleContactChange(idx, e.target.value)} placeholder="Ej: 555-123-4567 o cliente@email.com" className={inputClass} />
                                                        {form.contactos.length > 1 && (
                                                            <button type="button" onClick={() => removeContact(idx)} className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-colors">
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Estado</label>
                                            <select name="estado" value={form.estado} onChange={handleChange} className={inputClass}>
                                                <option value="Activo">Activo</option>
                                                <option value="Inactivo">Inactivo</option>
                                            </select>
                                            <p className="text-[10px] text-slate-400 mt-1">Los clientes inactivos no aparecerán en las ventas nuevas.</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Card 4: Clasificación Comercial y Precios (Moved to end) */}
                                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 shadow-sm md:col-span-2">
                                    <div className="flex items-center gap-2 mb-4"><Tags className="w-5 h-5 text-blue-800" /><h4 className="font-semibold text-blue-900 text-sm">Clasificación Comercial y Precios</h4></div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Categoría de Cliente</label>
                                                {!isAddingCategory ? (
                                                    <select
                                                        name="categoria"
                                                        value={form.categoria}
                                                        onChange={(e) => {
                                                            if (e.target.value === 'NEW') {
                                                                setIsAddingCategory(true);
                                                            } else {
                                                                setForm(prev => ({ ...prev, categoria: e.target.value }));
                                                            }
                                                        }}
                                                        className={inputClass}
                                                    >
                                                        <option value="" disabled hidden>Selecciona categoría</option>
                                                        <option value="NEW" className="text-blue-600 font-bold">+ Nuevo</option>
                                                        {categorias.map(cat => (
                                                            <option key={cat.id} value={cat.nombre}>{cat.nombre}</option>
                                                        ))}
                                                    </select>
                                                ) : (
                                                    <div className="flex gap-2">
                                                        <input
                                                            type="text"
                                                            autoFocus
                                                            value={newCategoryName}
                                                            onChange={(e) => setNewCategoryName(e.target.value)}
                                                            className="flex-1 border border-slate-300 dark:border-slate-600 dark:bg-slate-900/50 rounded-lg px-3 py-2 text-sm text-slate-700 dark:text-slate-300 bg-white focus:outline-none focus:border-blue-500"
                                                            placeholder="Nueva categoría..."
                                                        />
                                                        <button type="button" onClick={handleAddCategory} className="px-3 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold">OK</button>
                                                        <button type="button" onClick={() => setIsAddingCategory(false)} className="px-3 py-2 bg-slate-200 text-slate-600 rounded-lg text-xs font-bold">X</button>
                                                    </div>
                                                )}
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Lista de Precios Asignada</label>
                                                {!isAddingPriceList ? (
                                                    <select 
                                                        name="listaPrecios" 
                                                        value={form.listaPrecios} 
                                                        onChange={(e) => {
                                                            if (e.target.value === 'NEW') {
                                                                setIsAddingPriceList(true);
                                                                setForm(prev => ({ ...prev, discountRules: [] }));
                                                            } else {
                                                                handleChange(e);
                                                            }
                                                        }} 
                                                        className={inputClass}
                                                    >
                                                        <option value="" disabled hidden>Selecciona lista de precios</option>
                                                        <option value="NEW" className="text-blue-600 font-bold">+ Nuevo</option>
                                                        {customPriceLists.map(list => (
                                                            <option key={list} value={list}>{list}</option>
                                                        ))}
                                                    </select>
                                                ) : (
                                                    <div className="flex flex-col gap-3 p-4 bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800/50 rounded-xl">
                                                        <div className="flex items-center justify-between mb-1">
                                                            <p className="text-xs font-bold text-blue-800 dark:text-blue-400">Crear Nueva Lista de Precios</p>
                                                            <button type="button" onClick={() => setIsAddingPriceList(false)} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
                                                        </div>
                                                        
                                                        <div className="flex gap-2">
                                                            <input
                                                                type="text"
                                                                autoFocus
                                                                value={newPriceListName}
                                                                onChange={(e) => setNewPriceListName(e.target.value)}
                                                                className="flex-1 border border-slate-300 dark:border-slate-600 dark:bg-slate-900/50 rounded-lg px-3 py-2 text-sm text-slate-700 dark:text-slate-300 bg-white focus:outline-none focus:border-blue-500"
                                                                placeholder="Nombre de la lista (ej. VIP)"
                                                            />
                                                            <button type="button" onClick={handleAddPriceList} className="px-3 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold shadow-sm">Guardar Lista</button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        
                                        <div className="space-y-4">
                                            {(form.listaPrecios !== '' || isAddingPriceList) ? (
                                                <div className="flex flex-col h-full">
                                                    <div className="flex items-start justify-between mb-1 gap-2">
                                                        <div>
                                                            <label className="block text-sm font-semibold text-slate-800 dark:text-slate-200">Reglas de Excepción</label>
                                                            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Agrega porcentajes específicos a la lista base.</p>
                                                        </div>
                                                        <button type="button" onClick={addDiscountRule} className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-400 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors border border-blue-200 dark:border-blue-800 shrink-0">
                                                            <Plus className="w-3 h-3" /> Agregar
                                                        </button>
                                                    </div>
                                                    
                                                    <div className="space-y-3 mt-2">
                                                        {(!form.discountRules || form.discountRules.length === 0) && (
                                                            <div className="flex flex-col items-center justify-center p-6 border border-dashed border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-900/20">
                                                                <p className="text-xs text-slate-400 text-center">No hay excepciones configuradas.<br/>La lista base aplicará a todos los productos.</p>
                                                            </div>
                                                        )}
                                                        {(form.discountRules || []).map((rule) => (
                                                            <div key={rule.id} className="flex flex-col gap-2 p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm hover:border-blue-300 dark:hover:border-blue-700 transition-colors">
                                                                <div className="flex items-center gap-2">
                                                                    <select 
                                                                        value={rule.type} 
                                                                        onChange={(e) => updateDiscountRule(rule.id, 'type', e.target.value)}
                                                                        className="flex-1 border border-slate-300 dark:border-slate-600 rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                                                                    >
                                                                        <option value="global">Global</option>
                                                                        <option value="familia">Familia</option>
                                                                        <option value="producto">Producto</option>
                                                                    </select>
                                                                    <div className="flex items-center w-20 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-blue-500">
                                                                        <input 
                                                                            type="number" 
                                                                            value={rule.percentage} 
                                                                            onChange={(e) => updateDiscountRule(rule.id, 'percentage', e.target.value)}
                                                                            className="w-full px-2 py-1.5 text-xs font-bold text-center bg-transparent outline-none text-slate-800 dark:text-slate-200"
                                                                            placeholder="%"
                                                                            min="0" max="100"
                                                                        />
                                                                        <span className="text-[10px] text-slate-500 font-bold pr-2 bg-slate-50 dark:bg-slate-900/50 h-full flex items-center border-l border-slate-200 dark:border-slate-700">%</span>
                                                                    </div>
                                                                    <button type="button" onClick={() => removeDiscountRule(rule.id)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-md transition-colors shrink-0">
                                                                        <Trash2 className="w-4 h-4" />
                                                                    </button>
                                                                </div>
                                                                {rule.type === 'familia' && (
                                                                    <div className="mt-0.5">
                                                                        <SearchableSelect
                                                                            options={familias.map(f => ({ id: f.id, label: f.nombre, subLabel: f.codigo }))}
                                                                            value={rule.targetId}
                                                                            onChange={(val) => updateDiscountRule(rule.id, 'targetId', val)}
                                                                            placeholder="Selecciona familia..."
                                                                            searchPlaceholder="Buscar por código o nombre..."
                                                                            dropUp={true}
                                                                        />
                                                                    </div>
                                                                )}
                                                                {rule.type === 'producto' && (
                                                                    <div className="mt-0.5">
                                                                        <SearchableSelect
                                                                            options={productos.map(p => ({ id: p.id, label: p.nombre, subLabel: p.codigo }))}
                                                                            value={rule.targetId}
                                                                            onChange={(val) => updateDiscountRule(rule.id, 'targetId', val)}
                                                                            placeholder="Selecciona producto..."
                                                                            searchPlaceholder="Buscar por código o nombre..."
                                                                            dropUp={true}
                                                                        />
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="h-full flex flex-col items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-6 text-center bg-slate-50/50 dark:bg-slate-900/20">
                                                    <Tags className="w-8 h-8 text-slate-300 dark:text-slate-600 mb-2" />
                                                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Lista de Precios Base</p>
                                                    <p className="text-xs text-slate-500 mt-1">Selecciona una lista para poder agregar excepciones.</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                            </div>
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shrink-0 flex justify-end gap-3">
                            <button type="button" onClick={handleClose} disabled={isLoading} className="px-6 py-2 rounded-xl text-slate-500 dark:text-slate-400 text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-700 dark:bg-slate-800/50 transition-colors disabled:opacity-50">Cancelar</button>
                            <button type="button" onClick={handleSave} disabled={isLoading} className="px-6 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold transition-all active:scale-95 shadow-md shadow-blue-500/20 disabled:opacity-50 flex items-center gap-2">
                                {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                                {isLoading ? 'Guardando...' : (isEditMode ? 'Actualizar Cliente' : 'Guardar Cliente')}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}