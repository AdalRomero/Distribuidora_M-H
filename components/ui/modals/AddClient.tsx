import { useState } from 'react';
import { X, Building2, Tags, Contact, MapPin } from 'lucide-react';

interface AddClientProps { isOpen: boolean; onClose: () => void; onSave?: (data: any) => void; }

interface ClientData { nombre: string; rfc: string; categoria: string; listaPrecios: string; contacto: string; estado: string; calle: string; colonia: string; cp: string; ciudad: string; }

const initialState: ClientData = { nombre: '', rfc: '', categoria: 'Panadería', listaPrecios: 'Público General', contacto: '', estado: 'Activo', calle: '', colonia: '', cp: '', ciudad: '' };

const inputClass = 'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-700 bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors';

export default function AddClient({ isOpen, onClose, onSave }: AddClientProps) {
    const [form, setForm] = useState<ClientData>(initialState);
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => { const { name, value } = e.target; setForm(prev => ({ ...prev, [name]: value })); };
    const handleSave = () => { if (!form.nombre.trim()) { alert('El nombre o razón social es obligatorio.'); return; } onSave?.(form); setForm(initialState); onClose(); };
    const handleClose = () => { setForm(initialState); onClose(); };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50">
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={handleClose} />
            <div className="fixed inset-0 overflow-y-auto">
                <div className="flex min-h-full items-center justify-center p-4">
                    <div className="w-full max-w-3xl flex flex-col max-h-[90vh] bg-white rounded-2xl shadow-xl overflow-hidden relative z-10">

                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white shrink-0">
                            <h3 className="text-xl font-bold text-slate-800">Agregar Nuevo Cliente</h3>
                            <button onClick={handleClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"><X className="w-5 h-5" /></button>
                        </div>

                        {/* Body */}
                        <div className="p-6 bg-slate-50/50 overflow-y-auto flex-1">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                                {/* Card 1: Información General */}
                                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                                    <div className="flex items-center gap-2 mb-4"><Building2 className="w-5 h-5 text-blue-800" /><h4 className="font-semibold text-blue-900 text-sm">Información General</h4></div>
                                    <div className="space-y-4">
                                        <div><label className="block text-sm font-medium text-slate-700 mb-1">Nombre / Razón Social *</label><input type="text" name="nombre" value={form.nombre} onChange={handleChange} placeholder="Ej: Panadería La Esperanza" className={inputClass} required /></div>
                                        <div><label className="block text-sm font-medium text-slate-700 mb-1">RFC o Identificador</label><input type="text" name="rfc" value={form.rfc} onChange={handleChange} placeholder="Ej: XAXX010101000" className={inputClass} /></div>
                                    </div>
                                </div>

                                {/* Card 2: Clasificación Comercial */}
                                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                                    <div className="flex items-center gap-2 mb-4"><Tags className="w-5 h-5 text-blue-800" /><h4 className="font-semibold text-blue-900 text-sm">Clasificación Comercial</h4></div>
                                    <div className="space-y-4">
                                        <div><label className="block text-sm font-medium text-slate-700 mb-1">Categoría de Cliente</label><select name="categoria" value={form.categoria} onChange={handleChange} className={inputClass}><option>Panadería</option><option>Dulcería</option><option>Abarrotes</option><option>General</option></select></div>
                                        <div><label className="block text-sm font-medium text-slate-700 mb-1">Lista de Precios Asignada</label><select name="listaPrecios" value={form.listaPrecios} onChange={handleChange} className={inputClass}><option>Público General</option><option>Mayoreo Nivel 1</option><option>Especial Franquicias</option></select></div>
                                    </div>
                                </div>

                                {/* Card 3: Dirección */}
                                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm md:col-span-2">
                                    <div className="flex items-center gap-2 mb-4"><MapPin className="w-5 h-5 text-blue-800" /><h4 className="font-semibold text-blue-900 text-sm">Dirección</h4></div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div><label className="block text-sm font-medium text-slate-700 mb-1">Calle</label><input type="text" name="calle" value={form.calle} onChange={handleChange} placeholder="Escriba la dirección" className={inputClass} /></div>
                                        <div><label className="block text-sm font-medium text-slate-700 mb-1">Colonia</label><input type="text" name="colonia" value={form.colonia} onChange={handleChange} placeholder="Escriba la colonia" className={inputClass} /></div>
                                        <div><label className="block text-sm font-medium text-slate-700 mb-1">Código Postal</label><input type="text" name="cp" value={form.cp} onChange={handleChange} placeholder="Escriba el código postal" className={inputClass} /></div>
                                        <div><label className="block text-sm font-medium text-slate-700 mb-1">Ciudad</label><input type="text" name="ciudad" value={form.ciudad} onChange={handleChange} placeholder="Escriba la ciudad" className={inputClass} /></div>
                                    </div>
                                </div>

                                {/* Card 4: Contacto y Estado */}
                                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm md:col-span-2">
                                    <div className="flex items-center gap-2 mb-4"><Contact className="w-5 h-5 text-blue-800" /><h4 className="font-semibold text-blue-900 text-sm">Contacto y Estado</h4></div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div><label className="block text-sm font-medium text-slate-700 mb-1">Teléfono / Correo de contacto</label><input type="text" name="contacto" value={form.contacto} onChange={handleChange} placeholder="Ej: 555-123-4567 o cliente@email.com" className={inputClass} /></div>
                                        <div><label className="block text-sm font-medium text-slate-700 mb-1">Estado</label><select name="estado" value={form.estado} onChange={handleChange} className={inputClass}><option value="Activo">Activo</option><option value="Inactivo">Inactivo</option></select></div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-4 border-t border-slate-200 bg-white shrink-0 flex justify-end gap-3">
                            <button type="button" onClick={handleClose} className="px-6 py-2 rounded-xl text-slate-500 text-sm font-medium hover:bg-slate-100 transition-colors">Cancelar</button>
                            <button type="button" onClick={handleSave} className="px-6 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold transition-all active:scale-95 shadow-md shadow-blue-500/20">Guardar Cliente</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
