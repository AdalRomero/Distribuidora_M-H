// src/permissions/components.tsx
// ─── Componentes declarativos de protección ──────────────────────────────────
// Uso en cualquier pantalla sin ifs manuales.

import React from 'react';
import { usePermissions } from './usePermissions';
import type { Permission, AppModule } from './constants';

// ─── PermissionGate ──────────────────────────────────────────────────────────
// Renderiza children solo si el usuario tiene el permiso requerido.
// Si no tiene permiso, renderiza fallback (o nada).

interface PermissionGateProps {
  /** Permiso requerido: 'clientes.editar' */
  require: Permission;
  /** Contenido a mostrar si NO tiene permiso */
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export function PermissionGate({ require: perm, fallback = null, children }: PermissionGateProps) {
  const { can, isLoaded } = usePermissions();
  if (!isLoaded) return null;
  return can(perm) ? <>{children}</> : <>{fallback}</>;
}

// ─── ModuleGate ──────────────────────────────────────────────────────────────
// Renderiza children solo si el usuario tiene acceso al módulo.

interface ModuleGateProps {
  /** Módulo requerido: 'inventario' */
  module: AppModule;
  /** Fallback si no tiene acceso */
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export function ModuleGate({ module: mod, fallback = null, children }: ModuleGateProps) {
  const { hasModuleAccess, isLoaded } = usePermissions();
  if (!isLoaded) return null;
  return hasModuleAccess(mod) ? <>{children}</> : <>{fallback}</>;
}

// ─── AnyPermissionGate ───────────────────────────────────────────────────────
// Renderiza si tiene AL MENOS UNO de los permisos.

interface AnyPermissionGateProps {
  require: Permission[];
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export function AnyPermissionGate({ require: perms, fallback = null, children }: AnyPermissionGateProps) {
  const { canAny, isLoaded } = usePermissions();
  if (!isLoaded) return null;
  return canAny(perms) ? <>{children}</> : <>{fallback}</>;
}

// ─── ProtectedButton ─────────────────────────────────────────────────────────
// Un botón que se deshabilita/oculta automáticamente si falta el permiso.

interface ProtectedButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Permiso requerido para que el botón esté activo */
  require: Permission;
  /** 'hide' oculta el botón, 'disable' lo muestra deshabilitado */
  behavior?: 'hide' | 'disable';
  children: React.ReactNode;
}

export function ProtectedButton({
  require: perm,
  behavior = 'disable',
  children,
  className = '',
  ...props
}: ProtectedButtonProps) {
  const { can, isLoaded } = usePermissions();

  if (!isLoaded) return null;

  const allowed = can(perm);

  if (!allowed && behavior === 'hide') return null;

  return (
    <button
      {...props}
      disabled={!allowed || props.disabled}
      className={`${className} ${!allowed ? 'opacity-40 cursor-not-allowed' : ''}`}
      title={!allowed ? 'No tienes permiso para esta acción' : props.title}
    >
      {children}
    </button>
  );
}

// ─── NoAccessPage ────────────────────────────────────────────────────────────
// Página de "Sin acceso" reutilizable para rutas protegidas.

export function NoAccessPage({ moduleName }: { moduleName?: string }) {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-rose-50 dark:bg-rose-900/20 flex items-center justify-center">
          <svg className="w-8 h-8 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-2">
          Acceso Restringido
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          No tienes permisos para acceder al módulo
          {moduleName ? ` "${moduleName}"` : ''}. Contacta al administrador.
        </p>
      </div>
    </div>
  );
}
