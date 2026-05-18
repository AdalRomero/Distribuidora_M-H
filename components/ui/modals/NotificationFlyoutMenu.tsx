import { Q } from '@nozbe/watermelondb';
import { useRouter } from "expo-router";
import {
  AlertTriangle,
  Bell,
  CheckCheck,
  ChevronDown,
  Clock,
  Info,
  PackageCheck,
  ShieldAlert,
  Skull,
  Trash2,
  Wrench,
  X,
} from "lucide-react";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { database } from "../../../src/services/DB/indexBD";
import { errorTranslator } from "../../../src/utils/errorTranslator";
import { useIntegrity } from "../../../src/context/IntegrityContext";
import type { IntegrityIncident } from "../../../src/integrity/types";
import IntegrityFixModal from "./IntegrityFixModal";

/* ─── Types ─── */
export type NotificationPriority = "alta" | "media" | "baja" | "critica"; // critica para negro
export type NotificationStatus = "unread" | "read" | "archived";

export interface NotificationItem {
  id: string; // Puede ser el id de bitacora o "lote-..."
  title: string;
  message: string;
  timestamp: string;
  priority: NotificationPriority;
  status: NotificationStatus;
  type: "error_sync" | "lote_vencido";
  actionUrl?: string; // a dónde redirigir al dar click
}

const ACKNOWLEDGED_LOTS_KEY = "dist_mh_acknowledged_lots";

/* ─── Priority helpers ─── */
const priorityConfig: Record<
  NotificationPriority,
  {
    label: string;
    dot: string;
    bg: string;
    text: string;
    border: string;
    icon: React.ElementType;
  }
> = {
  critica: {
    // Se usará para Lotes Vencidos (Color Negro)
    label: "Crítica",
    dot: "bg-black",
    bg: "bg-gray-100",
    text: "text-slate-900 dark:text-white",
    border: "border-slate-300",
    icon: Skull,
  },
  alta: {
    // Para Facturas y Productos
    label: "Alta",
    dot: "bg-red-500",
    bg: "bg-red-50",
    text: "text-red-700",
    border: "border-red-200",
    icon: ShieldAlert,
  },
  media: {
    // Para otros apartados (Catálogos, Usuarios, Clientes)
    label: "Media",
    dot: "bg-amber-500",
    bg: "bg-amber-50 dark:bg-amber-500/10",
    text: "text-amber-700",
    border: "border-amber-200",
    icon: AlertTriangle,
  },
  baja: {
    label: "Baja",
    dot: "bg-sky-500",
    bg: "bg-sky-50",
    text: "text-sky-700",
    border: "border-sky-200",
    icon: Info,
  },
};

