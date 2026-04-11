import React, { useEffect, useState } from 'react';
import { Clock, Edit2, Trash2, Image as ImageIcon, AlertOctagon } from 'lucide-react';
import withObservables from '@nozbe/with-observables';
import { switchMap, map } from 'rxjs/operators';
import { of } from 'rxjs';
import ProductoModel from '../../src/services/DB/models/catalogo/producto';
import FamiliaModel from '../../src/services/DB/models/bases/familia';
import LoteModel from '../../src/services/DB/models/catalogo/lote';
import ProductoImpuestoModel from '../../src/services/DB/models/catalogo/productoImpuesto';
import ImpuestoModel from '../../src/services/DB/models/bases/impuesto';
import { database } from '../../src/services/DB/indexBD';

// ─── Alert Level Types ──────────────────────────────────────
export type AlertLevel = 'green' | 'yellow' | 'red' | 'black' | 'none';

export interface LoteAlert {
    lote: LoteModel;
    level: AlertLevel;
    daysRemaining: number;
}

// ─── Alert Calculation Logic ────────────────────────────────
export function calculateAlertLevel(
    fechaCaducidad: number | null | undefined,
    umbralVerde: number,
    umbralAmarillo: number
): { level: AlertLevel; daysRemaining: number } {
    if (!fechaCaducidad) return { level: 'none', daysRemaining: Infinity };
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expDate = new Date(fechaCaducidad);
    expDate.setHours(0, 0, 0, 0);
    const daysRemaining = Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (daysRemaining <= 0) return { level: 'black', daysRemaining };
    if (daysRemaining <= umbralAmarillo) return { level: 'red', daysRemaining };
    if (daysRemaining <= umbralVerde) return { level: 'yellow', daysRemaining };
    return { level: 'green', daysRemaining };
}

// ─── Alert Badge Styles ─────────────────────────────────────
const alertStyles: Record<AlertLevel, { bg: string; text: string; border: string; icon: string }> = {
    green: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', icon: 'text-emerald-500' },
    yellow: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', icon: 'text-amber-500' },
    red: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', icon: 'text-rose-500' },
    black: { bg: 'bg-gray-900', text: 'text-white', border: 'border-gray-700', icon: 'text-gray-400' },
    none: { bg: 'bg-slate-50', text: 'text-slate-500', border: 'border-slate-200', icon: 'text-slate-400' },
};

const getMarginBadgeStyle = (category: string) => {
    switch (category) {
        case 'Margen Ideal': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
        case 'Margen Alto': return 'bg-purple-100 text-purple-700 border-purple-200';
        case 'De Servicio': return 'bg-slate-100 text-slate-600 border-slate-200';
        default: return 'bg-orange-100 text-orange-700 border-orange-200';
    }
};

// ─── Inner Component (already has observables injected) ─────
interface ProductRowProps {
    producto: ProductoModel;
    familia: FamiliaModel | null;
    lotes: LoteModel[];
    impuestosLinks: ProductoImpuestoModel[];
    stockGlobal: number;
    onDelete: (p: ProductoModel) => void;
}

