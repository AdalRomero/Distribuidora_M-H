import { Link } from "expo-router";
import {
  AlertTriangle,
  Database,
  FlaskConical,
  MonitorCog,
  Save,
  ShieldCheck,
  Terminal,
  Wrench,
} from "lucide-react";
import React, { useState } from "react";

interface DevToolCard {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  path: string;
  color: string;
}

const devTools: DevToolCard[] = [
  {
    id: "database",
    label: "Base de Datos",
    description:
      "Inspeccionar tablas, ejecutar queries y ver registros en tiempo real.",
    icon: <Database size={28} />,
    path: "/(panels)/dev-database",
    color: "from-emerald-500 to-teal-600",
  },
  {
    // =====================================
    // 🔴 TARJETA ACTUALIZADA PARA LA BITÁCORA
    // =====================================
    id: "sync-errors",
    label: "Conflictos y Errores",
    description:
      "Bitácora de errores de sincronización. Resuelve colisiones locales y datos atrapados.",
    icon: <AlertTriangle size={28} />,
    // Sigue apuntando al componente que creamos antes
    path: "/(panels)/dev-sync",
    color: "from-rose-500 to-red-600",
  },
  {
    id: "auth",
    label: "Autenticación",
    description: "Sesiones activas, tokens y gestión de usuarios de prueba.",
    icon: <ShieldCheck size={28} />,
    path: "/(panels)/dev-auth",
    color: "from-amber-500 to-orange-600",
  },
  {
    id: "logs",
    label: "Logs del Sistema",
    description:
      "Consola de logs en tiempo real con filtros por nivel y módulo.",
    icon: <Terminal size={28} />,
    path: "/(panels)/dev-logs",
    color: "from-indigo-500 to-blue-600", // Cambié el color para que no choque con los errores
  },
  {
    id: "experiments",
    label: "Experimentos",
    description: "Feature flags y experimentos A/B activos en la aplicación.",
    icon: <FlaskConical size={28} />,
    path: "/(panels)/dev-experiments",
    color: "from-violet-500 to-purple-600",
  },
  {
    id: "system",
    label: "Info del Sistema",
    description:
      "Versión de la app, entorno, dependencias y métricas de rendimiento.",
    icon: <MonitorCog size={28} />,
    path: "/(panels)/dev-system",
    color: "from-cyan-500 to-sky-600",
  },
];

export default function DevPanel() {
  const [showBackupModal, setShowBackupModal] = useState(false);

  return (
    <div className="min-h-screen bg-gray-950 p-8">
      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg shadow-orange-500/20">
            <Wrench size={24} className="text-white" />
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            Dev Panel
          </h1>
        </div>
        <p className="text-slate-400 text-sm ml-[52px]">
          Herramientas de desarrollo y diagnóstico del sistema.
        </p>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-5xl">
        {devTools.map((tool) => (
          <Link key={tool.id} href={tool.path as any} asChild>
            <a className="group relative flex flex-col gap-4 p-6 rounded-2xl bg-gray-900 border border-gray-800 hover:border-gray-700 transition-all duration-200 cursor-pointer hover:shadow-xl hover:shadow-black/30 hover:-translate-y-0.5">
              {/* Icon */}
              <div
                className={`w-12 h-12 rounded-xl bg-gradient-to-br ${tool.color} flex items-center justify-center text-white shadow-lg transition-transform duration-200 group-hover:scale-110`}
              >
                {tool.icon}
              </div>

              {/* Text */}
              <div>
                <h3 className="text-white font-semibold text-lg mb-1">
                  {tool.label}
                </h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  {tool.description}
                </p>
              </div>

              {/* Hover glow */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            </a>
          </Link>
        ))}
      </div>

      {/* Botón de Backups */}
      <div className="grid grid-cols-1 mt-5 max-w-5xl">
        <button
          onClick={() => setShowBackupModal(true)}
          className="group relative flex flex-col gap-4 p-6 rounded-2xl bg-gray-900 border border-gray-800 hover:border-gray-700 transition-all duration-200 cursor-pointer hover:shadow-xl hover:shadow-black/30 hover:-translate-y-0.5 text-left w-full sm:w-1/2 lg:w-1/3"
        >
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center text-white shadow-lg transition-transform duration-200 group-hover:scale-110">
            <Save size={28} />
          </div>

          <div>
            <h3 className="text-white font-semibold text-lg mb-1">
              Backups
            </h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Generar copia de seguridad de la base de datos local.
            </p>
          </div>

          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
        </button>
      </div>

      {/* Modal de Backup (Temporal) */}
      {showBackupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mb-4">
              <ShieldCheck size={32} className="text-emerald-500" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Backup Generado</h2>
            <p className="text-slate-400 mb-6">
              La copia de seguridad se ha generado correctamente.
            </p>
            <button
              onClick={() => setShowBackupModal(false)}
              className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-medium transition-colors"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
