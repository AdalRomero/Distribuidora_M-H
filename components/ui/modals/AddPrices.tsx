import { useState, useEffect } from 'react';
import { X, Info, Calculator, Settings } from 'lucide-react';

interface AddPricesProps { isOpen: boolean; onClose: () => void; onSave?: (data: any) => void; recoverData?: any; }

interface PriceListData { nombre: string; moneda: string; precioBase: string; tipoRegla: string; valorRegla: string; estado: string; notas: string; }

const initialState: PriceListData = { nombre: '', moneda: 'MXN', precioBase: '', tipoRegla: 'Precio Base', valorRegla: '', estado: 'Activo', notas: '' };

export default function AddPrices({ isOpen, onClose, onSave, recoverData }: AddPricesProps) {
    const [form, setForm] = useState<PriceListData>(initialState);

    useEffect(() => {
        if (recoverData) {
            setForm({
                nombre: recoverData.nombre || '',
                moneda: recoverData.moneda || 'MXN',
                precioBase: recoverData.precio_base ? String(recoverData.precio_base) : '',
                tipoRegla: recoverData.tipo_regla || 'Precio Base',
                valorRegla: recoverData.valor_regla ? String(recoverData.valor_regla) : '',
                estado: recoverData.estado === false ? 'Inactivo' : 'Activo',
                notas: recoverData.notas || ''
            });
        }
    }, [recoverData]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => { const { name, value } = e.target; setForm(prev => ({ ...prev, [name]: value })); };
    const handleSave = () => { if (!form.nombre.trim()) { alert('El nombre de la lista es obligatorio.'); return; } onSave?.(form); setForm(initialState); onClose(); };
    const handleClose = () => { setForm(initialState); onClose(); };
    const isRuleValueDisabled = form.tipoRegla === 'Precio Base';

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50">
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={handleClose} />
            <div className="fixed inset-0 overflow-y-auto w-full h-full">
                <div className="flex min-h-full items-center justify-center p-4 text-center">
                    <div className="w-full max-w-4xl overflow-hidden rounded-2xl bg-white dark:bg-slate-800 text-left shadow-xl flex flex-col max-h-[90vh] relative z-10">

                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shrink-0">
                            <h3 className="text-xl font-bold text-slate-800 dark:text-white">Nueva Lista de Precios</h3>
                            <button onClick={handleClose} className="p-2 text-slate-400 hover:text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 dark:bg-slate-800/50 rounded-lg transition-colors"><X className="w-5 h-5" /></button>
                        </div>

                        {/* Body */}
                        <div className="p-6 bg-slate-50 dark:bg-slate-900/50 overflow-y-auto flex-1">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                                {/* Card 1: Información General */}
                                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 shadow-sm">
                                    <div className="flex items-center gap-2 mb-4"><Info className="w-5 h-5 text-blue-900 dark:text-blue-400" /><h4 className="font-semibold text-blue-900 dark:text-blue-400">Información General</h4></div>
                                    <div className="space-y-4">
                                        <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nombre de la Lista *</label><input type="text" name="nombre" value={form.nombre} onChange={handleChange} placeholder="Ej: Público General, Mayoreo Nivel 1" className="w-full border border-slate-300 dark:border-slate-600 dark:bg-slate-900/50 rounded-lg px-3 py-2 text-slate-700 dark:text-slate-300 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors" required /></div>
                                        <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Moneda</label><select name="moneda" value={form.moneda} onChange={handleChange} className="w-full border border-slate-300 dark:border-slate-600 dark:bg-slate-900/50 rounded-lg px-3 py-2 text-slate-700 dark:text-slate-300 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors bg-white"><option value="MXN">MXN - Pesos Mexicanos</option><option value="USD">USD - Dólares</option></select></div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Precio Base *</label>
                                            <div className="relative">
                                                <span className="absolute inset-y-0 left-3 flex items-center text-slate-400 text-sm font-medium pointer-events-none">$</span>
                                                <input type="number" name="precioBase" value={form.precioBase} onChange={handleChange} placeholder="0.00" min="0" step="0.01" className="w-full border border-slate-300 dark:border-slate-600 dark:bg-slate-900/50 rounded-lg pl-8 pr-3 py-2 text-slate-700 dark:text-slate-300 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors" />
                                            </div>
                                            <p className="text-xs text-slate-400 mt-1">Precio de referencia antes de aplicar reglas.</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Card 2: Configuración de Regla/Margen */}
                                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 shadow-sm">
                                    <div className="flex items-center gap-2 mb-4"><Calculator className="w-5 h-5 text-blue-900 dark:text-blue-400" /><h4 className="font-semibold text-blue-900 dark:text-blue-400">Configuración de Regla / Margen</h4></div>
                                    <div className="space-y-4">
                                        <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tipo de Regla</label><select name="tipoRegla" value={form.tipoRegla} onChange={handleChange} className="w-full border border-slate-300 dark:border-slate-600 dark:bg-slate-900/50 rounded-lg px-3 py-2 text-slate-700 dark:text-slate-300 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors bg-white"><option value="Precio Base">Precio Base</option><option value="Descuento (%) sobre base">Descuento (%) sobre base</option><option value="Aumento (%) sobre base">Aumento (%) sobre base</option></select></div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Valor de la Regla{isRuleValueDisabled && <span className="ml-2 text-xs text-slate-400">(no aplica)</span>}</label>
                                            <div className="relative">
                                                {!isRuleValueDisabled && <span className="absolute inset-y-0 right-3 flex items-center text-slate-400 text-sm pointer-events-none">%</span>}
                                                <input type="number" name="valorRegla" value={form.valorRegla} onChange={handleChange} placeholder="Ej: 10" min="0" step="0.1" disabled={isRuleValueDisabled} className="w-full border border-slate-300 dark:border-slate-600 dark:bg-slate-900/50 rounded-lg px-3 py-2 text-slate-700 dark:text-slate-300 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors disabled:bg-slate-100 disabled:dark:bg-slate-800 disabled:text-slate-400 disabled:cursor-not-allowed" />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Card 3: Ajustes Adicionales */}
                                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 shadow-sm md:col-span-2">
                                    <div className="flex items-center gap-2 mb-4"><Settings className="w-5 h-5 text-blue-900 dark:text-blue-400" /><h4 className="font-semibold text-blue-900 dark:text-blue-400">Ajustes Adicionales</h4></div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Estado</label><select name="estado" value={form.estado} onChange={handleChange} className="w-full border border-slate-300 dark:border-slate-600 dark:bg-slate-900/50 rounded-lg px-3 py-2 text-slate-700 dark:text-slate-300 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors bg-white"><option value="Activo">Activo</option><option value="Inactivo">Inactivo</option></select></div>
                                        <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Descripción / Notas internas</label><textarea name="notas" value={form.notas} onChange={handleChange} rows={2} placeholder="Agrega una nota interna breve..." className="w-full border border-slate-300 dark:border-slate-600 dark:bg-slate-900/50 rounded-lg px-3 py-2 text-slate-700 dark:text-slate-300 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors resize-none" /></div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shrink-0 flex justify-end gap-3">
                            <button type="button" onClick={handleClose} className="px-6 py-2 rounded-xl text-slate-500 dark:text-slate-400 font-medium hover:bg-slate-100 dark:hover:bg-slate-700 dark:bg-slate-800/50 transition-colors">Cancelar</button>
                            <button type="button" onClick={handleSave} className="px-6 py-2.5 rounded-xl font-medium text-sm text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/20 active:scale-95 transition-all">Guardar Lista</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