function ProductRowInner({ producto, familia, lotes, impuestosLinks, stockGlobal, onDelete }: ProductRowProps) {
    const [impuestoNames, setImpuestoNames] = useState<string[]>([]);

    // Fetch actual impuesto names from junction records
    useEffect(() => {
        let cancelled = false;
        async function fetchNames() {
            const names: string[] = [];
            for (const link of impuestosLinks) {
                try {
                    const imp = await link.impuesto.fetch();
                    if (imp && !cancelled) names.push(imp.nombre);
                } catch { /* ignored - may not have permission */ }
            }
            if (!cancelled) setImpuestoNames(names);
        }
        fetchNames();
        return () => { cancelled = true; };
    }, [impuestosLinks]);

    // Calculate worst alert across all lots
    const umbralVerde = familia?.umbralVerdeDias ?? 90;
    const umbralAmarillo = familia?.umbralAmarilloDias ?? 30;

    const loteAlerts: LoteAlert[] = lotes.map(lote => {
        const result = calculateAlertLevel(lote.fechaCaducidad, umbralVerde, umbralAmarillo);
        return { lote, ...result };
    });

    // Find worst alert (black > red > yellow > green > none)
    const priorityOrder: AlertLevel[] = ['black', 'red', 'yellow', 'green', 'none'];
    const worstAlert = loteAlerts.length > 0
        ? loteAlerts.reduce((worst, current) =>
            priorityOrder.indexOf(current.level) < priorityOrder.indexOf(worst.level) ? current : worst
        )
        : null;

    const worstLevel: AlertLevel = worstAlert?.level ?? 'none';
    const style = alertStyles[worstLevel];

    const isLowStock = stockGlobal <= 10;
    const blackLotes = loteAlerts.filter(la => la.level === 'black');

    // Format date nicely
    const formatDate = (timestamp: number | null | undefined) => {
        if (!timestamp) return 'Sin fecha';
        return new Date(timestamp).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    return (
        <tr className="hover:bg-slate-50/50 transition-colors group">
            {/* Producto */}
            <td className="px-6 py-4">
                <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 border overflow-hidden ${worstLevel === 'black' ? 'bg-gray-900 border-gray-700' : worstLevel === 'red' ? 'bg-rose-50 border-rose-200' : 'bg-slate-100 border-slate-200'}`}>
                        {producto.imagen ? (
                            <img src={producto.imagen} alt="Producto" className="w-full h-full object-cover" />
                        ) : (
                            <ImageIcon className={`w-5 h-5 ${worstLevel === 'black' ? 'text-gray-400' : worstLevel === 'red' ? 'text-rose-400' : 'text-slate-400'}`} />
                        )}
                    </div>
                    <div>
                        <p className="text-slate-900 font-bold max-w-xs truncate" title={producto.descripcion}>{producto.descripcion}</p>
                        <p className="text-slate-500 text-xs mt-0.5">{producto.codigoInterno}</p>
                    </div>
                </div>
            </td>

            {/* Clasificación */}
            <td className="px-6 py-4">
                <div>
                    <p className="text-slate-700 font-medium">{familia ? `${familia.codigoFamilia}-${familia.nombre}` : 'Sin Familia'}</p>
                    <span className={`inline-block mt-1 px-2 py-0.5 rounded-md text-[10px] font-bold border uppercase tracking-wider ${getMarginBadgeStyle('Margen Ideal')}`}>Margen Ideal</span>
                </div>
            </td>

            {/* Fiscal y Finanzas */}
            <td className="px-6 py-4">
                <div>
                    <p className="text-slate-800 font-bold">${(producto.precioLista || 0).toFixed(2)}</p>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        {impuestoNames.length > 0 ? impuestoNames.map((name, i) => (
                            <span key={i} className="px-1.5 py-0.5 bg-blue-50 text-blue-600 text-[10px] rounded-md font-bold">{name}</span>
                        )) : (
                            <span className="px-1.5 py-0.5 bg-slate-100 text-slate-500 text-[10px] rounded-md font-bold">Sin impuestos</span>
                        )}
                    </div>
                </div>
            </td>

            {/* Lote y Origen */}
            <td className="px-6 py-4">
                <div>
                    {lotes.length > 0 ? (
                        <div className="space-y-1">
                            {lotes.slice(0, 2).map(l => (
                                <p key={l.id} className="text-slate-700 text-xs font-medium">{l.identificadorLote}</p>
                            ))}
                            {lotes.length > 2 && <p className="text-slate-400 text-[10px]">+{lotes.length - 2} más</p>}
                        </div>
                    ) : (
                        <p className="text-slate-500 text-xs">Sin lotes</p>
                    )}
                </div>
            </td>

            {/* Existencia y Caducidad con Avisos */}
            <td className="px-6 py-4">
                <div>
                    <p className={`font-bold text-base ${isLowStock ? 'text-amber-600' : 'text-slate-800'}`}>
                        {stockGlobal} <span className="text-sm font-medium text-slate-500">{lotes[0]?.unidadMedida || 'pzas'}</span>
                    </p>

                    {/* Alert badges */}
                    {blackLotes.length > 0 ? (
                        <div className="mt-1 space-y-1">
                            {blackLotes.map(bl => (
                                <div key={bl.lote.id} className="flex items-center gap-1.5 px-2 py-1 bg-gray-900 rounded-lg border border-gray-700">
                                    <AlertOctagon className="w-3 h-3 text-white animate-pulse" />
                                    <span className="text-[10px] font-extrabold text-white tracking-wide">
                                        LOTE VENCIDO: {bl.lote.identificadorLote}
                                    </span>
                                </div>
                            ))}
                        </div>
                    ) : worstAlert ? (
                        <div className={`flex items-center gap-1.5 mt-1 px-2 py-0.5 rounded-lg border ${style.bg} ${style.border}`}>
                            <Clock className={`w-3 h-3 ${style.icon}`} />
                            <span className={`text-[10px] font-bold ${style.text}`}>
                                {worstAlert.daysRemaining === Infinity ? 'Sin fecha' :
                                    worstLevel === 'green' ? `${worstAlert.daysRemaining}d — OK` :
                                        worstLevel === 'yellow' ? `${worstAlert.daysRemaining}d — Precaución` :
                                            `${worstAlert.daysRemaining}d — ¡Urgente!`}
                            </span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-1.5 mt-0.5">
                            <Clock className="w-3 h-3 text-slate-400" />
                            <span className="text-xs font-medium text-slate-500">N/A</span>
                        </div>
                    )}
                </div>
            </td>

            {/* Acciones */}
            <td className="px-6 py-4 text-center">
                <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Edit2 className="w-4 h-4" /></button>
                    <button onClick={() => onDelete(producto)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                </div>
            </td>
        </tr>
    );
}

// ─── withObservables Wrapper ────────────────────────────────
const enhance = withObservables(['producto'], ({ producto }: { producto: ProductoModel; onDelete: (p: ProductoModel) => void }) => ({
    producto: producto.observe(),
    familia: producto.familia.observe().pipe(
        switchMap(f => f ? of(f) : of(null))
    ),
    lotes: producto.lotes.observe(),
    impuestosLinks: producto.impuestosMultiples.observe(),
    stockGlobal: producto.stockGlobal,
}));

const ProductRow = enhance(ProductRowInner);
export default ProductRow;
