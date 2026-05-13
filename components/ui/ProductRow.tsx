import withObservables from "@nozbe/with-observables";
import {
  AlertOctagon,
  Clock,
  Edit2,
  Image as ImageIcon,
  RefreshCw,
  ToggleLeft,
  ToggleRight,
  Package,
  Box,
  ShoppingBag,
  Tag,
  Cake,
  CakeSlice,
  Croissant,
  Cookie,
  Cherry,
  ChefHat,
  Coffee,
  Apple
} from "lucide-react";
import React, { useEffect, useState } from "react";
import { of } from "rxjs";
import { switchMap } from "rxjs/operators";
import FamiliaModel from "../../src/services/DB/models/bases/familia";
import LoteModel from "../../src/services/DB/models/catalogo/lote";
import ProductoModel from "../../src/services/DB/models/catalogo/producto";
import ProductoImpuestoModel from "../../src/services/DB/models/catalogo/productoImpuesto";

// ─── Alert Level Types ──────────────────────────────────────
export type AlertLevel = "green" | "yellow" | "red" | "black" | "none";

export interface LoteAlert {
  lote: LoteModel;
  level: AlertLevel;
  daysRemaining: number;
  isAcknowledged?: boolean;
}

const ACKNOWLEDGED_LOTS_KEY = "dist_mh_acknowledged_lots";

