import React, { useState } from 'react';
import withObservables from '@nozbe/with-observables';
import { ArrowLeft, Edit2, Trash2, Calendar, DollarSign, Archive, Plus, RefreshCw, Search, Filter, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import ProductoModel from '../../src/services/DB/models/catalogo/producto';
import LoteModel from '../../src/services/DB/models/catalogo/lote';
import { calculateAlertLevel, AlertLevel } from './ProductRow';

const ACKNOWLEDGED_LOTS_KEY = "dist_mh_acknowledged_lots";

interface Props {
    producto: ProductoModel;
    lotes: LoteModel[];
    onBack: () => void;
    onEditLote: (lote: LoteModel) => void;
    onToggleEstado: (lote: LoteModel) => void;
    onEditProduct?: () => void;
}

const formatDate = (timestamp: number | null | undefined) => {
    if (!timestamp) return 'Sin fecha';
    return new Date(timestamp).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
};

const LoteRow = ({ lote, producto, onEditLote, onToggleEstado, onAcknowledge, acknowledgedIds }: { 
    lote: LoteModel, 
    producto: ProductoModel, 
    onEditLote: (l: LoteModel) => void, 
    onToggleEstado: (l: LoteModel) => void,
    onAcknowledge: (id: string) => void,
    acknowledgedIds: string[]
}) => {
    const { level, daysRemaining } = calculateAlertLevel(
        lote.fechaCaducidad,
        producto.umbralVerdeDias ?? 90,
        producto.umbralAmarilloDias ?? 30
    );
    
    const isAcknowledged = acknowledgedIds.includes(lote.id);
    // Solo quitamos el color negro de vencido si ya está enterado
    // Los otros colores (rojo, amarillo, verde) deben permanecer para dar vida al diseño
    const effectiveLevel = (isAcknowledged && level === 'black') ? 'none' : level;

    const isExpired = level === 'black';

    const getAlertColor = (lvl: string) => {
        switch (lvl) {
            case 'green': return 'bg-emerald-500 shadow-md shadow-emerald-200';
            case 'yellow': return 'bg-amber-400 shadow-md shadow-amber-200';
            case 'red': return 'bg-rose-500 shadow-md shadow-rose-200';
            case 'black': return 'bg-slate-950 shadow-md shadow-slate-400';
            default: return 'bg-slate-300';
        }
    };

    const getAlertTextColor = (lvl: string) => {
        switch (lvl) {
            case 'green': return 'text-emerald-700';
            case 'yellow': return 'text-amber-700';
            case 'red': return 'text-rose-700';
            case 'black': return 'text-slate-950';
            default: return 'text-slate-500';
        }
    };
    return (
        <tr className={`hover:bg-slate-50/50 transition-colors group ${!lote.estado ? 'border-l-4 border-l-slate-300 opacity-60 bg-slate-50/30' : level === 'black' ? (isAcknowledged ? 'border-l-4 border-l-slate-400 bg-slate-50/50' : 'border-l-4 border-l-slate-900 bg-slate-900/[0.02]') : level === 'red' ? 'border-l-4 border-l-rose-500 bg-rose-50/30' : level === 'yellow' ? 'border-l-4 border-l-amber-400 bg-amber-50/30' : 'border-l-4 border-l-emerald-500 bg-emerald-50/20'}`}>
            <td className="px-6 py-4">
                <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800 tracking-wide">{lote.identificadorLote}</span>
                </div>
            </td>
            <td className="px-6 py-4">
                <div className="flex items-center font-bold text-blue-600">
                    {lote.cantidad !== undefined && lote.cantidad !== null ? lote.cantidad : '-'} <span className="text-[10px] text-slate-400 ml-1 font-medium">{lote.unidadMedida}</span>
                </div>
            </td>
            <td className="px-6 py-4">
                <div className="flex items-center gap-1.5 font-medium text-slate-700">
                    <DollarSign className="w-3.5 h-3.5 text-slate-400" />
                    ${(lote.costoAdquisicion || 0).toFixed(2)}
                </div>
            </td>
            <td className="px-6 py-4">
                <div className="flex items-center gap-2">
                    <Calendar className={`w-4 h-4 ${level === 'black' ? 'text-slate-900' : level === 'red' ? 'text-rose-500' : level === 'yellow' ? 'text-amber-500' : 'text-emerald-500'}`} />
                    <span className={`font-semibold ${level === 'black' ? 'text-slate-900' : level === 'red' ? 'text-rose-600' : level === 'yellow' ? 'text-amber-600' : 'text-emerald-600'}`}>
                        {formatDate(lote.fechaCaducidad)}
                    </span>
                </div>
            </td>
            <td className="px-6 py-4">
            <td className="px-6 py-4">
                <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${getAlertColor(effectiveLevel)}`}></div>
                    <span className={`text-xs font-extrabold ${getAlertTextColor(effectiveLevel)}`}>
                        {level === 'black' ? 'Vencido' : `${daysRemaining} días`}
                    </span>
                </div>
            </td>
            </td>

            <td className="px-6 py-4 text-center">
                <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    {(level === 'black' || level === 'red') && (
                        <button 
                            onClick={() => onAcknowledge(lote.id)} 
                            className={`p-2 rounded-xl transition-all ${isAcknowledged ? 'text-emerald-600 bg-emerald-50' : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'}`}
                            title={isAcknowledged ? "Marcar como no revisado" : "Marcar como revisado (Enterado)"}
                        >
                            {isAcknowledged ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                    )}
                    <button onClick={() => onEditLote(lote)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all" title="Editar Lote">
                        <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => onToggleEstado(lote)} className={`p-2 rounded-xl transition-all ${lote.estado ? 'text-slate-400 hover:text-amber-600 hover:bg-amber-50' : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'}`} title={lote.estado ? "Desactivar Lote" : "Añadir a disponibles"}>
                        {lote.estado ? <Trash2 className="w-4 h-4" /> : <RefreshCw className="w-4 h-4" />}
                    </button>
                </div>
            </td>
        </tr>
    );
};

const EnhancedLoteRow = withObservables(['lote'], ({ lote }: { lote: LoteModel }) => ({
    lote: lote.observe(),
}))(({ lote, producto, onEditLote, onToggleEstado, onAcknowledge, acknowledgedIds }: { 
    lote: LoteModel, 
    producto: ProductoModel, 
    onEditLote: (l: LoteModel) => void, 
    onToggleEstado: (l: LoteModel) => void,
    onAcknowledge: (id: string) => void,
    acknowledgedIds: string[]
}) => (
    <LoteRow 
        lote={lote} 
        producto={producto} 
        onEditLote={onEditLote} 
        onToggleEstado={onToggleEstado} 
        onAcknowledge={onAcknowledge}
        acknowledgedIds={acknowledgedIds}
    />
));

function ProductLotsViewInner({ producto, lotes, onBack, onEditLote, onToggleEstado, onEditProduct }: Props) {
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedFilters, setSelectedFilters] = useState<AlertLevel[]>([]);
    const [acknowledgedIds, setAcknowledgedIds] = useState<string[]>(() => {
        try {
            const stored = localStorage.getItem(ACKNOWLEDGED_LOTS_KEY);
            return stored ? JSON.parse(stored) : [];
        } catch (e) {
            return [];
        }
    });

    const handleAcknowledge = (id: string) => {
        setAcknowledgedIds(prev => {
            const newValue = prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id];
            localStorage.setItem(ACKNOWLEDGED_LOTS_KEY, JSON.stringify(newValue));
            return newValue;
        });
    };

    const toggleFilter = (filter: AlertLevel) => {
        setSelectedFilters(prev => 
            prev.includes(filter) ? prev.filter(f => f !== filter) : [...prev, filter]
        );
    };

    const filteredLotes = lotes.filter(l => {
        const matchesSearch = l.identificadorLote.toLowerCase().includes(searchTerm.toLowerCase());
        
        const { level } = calculateAlertLevel(
            l.fechaCaducidad,
            producto.umbralVerdeDias ?? 90,
            producto.umbralAmarilloDias ?? 30
        );
        
        const matchesFilter = selectedFilters.length === 0 || selectedFilters.includes(level);
        
        return matchesSearch && matchesFilter;
    });

    // Sort: active first, inactive last
    const sortedLotes = [...filteredLotes].sort((a, b) => {
        if (a.estado === b.estado) return 0;
        return a.estado ? -1 : 1;
    });

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 animate-in slide-in-from-right-4 duration-300">
            <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-4">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors">
                        <ArrowLeft className="w-5 h-5 text-slate-600" />
                    </button>
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">Lotes y Origen: {producto.descripcion}</h2>
                        <p className="text-slate-500 text-sm font-medium mt-1">Ref: {producto.codigoInterno}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {onEditProduct && (
                        <button onClick={onEditProduct} className="flex items-center gap-2 px-4 py-2 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 rounded-xl transition-all font-medium text-sm">
                            <Edit2 className="w-4 h-4" /><span>Editar Producto</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Toolbar: Search and Filter */}
            <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Buscar por identificador de lote..."
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm font-medium"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex p-1 bg-slate-100 rounded-xl">
                        {(['black', 'red', 'yellow', 'green'] as AlertLevel[]).map(level => (
                            <button
                                key={level}
                                onClick={() => toggleFilter(level)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5
                                    ${selectedFilters.includes(level) 
                                        ? level === 'black' ? 'bg-slate-900 text-white shadow-sm' :
                                          level === 'red' ? 'bg-rose-500 text-white shadow-sm' :
                                          level === 'yellow' ? 'bg-amber-400 text-slate-900 shadow-sm' :
                                          'bg-emerald-500 text-white shadow-sm'
                                        : 'text-slate-500 hover:bg-slate-200'}`}
                            >
                                <div className={`w-2 h-2 rounded-full ${
                                    level === 'black' ? 'bg-slate-900' :
                                    level === 'red' ? 'bg-rose-500' :
                                    level === 'yellow' ? 'bg-amber-400' :
                                    'bg-emerald-500'
                                } ${selectedFilters.includes(level) ? 'ring-2 ring-white/50' : ''}`} />
                                {level === 'black' ? 'Vencidos' : 
                                 level === 'red' ? 'Crítico' : 
                                 level === 'yellow' ? 'Próximos' : 'Al día'}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-slate-50 text-slate-500 font-semibold border-y border-slate-100">
                        <tr>
                            <th className="px-6 py-4">Identificador de Lote</th>
                            <th className="px-6 py-4">Cantidad</th>
                            <th className="px-6 py-4">Costo de Adquisición</th>
                            <th className="px-6 py-4">Fecha de Caducidad</th>
                            <th className="px-6 py-4">Días / Alerta</th>
                            <th className="px-6 py-4 text-center">Gestión</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {lotes.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-6 py-16 text-center">
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center">
                                            <Archive className="w-8 h-8 text-slate-300" />
                                        </div>
                                        <div>
                                            <p className="text-slate-600 font-medium text-base">No hay lotes para este producto</p>
                                            <p className="text-slate-400 text-sm mt-1">Registra la entrada para comenzar a gestionar sus lotes.</p>
                                        </div>
                                    </div>
                                </td>
                            </tr>
                        ) : sortedLotes.map((lote) => (
                            <EnhancedLoteRow
                                key={lote.id}
                                lote={lote}
                                producto={producto}
                                onEditLote={onEditLote}
                                onToggleEstado={onToggleEstado}
                                onAcknowledge={handleAcknowledge}
                                acknowledgedIds={acknowledgedIds}
                            />
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

const enhance = withObservables(['producto'], ({ producto }: { producto: ProductoModel }) => ({
    producto: producto.observe(),
    lotes: producto.lotes.observe(),
}));

export default enhance(ProductLotsViewInner);
