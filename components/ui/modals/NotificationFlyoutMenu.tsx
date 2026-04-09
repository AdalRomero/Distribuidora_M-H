import {
  AlertTriangle,
  Archive,
  Bell,
  Check,
  CheckCheck,
  ChevronDown,
  Clock,
  FileWarning,
  Info,
  PackageCheck,
  ShieldAlert,
  Trash2,
  X,
} from "lucide-react";
import React, { useEffect, useRef, useState } from "react";

/* ─── Types ─── */
export type NotificationPriority = "alta" | "media" | "baja";
export type NotificationStatus = "unread" | "read" | "archived";

export interface Notification {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  priority: NotificationPriority;
  status: NotificationStatus;
}

/* ─── Sample data ─── */
const sampleNotifications: Notification[] = [
  {
    id: "1",
    title: "Inventario bajo",
    message: "Harina de trigo llegó al mínimo de stock (15 unidades).",
    timestamp: "Hace 5 min",
    priority: "alta",
    status: "unread",
  },
  {
    id: "2",
    title: "Nuevo contrato pendiente",
    message: 'Doña Lupita envió documentos para revisión del contrato CON-2023-006.',
    timestamp: "Hace 28 min",
    priority: "media",
    status: "unread",
  },
  {
    id: "3",
    title: "Factura generada",
    message: "Factura FAC-0452 por $12,300 fue emitida exitosamente.",
    timestamp: "Hace 1 hr",
    priority: "baja",
    status: "unread",
  },
  {
    id: "4",
    title: "Producto por expirar",
    message: "Colorante rojo vence en 12 días. Considere promoción.",
    timestamp: "Hace 2 hr",
    priority: "alta",
    status: "read",
  },
  {
    id: "5",
    title: "Nuevo cliente registrado",
    message: 'Se registró "Panadería El Sol" como nuevo prospecto.',
    timestamp: "Hace 4 hr",
    priority: "baja",
    status: "read",
  },
];

/* ─── Priority helpers ─── */
const priorityConfig: Record<
  NotificationPriority,
  { label: string; dot: string; bg: string; text: string; border: string; icon: React.ElementType }