// ─── Alert Calculation Logic ────────────────────────────────
export function calculateAlertLevel(
  fechaCaducidad: number | null | undefined,
  umbralVerde: number,
  umbralAmarillo: number,
): { level: AlertLevel; daysRemaining: number } {
  if (!fechaCaducidad) return { level: "none", daysRemaining: Infinity };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expDate = new Date(fechaCaducidad);
  expDate.setHours(0, 0, 0, 0);
  const daysRemaining = Math.ceil(
    (expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (daysRemaining <= 0) return { level: "black", daysRemaining };
  if (daysRemaining <= umbralAmarillo) return { level: "red", daysRemaining };
  if (daysRemaining <= umbralVerde) return { level: "yellow", daysRemaining };
  return { level: "green", daysRemaining };
}

// ─── Alert Badge Styles ─────────────────────────────────────
const alertStyles: Record<
  AlertLevel,
  { bg: string; text: string; border: string; icon: string }
> = {
  green: {
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200",
    icon: "text-emerald-500",
  },
  yellow: {
    bg: "bg-amber-50 dark:bg-amber-500/10",
    text: "text-amber-700",
    border: "border-amber-200",
    icon: "text-amber-500",
  },
  red: {
    bg: "bg-rose-50",
    text: "text-rose-700",
    border: "border-rose-200",
    icon: "text-rose-500",
  },
  black: {
    bg: "bg-gray-900 shadow-lg shadow-gray-200/50",
    text: "text-white",
    border: "border-gray-800",
    icon: "text-gray-400",
  },
  none: {
    bg: "bg-slate-50 dark:bg-slate-900",
    text: "text-slate-500 dark:text-slate-400",
    border: "border-slate-200 dark:border-slate-700",
    icon: "text-slate-400",
  },
};

const getMarginBadgeStyle = (category: string) => {
  switch (category) {
    case "Margen Ideal":
      return "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:border-emerald-800/50 dark:text-emerald-400";
    case "Margen Alto":
      return "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:border-purple-800/50 dark:text-purple-400";
    case "De Servicio":
      return "bg-slate-100 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700";
    default:
      return "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:border-orange-800/50 dark:text-orange-400";
  }
};

const IconMap: Record<string, React.FC<any>> = {
  Package, Box, ShoppingBag, Tag, Cake, CakeSlice, Croissant, Cookie, Cherry, ChefHat, Coffee, Apple
};

// ─── Inner Component (already has observables injected) ─────
interface ProductRowProps {
  producto: ProductoModel;
  familia: FamiliaModel | null;
  lotes: LoteModel[];
  impuestosLinks: ProductoImpuestoModel[];
  stockGlobal: number;
  onDelete: (p: ProductoModel) => void;
  onEdit: (p: ProductoModel) => void;
  onClick?: () => void;
}

function ProductRowInner({
  producto,
  familia,
  lotes,
  impuestosLinks,
  stockGlobal,
  onDelete,
  onEdit,
  onClick,
}: ProductRowProps) {
  const [impuestoNames, setImpuestoNames] = useState<string[]>([]);
  const [acknowledgedIds, setAcknowledgedIds] = useState<string[]>([]);

  // Cargar IDs reconocidos (Enterado)
  useEffect(() => {
    const loadAcknowledged = () => {
      try {
        const stored = localStorage.getItem(ACKNOWLEDGED_LOTS_KEY);
        if (stored) setAcknowledgedIds(JSON.parse(stored));
      } catch (e) {}
    };
    loadAcknowledged();
    // Escuchar cambios en localStorage (por si se marca desde el flyout o el detalle)
    window.addEventListener('storage', loadAcknowledged);
    return () => window.removeEventListener('storage', loadAcknowledged);
  }, []);

  // Fetch actual impuesto names from junction records
  useEffect(() => {
    let cancelled = false;
    async function fetchNames() {
      const names: string[] = [];
      for (const link of impuestosLinks) {
        try {
          const imp = await link.impuesto.fetch();
          if (imp && !cancelled) names.push(imp.nombre);
        } catch {
          /* ignored - may not have permission */
        }
      }
      if (!cancelled) setImpuestoNames(names);
    }
    fetchNames();
    return () => {
      cancelled = true;
    };
  }, [impuestosLinks]);

  // Calculate worst alert across all lots
  const umbralVerde = producto.umbralVerdeDias ?? 90;
  const umbralAmarillo = producto.umbralAmarilloDias ?? 30;

  const loteAlerts: LoteAlert[] = lotes.map((lote) => {
    const result = calculateAlertLevel(
      lote.fechaCaducidad,
      umbralVerde,
      umbralAmarillo,
    );
    
    const isAcknowledged = acknowledgedIds.includes(lote.id);
    
    return { lote, ...result, isAcknowledged };
  });

  // Priority logic for the summary badge:
  const priorityOrder: AlertLevel[] = ["red", "yellow", "green", "none"];

  // 1. If there's any UNACKNOWLEDGED expired lot, it takes absolute priority (Black)
  const unacknowledgedBlack = loteAlerts.find(la => la.level === 'black' && !la.isAcknowledged);
  
  // 2. Otherwise, find the worst alert among non-expired lots
  const nonExpiredAlerts = loteAlerts.filter(la => la.level !== 'black');
  const bestNonExpired = nonExpiredAlerts.length > 0
    ? nonExpiredAlerts.reduce((worst, current) =>
        priorityOrder.indexOf(current.level) <
        priorityOrder.indexOf(worst.level)
          ? current
          : worst,
      )
    : null;

  const worstAlert = unacknowledgedBlack || bestNonExpired;
  const worstLevel: AlertLevel = worstAlert?.level ?? "none";
  const style = alertStyles[worstLevel];

  const isLowStock = stockGlobal <= 10;
  const blackLotes = loteAlerts.filter((la) => la.level === "black" && !la.isAcknowledged);

  // Format date nicely
  const formatDate = (timestamp: number | null | undefined) => {
    if (!timestamp) return "Sin fecha";
    return new Date(timestamp).toLocaleDateString("es-MX", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <tr
      className={`hover:bg-slate-50/50 transition-colors group ${onClick ? "cursor-pointer" : ""} ${!producto.estado ? "border-l-4 border-l-slate-400 opacity-60 bg-slate-50/30 grayscale" : ""}`}
      onClick={onClick}
    >
      {/* Producto */}
      <td className="px-6 py-4">
        <div className="flex items-center gap-4">
          <div
            className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 border overflow-hidden ${worstLevel === "black" ? "bg-gray-900 border-gray-700" : worstLevel === "red" ? "bg-rose-50 border-rose-200 dark:bg-rose-900/20 dark:border-rose-800/50" : "bg-slate-100 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700"}`}
          >
            {(() => {
              const isIcon = producto.imagen?.startsWith("icon:");
              const iconName = isIcon ? producto.imagen!.replace("icon:", "") : null;
              const SelectedIcon = iconName && IconMap[iconName] ? IconMap[iconName] : ImageIcon;
              
              if (producto.imagen && !isIcon) {
                return (
                  <img
                    src={producto.imagen}
                    alt="Producto"
                    className="w-full h-full object-cover"
                  />
                );
              }
              
              return (
                <SelectedIcon
                  className={`w-5 h-5 ${worstLevel === "black" ? "text-gray-400" : worstLevel === "red" ? "text-rose-400 dark:text-rose-500" : "text-slate-400"}`}
                />
              );
            })()}
          </div>
          <div>
            <p
              className="text-slate-900 dark:text-white font-bold max-w-xs truncate"
              title={producto.descripcion}
            >
              {producto.descripcion}
            </p>
            <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">
              {producto.codigoInterno}
            </p>
          </div>
        </div>
      </td>

      {/* Clasificación */}
      <td className="px-6 py-4">
        <div>
          <p className="text-slate-700 dark:text-slate-300 font-medium">
            {familia
              ? `${familia.codigoFamilia}-${familia.nombre}`
              : "Sin Familia"}
          </p>
          <span
            className={`inline-block mt-1 px-2 py-0.5 rounded-md text-[10px] font-bold border uppercase tracking-wider ${getMarginBadgeStyle("Margen Ideal")}`}
          >
            Margen Ideal
          </span>
        </div>
      </td>

      {/* Fiscal y Finanzas */}
      <td className="px-6 py-4">
        <div>
          <p className="text-slate-800 dark:text-white font-bold">
            ${(producto.precioLista || 0).toFixed(2)}
          </p>
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            {impuestoNames.length > 0 ? (
              impuestoNames.map((name, i) => (
                <span
                  key={i}
                  className="px-1.5 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[10px] rounded-md font-bold"
                >
                  {name}
                </span>
              ))
            ) : (
              <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-[10px] rounded-md font-bold">
                Sin impuestos
              </span>
            )}
            {producto.claveSat && (
               <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-[10px] rounded-md font-bold">
                SAT: {producto.claveSat}
              </span>
            )}
          </div>
          
          <div className="mt-2 flex flex-col gap-1">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Costo Ref:</span>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                ${(producto.costoBase || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </span>
            </div>
            
            {producto.ultimoCostoBase > 0 && (
              <div className="bg-blue-50/80 dark:bg-blue-900/10 border border-blue-100/50 dark:border-blue-800/20 rounded-lg px-2 py-1 flex items-center gap-2 w-fit">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div>
                <p className="text-[9px] font-bold text-blue-600 dark:text-blue-400">
                  Último: ${producto.ultimoCostoBase.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </p>
              </div>
            )}
          </div>
        </div>
      </td>



      {/* Existencia y Caducidad con Avisos */}
      <td className="px-6 py-4">
        <div>
          <p
            className={`font-bold text-base ${isLowStock ? "text-amber-600 dark:text-amber-500" : "text-slate-800 dark:text-white"}`}
          >
            {stockGlobal}{" "}
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
              {lotes[0]?.unidadMedida || "pzas"}
            </span>
          </p>

          {/* Primary Alert Badge */}
          {worstAlert ? (
            <div
              className={`flex items-center gap-1.5 mt-1 px-2 py-0.5 rounded-lg border ${style.bg} ${style.border} shadow-sm`}
            >
              <Clock className={`w-3 h-3 ${style.icon}`} />
              <span className={`text-[10px] font-extrabold ${style.text} tracking-tight`}>
                {worstAlert.daysRemaining === Infinity
                  ? "Sin fecha"
                  : worstLevel === "black"
                    ? `VENCIDO — ${worstAlert.lote.identificadorLote}`
                    : `${worstAlert.daysRemaining}d — ${worstAlert.lote.identificadorLote}`}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 mt-0.5 opacity-50">
              <Clock className="w-3 h-3 text-slate-400" />
              <span className="text-xs font-medium text-slate-500">
                {lotes.length > 0 ? 'REVISADO' : 'N/A'}
              </span>
            </div>
          )}
        </div>
      </td>

      {/* Acciones */}
      <td className="px-6 py-4 text-center">
        <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit(producto);
            }}
            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="Editar info base del producto"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(producto);
            }}
            className={`p-1.5 ${producto.estado ? "text-slate-400 hover:text-rose-600 hover:bg-rose-50" : "text-amber-500 hover:text-amber-600 hover:bg-amber-50"} rounded-lg transition-colors`}
            title={
              producto.estado ? "Desactivar Producto" : "Reactivar Producto"
            }
          >
            {producto.estado ? (
              <ToggleRight className="w-5 h-5 text-emerald-500" />
            ) : (
              <ToggleLeft className="w-5 h-5 text-slate-400" />
            )}
          </button>
        </div>
      </td>
    </tr>
  );
}

// ─── withObservables Wrapper ────────────────────────────────
const enhance = withObservables(
  ["producto"],
  ({
    producto,
  }: {
    producto: ProductoModel;
    onDelete: (p: ProductoModel) => void;
    onEdit: (p: ProductoModel) => void;
  }) => ({
    producto: producto.observe(),
    familia: producto.familia
      .observe()
      .pipe(switchMap((f) => (f ? of(f) : of(null)))),
    lotes: producto.lotes.observe(),
    impuestosLinks: producto.impuestosMultiples.observe(),
    stockGlobal: producto.stockGlobal,
  }),
);

const ProductRow = enhance(ProductRowInner);
export default ProductRow;
