import { Link, usePathname, useRouter } from "expo-router";
import {
  DollarSignIcon,
  FileText,
  LayoutDashboard,
  LogOut,
  Settings,
  ShelvingUnitIcon,
  User,
  Users,
  Wrench,
} from "lucide-react";
import React, { useState } from "react";
import { Platform } from "react-native";

// 1. IMPORTAMOS EL CONTEXTO
import { useAuth } from "../../src/context/AuthContext";

// SVG servido desde public/ (Asegúrate de que la ruta exista)
const LOGO_MH = "/images/logo-mh.svg";

export const SideBarMenu: React.FC = () => {
  const router = useRouter();
  const pathname = usePathname();

  // 2. EXTRAEMOS LA INFO DIRECTAMENTE DEL CONTEXTO MÁGICO
  const { userName, userRole, isDev, logoutLocal } = useAuth();

  const [isExpanded, setIsExpanded] = useState(true);

  // Formateamos el nombre para el Avatar
  const avatarName = userName.replace(/[._-]/g, " ");

  const handleLogout = async () => {
    // 3. Usamos la función del contexto para limpiar todo (local y Supabase)
    await logoutLocal();

    // 4. Redirigimos sin dejar rastro en el historial
    if (Platform.OS === "web" && typeof window !== "undefined") {
      window.location.replace("/");
    } else {
      router.replace("/" as any);
    }
  };

  const titleClass = "text-white";

  const baseMenuGroups = [
    {
      title: "Menu Principal",
      className: titleClass,
      items: [
        {
          id: "Inicio",
          label: "Inicio",
          icon: <LayoutDashboard size={20} />,
          path: "/home",
        },
        {
          id: "Precios",
          label: "Precios",
          icon: <DollarSignIcon size={20} />,
          path: "/prices",
        },
      ],
    },
    {
      title: "General",
      className: titleClass,
      items: [
        {
          id: "Inventario",
          label: "Inventario",
          icon: <ShelvingUnitIcon size={20} />,
          path: "/inventory",
        },
        {
          id: "Clientes",
          label: "Clientes",
          icon: <Users size={20} />,
          path: "/clients",
        },
        {
          id: "Facturas",
          label: "Facturas",
          icon: <FileText size={20} />,
          path: "/invoices",
        },
      ],
    },
    {
      title: "Perfiles",
      className: titleClass,
      items: [
        {
          id: "Usuarios",
          label: "Usuarios",
          icon: <User size={20} />,
          path: "/users",
        },
        {
          id: "configuraciones",
          label: "Configuraciones",
          icon: <Settings size={20} />,
          path: "/settings",
        },
      ],
    },
  ];

  // Si isDev es true, agrega el grupo "Sistema" al menú
  const menuGroups = isDev
    ? [
        ...baseMenuGroups,
        {
          title: "Sistema",
          className: titleClass,
          items: [
            {
              id: "devpanel",
              label: "Dev Panel",
              icon: <Wrench size={20} />,
              path: "/(dev)/devpanel",
            },
          ],
        },
      ]
    : baseMenuGroups;

  return (
    <aside
      className={`h-screen bg-[#15335c] focus:ring-4 focus:ring-blue-800/30 text-white transition-all duration-300 flex flex-col ${
        isExpanded ? "w-64" : "w-20"
      }`}
    >
      {/* Cabecera (Logo) */}
      <div className="flex items-center justify-between p-4 h-16 shrink-0">
        <div
          className={`flex items-center gap-3 ${!isExpanded ? "justify-center w-full" : ""}`}
        >
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-lg border-2 border-white/40 hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-white/60"
            title="Toggle Menu"
          >
            <div
              className="w-7 h-7 bg-white"
              style={{
                maskImage: `url(${LOGO_MH})`,
                WebkitMaskImage: `url(${LOGO_MH})`,
                maskSize: "contain",
                WebkitMaskSize: "contain",
                maskRepeat: "no-repeat",
                WebkitMaskRepeat: "no-repeat",
                maskPosition: "center",
                WebkitMaskPosition: "center",
              }}
              aria-label="Distribuidora MH Logo"
              role="img"
            />
          </button>

          {isExpanded && (
            <span className="font-bold text-xl tracking-wide whitespace-nowrap">
              Distribuidora MH
            </span>
          )}
        </div>
      </div>

      {/* Secciones del Menú */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide py-4 flex flex-col gap-6">
        {menuGroups.map((group, index) => (
          <div key={index} className="px-3">
            {isExpanded ? (
              <h3 className="px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 whitespace-nowrap">
                {group.title}
              </h3>
            ) : (
              <div className="w-full flex justify-center mb-2">
                <div className="h-px bg-slate-700 w-8"></div>
              </div>
            )}

            <ul className="space-y-1">
              {group.items.map((item) => {
                // Comprobación de ruta activa
                const isActive =
                  pathname === item.path ||
                  pathname.startsWith(`${item.path}/`);

                return (
                  <li key={item.id}>
                    {/* Usamos tu diseño que no rompía en web */}
                    <Link href={item.path as any} replace asChild>
                      <a
                        className={`flex items-center gap-3 px-3 py-2 transition-colors cursor-pointer ${
                          isExpanded
                            ? "rounded-lg"
                            : "justify-center rounded-xl p-3"
                        } ${
                          isActive
                            ? "bg-white text-slate-900 font-medium shadow-sm"
                            : "text-slate-300 hover:bg-slate-800 hover:text-white"
                        }`}
                        title={!isExpanded ? item.label : undefined}
                      >
                        <div className="shrink-0">{item.icon}</div>
                        {isExpanded && (
                          <span className="truncate whitespace-nowrap">
                            {item.label}
                          </span>
                        )}
                      </a>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      {/* Pie (Perfil de Usuario) */}
      <div className="p-4 shrink-0 mt-auto">
        {isExpanded ? (
          <div className="flex flex-row items-center gap-3 bg-white text-slate-900 p-3 rounded-xl shadow-sm transition-all duration-300">
            <img
              src={`https://ui-avatars.com/api/?name=${encodeURIComponent(
                avatarName,
              )}&background=0D8ABC&color=fff&bold=true`}
              alt={`${userName} avatar`} // Usamos userName del contexto
              className="w-10 h-10 rounded-full object-cover shrink-0 select-none"
            />
            <div className="flex flex-col overflow-hidden whitespace-nowrap flex-grow">
              <span className="text-sm font-bold truncate">
                {userName} {/* Nombre del contexto */}
              </span>
              <span className="text-xs text-slate-500 truncate">
                {userRole} {/* Rol del contexto */}
              </span>
            </div>
            <button
              onClick={handleLogout}
              title="Cerrar sesión"
              className="text-red-500 hover:text-red-600 transition-colors bg-red-500/10 hover:bg-red-500/20 p-2 rounded-lg shrink-0 ml-auto cursor-pointer"
            >
              <LogOut size={20} />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-4 transition-all duration-300">
            <img
              src={`https://ui-avatars.com/api/?name=${encodeURIComponent(
                avatarName,
              )}&background=0D8ABC&color=fff&bold=true`}
              alt={`${userName} avatar`} // Usamos userName del contexto
              className="w-10 h-10 rounded-full object-cover shrink-0 select-none ring-2 ring-white/10"
            />
            <button
              onClick={handleLogout}
              title="Cerrar sesión"
              className="w-10 h-10 flex items-center justify-center rounded-full text-red-400 hover:text-white transition-colors bg-slate-800 hover:bg-red-500 shadow-md shrink-0 cursor-pointer"
            >
              <LogOut size={18} className="-ml-0.5" />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};

export default SideBarMenu;