export default function NotificationFlyoutMenu() {
  const router = useRouter();
  const { incidents, pendingCount, dismiss } = useIntegrity();
  const [activeIncident, setActiveIncident] = useState<IntegrityIncident | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [priorityFilter, setPriorityFilter] = useState<
    NotificationPriority | "todas"
  >("todas");
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Click-outside to close
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setShowFilterMenu(false);
      }
    };
    if (isOpen) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isOpen]);

  // Funciones auxiliares para parsear tiempo
  const timeAgo = (timestamp?: number) => {
    if (!timestamp) return "Recientemente";
    const min = Math.floor((Date.now() - timestamp) / 60000);
    if (min < 60) return `Hace ${min} min`;
    const hrs = Math.floor(min / 60);
    if (hrs < 24) return `Hace ${hrs} h`;
    return `Hace ${Math.floor(hrs / 24)} días`;
  };

  // Función para determinar la ruta según la tabla
  const getTabForTable = (tablaRegex: string) => {
    if (
      [
        "productos",
        "lotes",
        "producto_impuestos",
        "codigos_alternos",
        "proveedor_productos",
        "movimientos_inventario",
      ].includes(tablaRegex)
    )
      return "/inventory";
    if (["documentos", "documentos_detalles"].includes(tablaRegex))
      return "/invoices";
    if (["clientes", "proveedores"].includes(tablaRegex)) return "/clients";
    if (["familias", "almacenes", "impuestos", "margenes"].includes(tablaRegex))
      return "/catalogs";
    if (["perfiles", "informacion_perfil", "permisos"].includes(tablaRegex))
      return "/users";
    if (["precios_especiales_clientes"].includes(tablaRegex)) return "/prices";
    return "/home";
  };

  // Cargar notificaciones de Errores y Lotes
  const loadNotifications = useCallback(async () => {
    try {
      const bitacoraDb = database.collections.get("bitacora_errores");
      const errores = (await bitacoraDb.query().fetch()) as any[];

      const newItems: NotificationItem[] = errores.map((e) => {
        // Determinar prioridad y título general
        let priority: NotificationPriority = "media";
        let title = "Error de Sincronización";

        const tabla = e.tablaOrigen;
        if (["documentos", "documentos_detalles"].includes(tabla)) {
          priority = "alta";
          title = "Error de Facturación";
        } else if (
          [
            "productos",
            "lotes",
            "producto_impuestos",
            "codigos_alternos",
            "proveedor_productos",
            "movimientos_inventario",
          ].includes(tabla)
        ) {
          priority = "alta";
          title = "Error de Inventario/Producto";
        } else if (
          ["perfiles", "informacion_perfil", "permisos"].includes(tabla)
        ) {
          title = "Error de Registro (Usuarios)";
        }

        const data = e.payloadJson ? JSON.parse(e.payloadJson) : {};
        const targetName =
          data.nombre ||
          data.descripcion ||
          data.correo ||
          data.usuario ||
          data.folio ||
          data.codigo_interno ||
          "Registro";

        let translatedMsg = errorTranslator(e.mensajeError, tabla);
        let detailMessage = `Carga denegada para ${targetName}. ${translatedMsg}`;

        return {
          id: e.id,
          title: title,
          message: detailMessage,
          timestamp: timeAgo(e.createdAt), // WatermelonDB properties are mostly camelCase for dates if defined so, just fallback if undefined
          priority,
          status: e.estado === "read" ? "read" : "unread", // Dependiendo de si se ha leido
          type: "error_sync",
          actionUrl: `${getTabForTable(tabla)}?recoverErrorId=${e.id}`,
        };
      });

      // ---- Lotes Vencidos y Próximos a Vencer ----
      const lotesDb = database.collections.get("lotes");
      const lotes = (await lotesDb.query().fetch()) as any[];
      const prodsDb = database.collections.get("productos");
      const productos = (await prodsDb.query().fetch()) as any[];
      
      const now = Date.now();
      const oneDay = 1000 * 60 * 60 * 24;

      // Cargar IDs ya reconocidos (Enterado)
      let acknowledgedIds: string[] = [];
      try {
        const stored = localStorage.getItem(ACKNOWLEDGED_LOTS_KEY);
        if (stored) acknowledgedIds = JSON.parse(stored);
      } catch (e) {}

      lotes.forEach((l) => {
        if (!l.fechaCaducidad || !l.estado || acknowledgedIds.includes(l.id)) return;

        const prod = productos.find(p => p.id === l._raw.producto_id);
        if (!prod) return;

        const umbralVerde = prod.umbralVerdeDias ?? 90;
        const umbralAmarillo = prod.umbralAmarilloDias ?? 30;
        
        const daysRemaining = Math.ceil((l.fechaCaducidad - now) / oneDay);
        
        let priority: NotificationPriority | null = null;
        let title = "";
        let message = "";

        if (daysRemaining <= 0) {
          priority = "critica";
          title = "Lote Vencido Encontrado";
          message = `El lote ${l.identificadorLote} ya expiró. Fue encontrado en el inventario.`;
        } else if (daysRemaining <= umbralAmarillo) {
          priority = "alta";
          title = "Lote con Riesgo Crítico";
          message = `El lote ${l.identificadorLote} vence en ${daysRemaining} días. Requiere atención inmediata.`;
        } else if (daysRemaining <= umbralVerde) {
          priority = "media";
          title = "Próxima Caducidad";
          message = `El lote ${l.identificadorLote} vence en ${daysRemaining} días. Considera su rotación.`;
        }

        if (priority) {
          newItems.push({
            id: `lote_${priority}_${l.id}`,
            title,
            message,
            timestamp: timeAgo(l.fechaCaducidad),
            priority,
            status: "unread",
            type: "lote_vencido", // Usamos este tipo para manejar el dismiss de lotes
            actionUrl: `/inventory?search=${l.identificadorLote}`,
          });
        }
      });

      // Sort by newest
      setItems(newItems.reverse()); 
    } catch (e) {
      console.error("Error cargando notificaciones de la base de datos:", e);
    }
  }, []);

  // Recargar info cada vez que se abren, para asegurar actualizacion
  useEffect(() => {
    if (isOpen) {
      loadNotifications();
    }
  }, [isOpen, loadNotifications]);

  /* ── Actions ── */
  const markAsRead = (id: string) =>
    setItems((prev) =>
      prev.map((n) => (n.id === id ? { ...n, status: "read" as const } : n)),
    );

  const dismissError = async (id: string) => {
    try {
      const bitacoraDb = database.collections.get("bitacora_errores");
      const errorRecords = await bitacoraDb.query(Q.where('id', id)).fetch();

      if (errorRecords.length > 0) {
        const record = errorRecords[0] as any;
        try {
          const payload = JSON.parse(record.payloadJson || "{}");
          if (record.tablaOrigen && payload.id) {
            const coll = database.collections.get(record.tablaOrigen);
            // Use query to avoid 'Record not found' error
            const trappedRecords = await coll.query(Q.where('id', payload.id)).fetch();
            if (trappedRecords.length > 0) {
              await database.write(async () => {
                await trappedRecords[0].destroyPermanently();
              });
            }
          }
        } catch (e) {
          console.error("Error al limpiar registro atrapado", e);
        }

        await database.write(async () => {
          await record.destroyPermanently();
        });
      }
    setItems((prev) => prev.filter((n) => n.id !== id));
    } catch (e) {
      console.error(e);
      setItems((prev) => prev.filter((n) => n.id !== id));
    }
  };

  const acknowledgeLot = (notifId: string) => {
    // Extraer el id del lote del id de la notificación (lote_priority_id)
    const parts = notifId.split('_');
    const loteId = parts[parts.length - 1];
    
    try {
      const stored = localStorage.getItem(ACKNOWLEDGED_LOTS_KEY);
      const acknowledgedIds: string[] = stored ? JSON.parse(stored) : [];
      if (!acknowledgedIds.includes(loteId)) {
        acknowledgedIds.push(loteId);
        localStorage.setItem(ACKNOWLEDGED_LOTS_KEY, JSON.stringify(acknowledgedIds));
      }
    } catch (e) {
      console.error("Error saving acknowledgment", e);
    }
    
    setItems((prev) => prev.filter((n) => n.id !== notifId));
  };

  const handleNotificationClick = (notif: NotificationItem) => {
    if (notif.actionUrl) {
      // Mark as read first
      markAsRead(notif.id);
      setIsOpen(false);
      // Navigate which will effectively cause url reload in expo-router
      router.push(notif.actionUrl as any);
    }
  };

  const markAllRead = () =>
    setItems((prev) =>
      prev.map((n) => ({
        ...n,
        status:
          n.status === "archived" ? ("archived" as const) : ("read" as const),
      })),
    );

  /* ── Derived ── */
  const visibleItems = items.filter((n) => {
    if (n.status === "archived") return false;
    if (priorityFilter !== "todas" && n.priority !== priorityFilter)
      return false;
    return true;
  });

  const unreadCount = items.filter((n) => n.status === "unread").length;
  const totalBadge = unreadCount + pendingCount;

  /* ── Render ── */
  return (
    <>
    <IntegrityFixModal incident={activeIncident} onClose={() => setActiveIncident(null)} />
    <div className="relative" ref={panelRef}>
      {/* Bell trigger */}
      <button
        onClick={() => {
          setIsOpen((o) => !o);
          setShowFilterMenu(false);
        }}
        className={`flex items-center justify-center w-10 h-10 rounded-full transition-all border ${isOpen
          ? "bg-[#38bdf8]/20 dark:bg-slate-800/20 border-white/30 text-white"
          : "bg-[#15335c] border-transparent hover:bg-black/20 text-slate-300 hover:text-white"
          }`}
        title="Notificaciones"
      >
        <Bell size={18} />
        {totalBadge > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-[#15335c] shadow-sm animate-pulse">
            {totalBadge > 9 ? "9+" : totalBadge}
          </span>
        )}
      </button>

      {/* Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-3 w-[400px] bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden z-50 origin-top-right animate-in fade-in zoom-in-95 duration-150">
          {/* ── Header ── */}
          <div className="bg-[radial-gradient(ellipse_at_center,_#15335c_0%,_#15335c_100%)] px-5 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-white dark:bg-slate-800/10 rounded-xl">
                <Bell size={16} className="text-white" />
              </div>
              <div>
                <h3 className="text-white font-bold text-sm tracking-wide">
                  Notificaciones
                </h3>
                <p className="text-slate-400 text-[10px] font-medium uppercase tracking-widest mt-0.5">
                  {totalBadge} acciones necesarias
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={markAllRead}
                className="p-2 rounded-lg hover:bg-black/20 text-slate-400 hover:text-white transition-colors"
                title="Marcar todo como leído"
              >
                <CheckCheck size={15} />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 rounded-lg hover:bg-black/20 text-slate-400 hover:text-white transition-colors"
                title="Cerrar"
              >
                <X size={15} />
              </button>
            </div>
          </div>

          {/* ── Filter bar ── */}
          <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
            <div className="relative">
              <button
                onClick={() => setShowFilterMenu((s) => !s)}
                className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:text-slate-300 transition-colors px-2.5 py-1.5 rounded-lg hover:bg-black/20 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
              >
                <span
                  className={`w-2 h-2 rounded-full ${priorityFilter === "todas" ? "bg-slate-400" : priorityConfig[priorityFilter].dot}`}
                />
                {priorityFilter === "todas"
                  ? "Todas"
                  : priorityConfig[priorityFilter].label}
                <ChevronDown size={12} />
              </button>

              {showFilterMenu && (
                <div className="absolute top-full left-0 mt-1 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 py-1.5 z-50 min-w-[130px]">
                  {(["todas", "critica", "alta", "media", "baja"] as const).map(
                    (opt) => (
                      <button
                        key={opt}
                        onClick={() => {
                          setPriorityFilter(opt);
                          setShowFilterMenu(false);
                        }}
                        className={`w-full flex items-center gap-2 px-3 py-2 text-xs font-medium transition-colors ${priorityFilter === opt
                          ? "bg-slate-100 dark:bg-slate-800/50 text-slate-800 dark:text-white"
                          : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-900 hover:text-slate-700 dark:text-slate-300"
                          }`}
                      >
                        <span
                          className={`w-2 h-2 rounded-full ${opt === "todas"
                            ? "bg-slate-400"
                            : priorityConfig[opt].dot
                            }`}
                        />
                        {opt === "todas" ? "Todas" : priorityConfig[opt].label}
                      </button>
                    ),
                  )}
                </div>
              )}
            </div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              {visibleItems.length} resultado
              {visibleItems.length !== 1 ? "s" : ""}
            </span>
          </div>

          {/* ── Integrity Incidents Section ── */}
          {incidents.length > 0 && (
            <div className="border-b border-slate-100 dark:border-slate-700">
              <div className="px-4 pt-3 pb-1.5 flex items-center gap-2">
                <Wrench size={12} className="text-amber-500" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                  Integridad de Datos — {incidents.length} pendiente{incidents.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {incidents.map((inc) => {
                  const sevColors = {
                    critical: { bg: 'bg-rose-50 dark:bg-rose-900/10', dot: 'bg-rose-500', text: 'text-rose-700 dark:text-rose-400', badge: 'bg-rose-100 text-rose-700 border-rose-200' },
                    high: { bg: 'bg-orange-50 dark:bg-orange-900/10', dot: 'bg-orange-500', text: 'text-orange-700 dark:text-orange-400', badge: 'bg-orange-100 text-orange-700 border-orange-200' },
                    medium: { bg: 'bg-amber-50 dark:bg-amber-900/10', dot: 'bg-amber-500', text: 'text-amber-700 dark:text-amber-400', badge: 'bg-amber-100 text-amber-700 border-amber-200' },
                    low: { bg: 'bg-sky-50 dark:bg-sky-900/10', dot: 'bg-sky-500', text: 'text-sky-700 dark:text-sky-400', badge: 'bg-sky-100 text-sky-700 border-sky-200' },
                  }[inc.severity];
                  return (
                    <div
                      key={inc.id}
                      className={`group px-4 py-3 flex items-start gap-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors ${sevColors.bg}`}
                      onClick={() => { setActiveIncident(inc); setIsOpen(false); }}
                    >
                      <div className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${sevColors.dot}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <p className={`text-xs font-bold truncate ${sevColors.text}`}>{inc.title}</p>
                          {inc.status === 'partial' && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full border bg-blue-100 text-blue-700 border-blue-200 shrink-0">Parcial</span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug line-clamp-2">{inc.description}</p>
                        {inc.status === 'partial' && (
                          <div className="mt-1.5 h-1 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-500 rounded-full"
                              style={{ width: `${(inc.resolvedCount / inc.affectedCount) * 100}%` }}
                            />
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => { e.stopPropagation(); setActiveIncident(inc); setIsOpen(false); }}
                          className="p-1 rounded-md bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 hover:bg-blue-200 transition-colors"
                          title="Corregir ahora"
                        >
                          <Wrench size={11} />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); dismiss(inc.id); }}
                          className="p-1 rounded-md text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-colors"
                          title="Descartar"
                        >
                          <X size={11} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Sync Errors / Lotes List ── */}
          <div className="max-h-[300px] overflow-y-auto divide-y divide-slate-100 custom-scrollbar">
            {visibleItems.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center gap-2 text-center px-8">
                <PackageCheck
                  size={32}
                  className="text-emerald-500 bg-emerald-50 p-3 rounded-full"
                />
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Todo al día
                </p>
                <p className="text-[11px] text-slate-400 leading-snug">
                  No hay notificaciones ni errores pendientes.
                </p>
              </div>
            ) : (
              visibleItems.map((notif) => {
                const pCfg = priorityConfig[notif.priority];
                const isUnread = notif.status === "unread";
                const PriorityIcon = pCfg.icon;
                return (
                  <div
                    key={notif.id}
                    className={`group px-4 py-3.5 transition-colors relative cursor-pointer ${isUnread ? "bg-white dark:bg-slate-800" : "bg-slate-50 dark:bg-slate-900/60"
                      } hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-900`}
                    onClick={() => handleNotificationClick(notif)}
                  >
                    {/* Unread indicator bar */}
                    {isUnread && (
                      <div
                        className={`absolute left-0 top-3 bottom-3 w-[3px] ${pCfg.dot} rounded-r-full shadow-sm`}
                      />
                    )}

                    <div className="flex gap-3">
                      {/* Icon */}
                      <div
                        className={`shrink-0 mt-0.5 w-8 h-8 rounded-lg flex items-center justify-center ${pCfg.bg} border ${pCfg.border}`}
                      >
                        <PriorityIcon size={15} className={pCfg.text} />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h4
                            className={`text-sm leading-snug truncate ${isUnread
                              ? "font-extrabold text-slate-800 dark:text-white"
                              : "font-semibold text-slate-600 dark:text-slate-300"
                              }`}
                          >
                            {notif.title}
                          </h4>
                          <span
                            className={`shrink-0 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${pCfg.bg} ${pCfg.text} ${pCfg.border}`}
                          >
                            {pCfg.label}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-300 font-medium mt-1 leading-relaxed line-clamp-3">
                          {notif.message}
                        </p>
                        <div className="flex items-center justify-between mt-2.5">
                          <span className="flex items-center gap-1 text-[10px] text-slate-400 font-medium">
                            <Clock size={10} />
                            {notif.timestamp}
                          </span>

                          {/* Actions */}
                          <div
                            className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {notif.type === "lote_vencido" && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  acknowledgeLot(notif.id);
                                }}
                                className="flex items-center gap-1.5 px-2 py-1 rounded-md text-emerald-500 hover:bg-emerald-50 transition-colors"
                                title="Marcar como enterado"
                              >
                                <CheckCheck size={13} />
                                <span className="text-[10px] font-bold uppercase">
                                  Enterado
                                </span>
                              </button>
                            )}
                            {notif.type === "error_sync" && (
                              <button
                                onClick={() => dismissError(notif.id)}
                                className="flex items-center gap-1.5 px-2 py-1 rounded-md text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                                title="Descartar Definitivamente"
                              >
                                <Trash2 size={13} />
                                <span className="text-[10px] font-bold uppercase">
                                  Descartar
                                </span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* ── Footer ── */}
          {(visibleItems.length > 0 || incidents.length > 0) && (
            <div className="px-4 py-3 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-700 text-center">
              <button
                onClick={markAllRead}
                className="text-xs font-semibold text-[#6383a1] hover:text-[#15335c] transition-colors"
              >
                Limpiar Notificaciones
              </button>
            </div>
          )}
        </div>
      )}
    </div>
    </>
  );
}
