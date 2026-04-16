import React, { useState } from 'react';
import withObservables from '@nozbe/with-observables';
import { ArrowLeft, Edit2, Trash2, Calendar, DollarSign, Archive, Plus, RefreshCw } from 'lucide-react';
import ProductoModel from '../../src/services/DB/models/catalogo/producto';
import LoteModel from '../../src/services/DB/models/catalogo/lote';

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

const LoteRow = ({ lote, onEditLote, onToggleEstado }: { lote: LoteModel, onEditLote: (l: LoteModel) => void, onToggleEstado: (l: LoteModel) => void }) => {
    const isExpired = lote.fechaCaducidad && lote.fechaCaducidad < Date.now();
    return (
        <tr className={`hover:bg-slate-50/50 transition-colors group ${!lote.estado ? 'border-l-2 border-l-slate-300 opacity-60 bg-slate-50/30' : isExpired ? 'border-l-2 border-l-rose-500 bg-rose-50/10' : 'border-l-2 border-l-emerald-500'}`}>
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
                    <Calendar className={`w-4 h-4 ${isExpired ? 'text-rose-500' : 'text-slate-400'}`} />
                    <span className={`font-semibold ${isExpired ? 'text-rose-600' : 'text-slate-600'}`}>
                        {formatDate(lote.fechaCaducidad)}
                        {isExpired && <span className="ml-2 text-[10px] font-bold uppercase text-white bg-rose-500 px-1.5 py-0.5 rounded-md">Vencido</span>}
                    </span>
                </div>
            </td>
            <td className="px-6 py-4">
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1.5 w-fit
                    ${lote.estado ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500 border border-slate-200'}`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${lote.estado ? 'bg-emerald-500' : 'bg-slate-400'}`}></div>
                    {lote.estado ? 'Activo' : 'Inactivo'}
                </span>
            </td>
            <td className="px-6 py-4 text-center">
                <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
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
}))(LoteRow);

function ProductLotsViewInner({ producto, lotes, onBack, onEditLote, onToggleEstado, onEditProduct }: Props) {
    // Sort: active first, inactive last
    const sortedLotes = [...lotes].sort((a, b) => {
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

            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-slate-50 text-slate-500 font-semibold border-y border-slate-100">
                        <tr>
                            <th className="px-6 py-4">Identificador de Lote</th>
                            <th className="px-6 py-4">Cantidad</th>
                            <th className="px-6 py-4">Costo de Adquisición</th>
                            <th className="px-6 py-4">Fecha de Caducidad</th>
                            <th className="px-6 py-4">Estado</th>
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
                                onEditLote={onEditLote}
                                onToggleEstado={onToggleEstado}
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
