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
  X,
} from "lucide-react";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { database } from "../../../src/services/DB/indexBD";
import { errorTranslator } from "../../../src/utils/errorTranslator";

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

      // ---- Aquí podríamos agregar logic para consultar la tabla de "lotes" cuya fecha de caducidad venció ----
      // Como mock representativo para "lotes vencidos" si no está disponible la fecha todavía
      const lotesDb = database.collections.get("lotes");
      const lotes = (await lotesDb.query().fetch()) as any[];
      const now = Date.now();
      const expiredLotes = lotes.filter(
        (l) => l.fechaCaducidad && l.fechaCaducidad < now,
      );

      expiredLotes.forEach((l) => {
        newItems.push({
          id: `lote_vencido_${l.id}`,
          title: "Lote Vencido Encontrado",
          message: `El lote ${l.identificadorLote} ya expiró. Fue encontrado el inventario.`,
          timestamp: timeAgo(l.fechaCaducidad),
          priority: "critica",
          status: "unread",
          type: "lote_vencido",
          actionUrl: "/inventory",
        });
      });

      // Sort by newest
      setItems(newItems.reverse()); // Reverse para mostrar al final de inserción (simulando los ultimos)
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

  /* ── Render ── */
  return (
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
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-[#15335c] shadow-sm animate-pulse">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-3 w-[380px] bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden z-50 origin-top-right animate-in fade-in zoom-in-95 duration-150">
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
                  {unreadCount} acciones necesarias
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

          {/* ── List ── */}
          <div className="max-h-[360px] overflow-y-auto divide-y divide-slate-100 custom-scrollbar">
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
          {visibleItems.length > 0 && (
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
  );
}
