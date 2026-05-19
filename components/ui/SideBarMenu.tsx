import { Link, usePathname, useRouter } from "expo-router";
import {
  BookOpen,
  DollarSignIcon,
  FileText,
  LayoutDashboard,
  LogOut,
  Settings,
  ShelvingUnitIcon,
  Truck,
  User,
  Users,
  Wrench,
} from "lucide-react";
import React, { useMemo, useState } from "react";
import { Platform } from "react-native";

import { useAuth } from "../../src/context/AuthContext";
import { usePermissions, type AppModule } from "../../src/permissions";
import NotificationFlyoutMenu from "./modals/NotificationFlyoutMenu";

const LOGO_MH = "/images/logo-mh.svg";

// ─── Configuración declarativa de navegación ─────────────────────────────────
// Cada item define su módulo requerido. El sidebar se filtra automáticamente.

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  module: AppModule;
  /** 'pill' = botón dentro del marco principal, 'bubble' = burbuja individual */
  variant: 'pill' | 'bubble';
}

const NAV_ITEMS: NavItem[] = [
  // Marco principal (pills)
  { href: '/home',      label: 'Inicio',     icon: LayoutDashboard, module: 'inicio',      variant: 'pill' },
  { href: '/inventory', label: 'Inventario',  icon: ShelvingUnitIcon, module: 'inventario', variant: 'pill' },
  { href: '/invoices',  label: 'Facturas',   icon: FileText,        module: 'facturas',    variant: 'pill' },
  // Burbujas
  { href: '/clients',   label: 'Clientes',   icon: Users,           module: 'clientes',    variant: 'bubble' },
  { href: '/prices',    label: 'Precios',    icon: DollarSignIcon,  module: 'precios',     variant: 'bubble' },
  { href: '/users',     label: 'Usuarios',   icon: User,            module: 'usuarios',    variant: 'bubble' },
  { href: '/catalogs',  label: 'Catálogos',  icon: BookOpen,        module: 'catalogo',    variant: 'bubble' },
  { href: '/suppliers', label: 'Proveedores', icon: Truck,           module: 'proveedores', variant: 'bubble' },
];

