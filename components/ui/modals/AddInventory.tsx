import { X, UploadCloud, Info, DollarSign, Package, Calendar, ImagesIcon } from 'lucide-react';

interface AddInventoryProps { isOpen: boolean; onClose: () => void; }

export default function AddInventory({ isOpen, onClose }: AddInventoryProps) {
    if (!isOpen) return null;

    const inputClass = "w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400";
    const selectClass = "w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all text-slate-600";

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={onClose}></div>
            <div className="relative z-10 bg-slate-50 w-full max-w-5xl max-h-[95vh] flex flex-col rounded-3xl shadow-2xl overflow-hidden">

                {/* Header */}
                <div className="bg-white px-8 py-5 flex items-center justify-between border-b border-slate-100 shrink-0">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800">Agregar Nuevo Producto</h2>
                        <p className="text-sm text-slate-500 mt-1">Completa los datos para registrar un elemento en el stock</p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"><X className="w-6 h-6" /></button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    <form className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                        {/* LEFT COLUMN */}
                        <div className="space-y-6">
                            {/* Información General */}
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-5">
                                <div className="flex items-center gap-2 mb-4 border-b border-slate-50 pb-3">
                                    <Info className="w-5 h-5 text-blue-600" /><h3 className="text-base font-bold text-slate-700">Información General</h3>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Nombre del Producto *</label>
                                    <input type="text" className={inputClass} placeholder="Ej. Harina Selecta Alta Proteína 25kg" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Familia *</label>
                                        <select className={selectClass}><option value="">Selecciona...</option><option value="harinas">Harinas</option><option value="colorantes">Colorantes</option><option value="saborizantes">Saborizantes</option><option value="chocolates">Chocolates</option><option value="levaduras">Levaduras</option></select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Código Interno *</label>
                                        <input type="text" className={inputClass} placeholder="Ej. 14-001" />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Código Alterno *</label>
                                        <input type="text" className={inputClass} placeholder="Ej. Codigo de Barras" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Categoría de Margen</label>
                                    <div className="grid grid-cols-2 gap-3 mt-1">
                                        {['Margen Ideal', 'De Servicio', 'Margen Alto', 'Margen Bajo'].map((margen) => (
                                            <label key={margen} className="flex items-center gap-2 p-3 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
                                                <input type="radio" name="margen" value={margen} className="text-blue-600 focus:ring-blue-500" /><span className="text-sm text-slate-600 font-medium">{margen}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Fotografía */}
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                                <div className="flex items-center gap-2 mb-4 border-b border-slate-50 pb-3">
                                    <ImagesIcon className="w-5 h-5 text-teal-400" /><h3 className="text-base font-bold text-slate-700">Fotografía del Producto</h3>
                                </div>
                                <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 flex flex-col items-center justify-center text-center hover:bg-slate-50 hover:border-blue-400 transition-all cursor-pointer group">
                                    <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform"><UploadCloud className="w-6 h-6" /></div>
                                    <p className="text-sm font-medium text-slate-700">Haz clic para subir o arrastra la imagen</p>
                                    <p className="text-xs text-slate-400 mt-1">PNG, JPG o WEBP (Max. 2MB)</p>
                                </div>
                            </div>
                        </div>

                        {/* RIGHT COLUMN */}
                        <div className="space-y-6">
                            {/* Inventario y Lotes */}
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-5">
                                <div className="flex items-center gap-2 mb-4 border-b border-slate-50 pb-3">
                                    <Package className="w-5 h-5 text-rose-500" /><h3 className="text-base font-bold text-slate-700">Inventario y Control de Lotes</h3>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="col-span-2 sm:col-span-1">
                                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Almacén de Entrada *</label>
                                        <select className={selectClass}><option value="">Selecciona...</option><option value="central">Bodega Central</option><option value="estante-a">Estante A (Mostrador)</option><option value="estante-b">Estante B (Mostrador)</option><option value="fria">Bodega Fría</option></select>
                                    </div>
                                    <div className="col-span-2 sm:col-span-1">
                                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Lote *</label>
                                        <input type="text" className={inputClass} placeholder="Identificador de lote" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Existencia Inicial *</label>
                                        <input type="number" min="0" onKeyDown={(e) => { if (e.key === '-') e.preventDefault(); }} className={inputClass} placeholder="0" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Margen mínimo *</label>
                                        <input type="number" min="0" onKeyDown={(e) => { if (e.key === '-') e.preventDefault(); }} className={inputClass} placeholder="Ej. 8" />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Unidad de Medida *</label>
                                        <select className={selectClass}><option value="pzas">Piezas (pzas)</option><option value="kg">Kilogramos (kg)</option><option value="litros">Litros (L)</option><option value="cajas">Cajas</option><option value="bultos">Bultos</option><option value="galones">Galones</option></select>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-2"><Calendar className="w-4 h-4 text-slate-400" />Fecha de Caducidad</label>
                                    <input type="date" className={`${inputClass} text-slate-600`} />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <button type="button" onClick={() => alert('Aviso Programado')} className="w-full px-3 py-2.5 rounded-xl font-medium text-sm text-white bg-yellow-400 hover:bg-yellow-500 shadow-md shadow-yellow-500/20 active:scale-95 transition-all">Avisame 3 meses antes</button>
                                    <button type="button" onClick={() => alert('Aviso Programado')} className="w-full px-3 py-2.5 rounded-xl font-medium text-sm text-white bg-red-700 hover:bg-red-800 shadow-md shadow-red-500/20 active:scale-95 transition-all">Avisame 1 mes antes</button>
                                </div>
                            </div>

                            {/* Fiscal y Finanzas */}
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-5">
                                <div className="flex items-center gap-2 mb-4 border-b border-slate-50 pb-3">
                                    <DollarSign className="w-5 h-5 text-emerald-500" /><h3 className="text-base font-bold text-slate-700">Fiscal y Finanzas</h3>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Costo Promedio *</label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><span className="text-slate-400 sm:text-sm">$</span></div>
                                            <input type="number" step="0.01" min="0" onKeyDown={(e) => { if (e.key === '-') e.preventDefault(); }} className="w-full pl-8 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all placeholder:text-slate-400" placeholder="0.00" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Clave SAT</label>
                                        <input type="text" className={inputClass} placeholder="Ej. 50121500" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Impuestos Aplicables</label>
                                    <div className="grid grid-cols-2 gap-4">
                                        <label className="flex items-center gap-2 bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-200 cursor-pointer hover:border-blue-400 transition-colors">
                                            <input type="checkbox" className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4" /><span className="text-sm font-medium text-slate-700">Aplica IVA (16%)</span>
                                        </label>
                                        <label className="flex items-center gap-2 bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-200 cursor-pointer hover:border-blue-400 transition-colors">
                                            <input type="checkbox" className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4" /><span className="text-sm font-medium text-slate-700">Aplica IEPS (8%)</span>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </form>
                </div>

                {/* Footer */}
                <div className="bg-white border-t border-slate-100 p-5 px-8 shrink-0 flex items-center justify-end gap-3 rounded-b-3xl">
                    <button type="button" onClick={onClose} className="px-6 py-2.5 rounded-xl font-medium text-sm text-slate-500 hover:bg-slate-100 transition-colors">Cancelar</button>
                    <button type="button" onClick={onClose} className="px-6 py-2.5 rounded-xl font-medium text-sm text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/20 active:scale-95 transition-all">Guardar Producto</button>
                </div>
            </div>
        </div>
    );
}