> = {
  alta: {
    label: "Alta",
    dot: "bg-red-500",
    bg: "bg-red-50",
    text: "text-red-700",
    border: "border-red-200",
    icon: ShieldAlert,
  },
  media: {
    label: "Media",
    dot: "bg-amber-500",
    bg: "bg-amber-50",
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

/* ─── Component ─── */
export interface NotificationFlyoutMenuProps {
  /** Override the default sample notifications */
  notifications?: Notification[];
}

export default function NotificationFlyoutMenu({
  notifications: externalNotifications,
}: NotificationFlyoutMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>(externalNotifications ?? sampleNotifications);
  const [priorityFilter, setPriorityFilter] = useState<NotificationPriority | "todas">("todas");
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Sync external prop
  useEffect(() => {
    if (externalNotifications) setItems(externalNotifications);
  }, [externalNotifications]);

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

  /* ── Actions ── */
  const markAsRead = (id: string) =>
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, status: "read" as const } : n)));

  const archiveItem = (id: string) =>
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, status: "archived" as const } : n)));

  const dismissItem = (id: string) =>
    setItems((prev) => prev.filter((n) => n.id !== id));

  const cyclePriority = (id: string) => {
    const order: NotificationPriority[] = ["baja", "media", "alta"];
    setItems((prev) =>
      prev.map((n) => {
        if (n.id !== id) return n;
        const next = order[(order.indexOf(n.priority) + 1) % order.length];
        return { ...n, priority: next };
      }),
    );
  };

  const markAllRead = () =>
    setItems((prev) => prev.map((n) => ({ ...n, status: n.status === "archived" ? "archived" as const : "read" as const })));

  /* ── Derived ── */
  const visibleItems = items.filter((n) => {
    if (n.status === "archived") return false;
    if (priorityFilter !== "todas" && n.priority !== priorityFilter) return false;
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
          ? "bg-white/20 border-white/30 text-white"
          : "bg-[#15335c] border-transparent hover:bg-white/10 text-slate-300 hover:text-white"
          }`}
        title="Notificaciones"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-[#15335c] shadow-sm">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-3 w-[380px] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-50 origin-top-right animate-in fade-in zoom-in-95 duration-150">
          {/* ── Header ── */}
          <div className="bg-[radial-gradient(ellipse_at_center,_#15335c_0%,_#15335c_100%)] px-5 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-white/10 rounded-xl">
                <Bell size={16} className="text-white" />
              </div>
              <div>
                <h3 className="text-white font-bold text-sm tracking-wide">Notificaciones</h3>
                <p className="text-slate-400 text-[10px] font-medium uppercase tracking-widest mt-0.5">
                  {unreadCount} sin leer
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={markAllRead}
                className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                title="Marcar todo como leído"
              >
                <CheckCheck size={15} />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                title="Cerrar"
              >
                <X size={15} />
              </button>
            </div>
          </div>

          {/* ── Filter bar ── */}
          <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
            <div className="relative">
              <button
                onClick={() => setShowFilterMenu((s) => !s)}
                className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-700 transition-colors px-2.5 py-1.5 rounded-lg hover:bg-white border border-slate-200"
              >
                <span className={`w-2 h-2 rounded-full ${priorityFilter === "todas" ? "bg-slate-400" : priorityConfig[priorityFilter].dot}`} />
                {priorityFilter === "todas" ? "Todas" : priorityConfig[priorityFilter].label}
                <ChevronDown size={12} />
              </button>

              {showFilterMenu && (
                <div className="absolute top-full left-0 mt-1 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 min-w-[130px]">
                  {(["todas", "alta", "media", "baja"] as const).map((opt) => (
                    <button
                      key={opt}
                      onClick={() => {
                        setPriorityFilter(opt);
                        setShowFilterMenu(false);
                      }}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-xs font-medium transition-colors ${priorityFilter === opt
                        ? "bg-slate-100 text-slate-800"
                        : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                        }`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full ${opt === "todas" ? "bg-slate-400" : priorityConfig[opt].dot
                          }`}
                      />
                      {opt === "todas" ? "Todas" : priorityConfig[opt].label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              {visibleItems.length} resultado{visibleItems.length !== 1 ? "s" : ""}
            </span>
          </div>

          {/* ── List ── */}
          <div className="max-h-[360px] overflow-y-auto divide-y divide-slate-100 custom-scrollbar">
            {visibleItems.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center gap-2 text-center px-8">
                <PackageCheck size={32} className="text-slate-300" />
                <p className="text-sm font-semibold text-slate-400">Todo al día</p>
                <p className="text-[11px] text-slate-400 leading-snug">
                  No hay notificaciones pendientes.
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
                    className={`group px-4 py-3.5 transition-colors relative ${isUnread ? "bg-white" : "bg-slate-50/60"
                      } hover:bg-slate-50`}
                  >
                    {/* Unread indicator bar */}
                    {isUnread && (
                      <div className="absolute left-0 top-3 bottom-3 w-[3px] bg-[#85a3bf] rounded-r-full" />
                    )}

                    <div className="flex gap-3">
                      {/* Icon */}
                      <div
                        className={`shrink-0 mt-0.5 w-8 h-8 rounded-lg flex items-center justify-center ${pCfg.bg}`}
                      >
                        <PriorityIcon size={15} className={pCfg.text} />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h4
                            className={`text-sm leading-snug truncate ${isUnread ? "font-bold text-slate-800" : "font-semibold text-slate-600"
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
                        <p className="text-xs text-slate-500 mt-1 leading-relaxed line-clamp-2">
                          {notif.message}
                        </p>
                        <div className="flex items-center justify-between mt-2.5">
                          <span className="flex items-center gap-1 text-[10px] text-slate-400 font-medium">
                            <Clock size={10} />
                            {notif.timestamp}
                          </span>

                          {/* Actions */}
                          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                            {isUnread && (
                              <button
                                onClick={() => markAsRead(notif.id)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                                title="Marcar como leída"
                              >
                                <Check size={13} />
                              </button>
                            )}
                            <button
                              onClick={() => cyclePriority(notif.id)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                              title="Cambiar prioridad"
                            >
                              <FileWarning size={13} />
                            </button>
                            <button
                              onClick={() => archiveItem(notif.id)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-[#6383a1] hover:bg-[#e6edf4] transition-colors"
                              title="Archivar"
                            >
                              <Archive size={13} />
                            </button>
                            <button
                              onClick={() => dismissItem(notif.id)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                              title="Descartar"
                            >
                              <Trash2 size={13} />
                            </button>
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
            <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 text-center">
              <button className="text-xs font-semibold text-[#6383a1] hover:text-[#15335c] transition-colors">
                Ver todas las notificaciones →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