export const SideBarMenu: React.FC = () => {
  const router = useRouter();
  const pathname = usePathname();
  const { userId, userName, userRole, isDev, logoutLocal } = useAuth();
  const { hasModuleAccess } = usePermissions();
  const [showProfile, setShowProfile] = useState(false);

  const avatarName = userName.replace(/[._-]/g, " ");

  const handleLogout = async () => {
    await logoutLocal();
    if (Platform.OS === "web" && typeof window !== "undefined") {
      window.location.replace("/");
    } else {
      router.replace("/" as any);
    }
  };

  const isActive = (path: string) => {
    return pathname === path || pathname.startsWith(`${path}/`);
  };

  // Filtrar items según permisos del usuario
  const visiblePills = useMemo(
    () => NAV_ITEMS.filter(item => item.variant === 'pill' && hasModuleAccess(item.module)),
    [hasModuleAccess]
  );

  const visibleBubbles = useMemo(
    () => NAV_ITEMS.filter(item => item.variant === 'bubble' && hasModuleAccess(item.module)),
    [hasModuleAccess]
  );

  // Configuraciones siempre visible (cada usuario accede a sus propias config)
  const showSettings = hasModuleAccess('configuraciones');

  return (
    <nav className="w-full h-16 bg-[radial-gradient(ellipse_at_center,_#242c3b_0%,_#15335c_100%)] flex items-center px-4 md:px-6 shadow-md shrink-0 relative z-50">
      {/* 1. Logo y Nombre */}
      <div className="flex items-center gap-3 shrink-0 mr-4">
        <div
          className="w-8 h-8 bg-white dark:bg-slate-800"
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
        <span className="font-bold text-white text-lg tracking-wide whitespace-nowrap">
          Distribuidora MH
        </span>
      </div>

      {/* 2. Un Espacio */}
      <div className="mr-12 md:mr-24 lg:mr-32 px-4"></div>

      {/* 3. Boton Dev (si aplica) */}
      {isDev && (
        <div className="shrink-0 mr-4">
          <Link href="/(dev)/devpanel" asChild>
            <a
              className={`flex items-center justify-center w-10 h-10 rounded-full transition-colors border ${isActive("/(dev)/devpanel")
                ? "bg-white dark:bg-slate-800/20 border-white/30 text-white"
                : "bg-[#15335c] border-transparent hover:bg-black/20 text-slate-300 hover:text-white"
                }`}
              title="Dev Panel"
            >
              <Wrench size={18} />
            </a>
          </Link>
        </div>
      )}

      {/* 4. Marco con pills dinámicas */}
      {visiblePills.length > 0 && (
        <div className="flex items-center bg-white dark:bg-slate-800 p-1 rounded-full shrink-0 mr-4 shadow-sm border border-slate-200 dark:border-slate-700">
          {visiblePills.map((item) => (
            <Link key={item.href} href={item.href as any} asChild>
              <a
                className={`flex items-center gap-1.5 px-5 py-2 rounded-full font-semibold transition-all duration-200 text-sm ${isActive(item.href)
                  ? "bg-[#15335c] text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-900"
                  }`}
              >
                <item.icon size={16} />
                {item.label}
              </a>
            </Link>
          ))}
        </div>
      )}

      {/* 5. Burbujas dinámicas */}
      {visibleBubbles.length > 0 && (
        <div className="flex items-center gap-2 shrink-0">
          {visibleBubbles.map((item) => (
            <Link key={item.href} href={item.href as any} asChild>
              <a
                className={`flex items-center justify-center w-10 h-10 rounded-full transition-all border ${isActive(item.href)
                  ? "bg-[#38bdf8]/20 border-[#38bdf8]/50 text-[#38bdf8] shadow-sm"
                  : "bg-[#15335c] border-transparent hover:bg-black/20 text-slate-300 hover:text-white"
                  }`}
                title={item.label}
              >
                <item.icon size={18} />
              </a>
            </Link>
          ))}
        </div>
      )}

      {/* 6. Das el salto */}
      <div className="flex-1 min-w-[20px]"></div>

      {/* 7. Notificaciones, Configuraciones y la burbuja de Perfil */}
      <div className="flex items-center gap-3 shrink-0">
        <NotificationFlyoutMenu />

        {showSettings && (
          <Link href="/settings" asChild>
            <a
              className={`flex items-center justify-center w-10 h-10 rounded-full transition-all border ${isActive("/settings")
                ? "bg-[#38bdf8]/20 border-[#38bdf8]/50 text-[#38bdf8] shadow-sm"
                : "bg-[#15335c] border-transparent hover:bg-black/20 text-slate-300 hover:text-white"
                }`}
              title="Configuraciones"
            >
              <Settings size={18} />
            </a>
          </Link>
        )}

        {/* Separador vertical sutil */}
        <div className="w-px h-8 bg-white dark:bg-slate-800/10 mx-1"></div>

        {/* Burbuja Perfil y Menú */}
        <div className="relative">
          <button
            onClick={() => setShowProfile(!showProfile)}
            className={`w-10 h-10 rounded-full overflow-hidden border-2 transition-all shadow-sm focus:outline-none ${showProfile
              ? "border-[#abf62d] ring-2 ring-[#abf62d]/30"
              : "border-[#abf62d]"
              }`}
          >
            <img
              src={`https://ui-avatars.com/api/?name=${encodeURIComponent(
                avatarName,
              )}&background=0D8ABC&color=fff&bold=true`}
              alt="Perfil de Usuario"
              className="w-full h-full object-cover"
            />
          </button>

          {showProfile && (
            <div className="absolute right-0 mt-3 w-72 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden z-50 transform origin-top-right animate-in fade-in zoom-in-95 duration-100">
              {/* Header Decorativo */}
              <div className="bg-[radial-gradient(ellipse_at_center,_#15335c_0%,_#15335c_100%)] p-5 flex items-center gap-4 border-b border-slate-800">
                <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-[#abf62d] shadow-md shrink-0 bg-white dark:bg-slate-800">
                  <img
                    src={`https://ui-avatars.com/api/?name=${encodeURIComponent(avatarName)}&background=0D8ABC&color=fff&bold=true&size=120`}
                    alt="Perfil"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex flex-col overflow-hidden text-white">
                  <p className="text-lg font-extrabold truncate drop-shadow-sm">
                    {userName}
                  </p>
                  <p className="text-xs font-medium text-slate-300 uppercase tracking-widest mt-0.5 truncate">
                    {userRole}
                  </p>
                </div>
              </div>

              {/* Información Adicional Breve */}
              <div className="p-4 bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-700 flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#abf62d] shadow-[0_0_8px_#abf62d] animate-pulse"></div>
                    <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                      En Línea
                    </span>
                  </div>
                  {userId && (
                    <span className="bg-slate-200 text-slate-500 dark:text-slate-400 font-mono text-[10px] px-2 py-0.5 rounded-full">
                      ID: {userId.split("-")[0]}
                    </span>
                  )}
                </div>

                {userRole !== "ADMIN" && userRole !== "DEV" && (
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                    Módulos habilitados según tus permisos específicos de{" "}
                    {userRole}. Contacta al administrador si requieres ajustes.
                  </p>
                )}
              </div>

              {/* Acciones */}
              <div className="p-3 bg-white dark:bg-slate-800">
                <button
                  onClick={handleLogout}
                  className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 active:scale-[0.98] rounded-xl transition-all duration-200 text-sm font-bold border border-red-100"
                >
                  <LogOut size={18} strokeWidth={2.5} />
                  Cerrar Sesión
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default SideBarMenu;
