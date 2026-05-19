// src/permissions/engine.ts
// ─── Motor de Permisos: Resolución offline-first ─────────────────────────────
// Este archivo NO tiene dependencias de React. Es puro TypeScript.
// Se puede usar en contextos, hooks, helpers, o incluso en sync.ts.

import {
  ALL_PERMISSIONS,
  LEGACY_BORRAR_PERMISSIONS,
  ROLE_DEFAULT_PERMISSIONS,
  type AppModule,
  type Permission,
  type SystemRole,
} from './constants';

// ─── Interfaz del usuario resuelto ──────────────────────────────────────────

export interface ResolvedUser {
  userId: string;
  role: SystemRole;
  /** Permisos legacy de la tabla `permisos` (los booleans actuales) */
  legacyPermissions: LegacyPermissions;
  /** Permisos granulares extendidos (JSON de la nueva columna, puede ser null) */
  granularOverrides: Permission[] | null;
}

/** Mapea la estructura actual de la tabla `permisos` */
export interface LegacyPermissions {
  inventario: boolean;
  clientes: boolean;
  facturas: boolean;
  precios: boolean;
  usuarios: boolean;
  configuraciones: boolean;
  borrar: boolean;
}

// ─── Resolución de permisos efectivos ───────────────────────────────────────

/**
 * Calcula los permisos efectivos de un usuario combinando:
 * 1. Defaults del rol (base)
 * 2. Legacy booleans (compatibilidad con tabla actual)
 * 3. Granular overrides (nueva columna JSON, cuando exista)
 *
 * Prioridad: granularOverrides > legacyPermissions > roleDefaults
 */
export function resolveEffectivePermissions(user: ResolvedUser): Set<Permission> {
  const { role, legacyPermissions, granularOverrides } = user;

  // 1. Base: permisos default del rol
  const roleKey = role as SystemRole;
  const defaults = ROLE_DEFAULT_PERMISSIONS[roleKey] ?? [];
  const effective = new Set<Permission>(defaults);

  // 2. Legacy bridge: los booleans de la tabla `permisos` actual
  // Si un boolean está en true, se agrega el módulo completo (.ver como mínimo)
  if (legacyPermissions) {
    mapLegacyToGranular(legacyPermissions, effective);
  }

  // 3. Si existen overrides granulares explícitos, SON la fuente de verdad final
  // (reemplazan el resultado de 1+2 completamente)
  if (granularOverrides !== null && granularOverrides.length > 0) {
    // En modo override, empezamos desde los defaults del rol
    // y SUMAMOS los overrides (nunca restamos sin revocación explícita)
    for (const perm of granularOverrides) {
      if (ALL_PERMISSIONS.includes(perm)) {
        effective.add(perm);
      }
    }
  }

  return effective;
}

/**
 * Convierte los booleans legacy de la tabla `permisos` en permisos granulares.
 * Esto permite que el sistema actual siga funcionando sin cambios.
 */
function mapLegacyToGranular(legacy: LegacyPermissions, target: Set<Permission>): void {
  // Cada boolean legacy se mapea al .ver del módulo
  // (mantiene compatibilidad: si tenías acceso al módulo, al menos puedes verlo)
  const mapping: Record<string, AppModule> = {
    inventario: 'inventario',
    clientes: 'clientes',
    facturas: 'facturas',
    precios: 'precios',
    usuarios: 'usuarios',
    configuraciones: 'configuraciones',
  };

  for (const [legacyKey, moduleName] of Object.entries(mapping)) {
    if ((legacy as any)[legacyKey] === true) {
      target.add(`${moduleName}.ver` as Permission);
    }
  }

  // El boolean "borrar" legacy se mapea a TODOS los *.borrar
  if (legacy.borrar === true) {
    for (const perm of LEGACY_BORRAR_PERMISSIONS) {
      target.add(perm);
    }
  }
}

// ─── Helpers de consulta ────────────────────────────────────────────────────

/**
 * ¿El usuario tiene un permiso específico?
 * Uso: can(permissions, 'clientes.editar')
 */
export function can(permissions: Set<Permission>, permission: Permission): boolean {
  return permissions.has(permission);
}

/**
 * ¿El usuario tiene acceso visual a un módulo?
 * Uso: hasModuleAccess(permissions, 'inventario')
 */
export function hasModuleAccess(permissions: Set<Permission>, mod: AppModule): boolean {
  return permissions.has(`${mod}.ver` as Permission);
}

/**
 * ¿El usuario tiene ALGUNO de los permisos listados?
 * Uso: canAny(permissions, ['facturas.crear', 'facturas.editar'])
 */
export function canAny(permissions: Set<Permission>, perms: Permission[]): boolean {
  return perms.some(p => permissions.has(p));
}

/**
 * ¿El usuario tiene TODOS los permisos listados?
 * Uso: canAll(permissions, ['usuarios.ver', 'usuarios.permisos'])
 */
export function canAll(permissions: Set<Permission>, perms: Permission[]): boolean {
  return perms.every(p => permissions.has(p));
}

/**
 * Devuelve los módulos accesibles para el sidebar.
 * Uso: getAccessibleModules(permissions) → ['inicio', 'inventario', ...]
 */
export function getAccessibleModules(permissions: Set<Permission>): AppModule[] {
  const modules: AppModule[] = [];
  const allModules: AppModule[] = [
    'inicio', 'inventario', 'facturas', 'clientes',
    'precios', 'usuarios', 'configuraciones', 'proveedores', 'catalogo'
  ];

  for (const mod of allModules) {
    if (hasModuleAccess(permissions, mod)) {
      modules.push(mod);
    }
  }

  return modules;
}
