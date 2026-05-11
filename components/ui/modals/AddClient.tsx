import { useEffect, useState } from 'react';
import { X, Building2, Tags, Contact, MapPin, Loader2, Plus, Trash2 } from 'lucide-react';

export interface ClientData {
    nombre: string;
    rfc: string;
    categoria: string;
    listaPrecios: string;
    descuentoGlobal: string;
    contactos: string[];
    estado: string;
    calle: string;
    colonia: string;
    cp: string;
    ciudad: string;
}

interface AddClientProps {
    isOpen: boolean;
    onClose: () => void;
    onSave?: (data: ClientData) => Promise<void>;
    isLoading?: boolean;
    /** If provided, the modal opens in edit mode with pre-filled fields */
    editData?: ClientData | null;
}

const initialState: ClientData = {
    nombre: '',
    rfc: '',
    categoria: 'General',
    listaPrecios: 'lista',
    descuentoGlobal: '0',
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

    // Sync form when editData changes or modal opens
    useEffect(() => {
        if (isOpen && editData) {
            setForm(editData);
        } else if (isOpen && !editData) {
            setForm(initialState);
        }
    }, [isOpen, editData]);

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

                                {/* Card 2: Clasificación Comercial */}
                                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 shadow-sm">
                                    <div className="flex items-center gap-2 mb-4"><Tags className="w-5 h-5 text-blue-800" /><h4 className="font-semibold text-blue-900 text-sm">Clasificación Comercial</h4></div>
                                    <div className="space-y-4">
                                        <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Categoría de Cliente</label><select name="categoria" value={form.categoria} onChange={handleChange} className={inputClass}><option>General</option><option>Panadería</option><option>Dulcería</option><option>Abarrotes</option></select></div>
                                        <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Lista de Precios Asignada</label><select name="listaPrecios" value={form.listaPrecios} onChange={handleChange} className={inputClass}><option value="lista">Precio Lista</option><option value="mayoreo">Mayoreo</option><option value="menudeo">Menudeo</option></select></div>
                                        <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Descuento Global (%)</label><input type="number" name="descuentoGlobal" value={form.descuentoGlobal} onChange={handleChange} placeholder="0" min="0" max="100" className={inputClass} /></div>
                                    </div>
                                </div>

                                {/* Card 3: Dirección */}
                                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 shadow-sm md:col-span-2">
                                    <div className="flex items-center gap-2 mb-4"><MapPin className="w-5 h-5 text-blue-800" /><h4 className="font-semibold text-blue-900 text-sm">Dirección</h4></div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Calle</label><input type="text" name="calle" value={form.calle} onChange={handleChange} placeholder="Escriba la dirección" className={inputClass} /></div>
                                        <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Colonia</label><input type="text" name="colonia" value={form.colonia} onChange={handleChange} placeholder="Escriba la colonia" className={inputClass} /></div>
                                        <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Código Postal</label><input type="text" name="cp" value={form.cp} onChange={handleChange} placeholder="Escriba el código postal" className={inputClass} /></div>
                                        <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Ciudad</label><input type="text" name="ciudad" value={form.ciudad} onChange={handleChange} placeholder="Escriba la ciudad" className={inputClass} /></div>
                                    </div>
                                </div>

                                {/* Card 4: Contacto y Estado */}
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
                                        <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Estado</label><select name="estado" value={form.estado} onChange={handleChange} className={inputClass}><option value="Activo">Activo</option><option value="Inactivo">Inactivo</option></select></div>
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
