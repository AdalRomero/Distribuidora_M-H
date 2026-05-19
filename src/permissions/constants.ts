// src/permissions/constants.ts
// ─── Definición Central y Única de todos los permisos del sistema ────────────
// REGLA: Todo nuevo permiso se agrega AQUÍ y solo aquí.

// ─── Módulos ─────────────────────────────────────────────────────────────────

export const MODULES = [
  'inicio',
  'inventario',
  'facturas',
  'clientes',
  'precios',
  'usuarios',
  'configuraciones',
  'proveedores',
  'catalogo',
] as const;

export type AppModule = (typeof MODULES)[number];

// ─── Acciones por módulo ─────────────────────────────────────────────────────

export const MODULE_PERMISSIONS = {
  inicio: ['inicio.ver'] as const,

  inventario: [
    'inventario.ver',
    'inventario.crear',
    'inventario.editar',
    'inventario.ajustar',
    'inventario.borrar',
  ] as const,

  facturas: [
    'facturas.ver',
    'facturas.crear',
    'facturas.editar',
    'facturas.cancelar',
    'facturas.borrar',
  ] as const,

  clientes: [
    'clientes.ver',
    'clientes.crear',
    'clientes.editar',
    'clientes.borrar',
  ] as const,

  precios: [
    'precios.ver',
    'precios.crear',
    'precios.editar',
    'precios.borrar',
  ] as const,

  usuarios: [
    'usuarios.ver',
    'usuarios.crear',
    'usuarios.editar',
    'usuarios.borrar',
    'usuarios.permisos',
  ] as const,

  configuraciones: [
    'configuraciones.ver',
    'configuraciones.editar',
    'configuraciones.plantillas',
    'configuraciones.globales',
  ] as const,

  proveedores: [
    'proveedores.ver',
    'proveedores.crear',
    'proveedores.editar',
    'proveedores.borrar',
  ] as const,

  catalogo: [
    'catalogo.ver',
    'catalogo.crear',
    'catalogo.editar',
    'catalogo.borrar',
  ] as const,
} as const;

// Tipo derivado automáticamente de la constante
type PermissionValues = (typeof MODULE_PERMISSIONS)[AppModule];
export type Permission = PermissionValues[number];

// Lista plana de todos los permisos (para validaciones, iteraciones, UI)
export const ALL_PERMISSIONS: Permission[] = Object.values(MODULE_PERMISSIONS).flat() as Permission[];

// ─── Permiso especial heredado ───────────────────────────────────────────────
// El permiso "borrar" legacy (tabla actual) se mapea a TODOS los *.borrar
export const LEGACY_BORRAR_PERMISSIONS: Permission[] = ALL_PERMISSIONS.filter(p => p.endsWith('.borrar'));

// ─── Roles del sistema ──────────────────────────────────────────────────────

export const SYSTEM_ROLES = ['DEV', 'Administrador', 'Supervisor', 'Ventas', 'Empleado', 'Cobranza'] as const;
export type SystemRole = (typeof SYSTEM_ROLES)[number];

// ─── Permisos default por rol ────────────────────────────────────────────────
// Estos se aplican automáticamente. Los permisos individuales de la tabla
// `permisos` EXTIENDEN estos defaults (nunca los reducen, excepto revocación explícita).

export const ROLE_DEFAULT_PERMISSIONS: Record<SystemRole, readonly Permission[]> = {
  DEV: ALL_PERMISSIONS, // Acceso total

  Administrador: ALL_PERMISSIONS, // Acceso total

  Supervisor: [
    'inicio.ver',
    'inventario.ver', 'inventario.crear', 'inventario.editar', 'inventario.ajustar',
    'facturas.ver', 'facturas.crear', 'facturas.editar', 'facturas.cancelar',
    'clientes.ver', 'clientes.crear', 'clientes.editar',
    'precios.ver', 'precios.crear', 'precios.editar',
    'configuraciones.ver', 'configuraciones.editar',
    'proveedores.ver', 'proveedores.crear', 'proveedores.editar',
    'catalogo.ver', 'catalogo.crear', 'catalogo.editar',
  ],

  Ventas: [
    'inicio.ver',
    'inventario.ver',
    'facturas.ver', 'facturas.crear',
    'clientes.ver', 'clientes.crear', 'clientes.editar',
    'precios.ver',
    'configuraciones.ver',
    'proveedores.ver',
    'catalogo.ver',
  ],

  Empleado: [
    'inventario.ver', 'inventario.crear', 'inventario.editar',
    'clientes.ver',
    'configuraciones.ver',
    'proveedores.ver',
    'catalogo.ver',
  ],

  Cobranza: [
    'inicio.ver',
    'facturas.ver',
    'clientes.ver',
    'configuraciones.ver',
    'catalogo.ver',
  ],
} as const;

// ─── Módulos que requieren acceso visual del módulo (*.ver) ──────────────────
// Se usa para construir la sidebar dinámicamente

export function getModuleViewPermission(mod: AppModule): Permission {
  return `${mod}.ver` as Permission;
}
