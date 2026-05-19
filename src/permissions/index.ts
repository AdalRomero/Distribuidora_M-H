// src/permissions/index.ts
// ─── Barrel export — importar todo desde 'src/permissions' ───────────────────

// Constantes y tipos
export {
  MODULES,
  MODULE_PERMISSIONS,
  ALL_PERMISSIONS,
  LEGACY_BORRAR_PERMISSIONS,
  SYSTEM_ROLES,
  ROLE_DEFAULT_PERMISSIONS,
  getModuleViewPermission,
  type AppModule,
  type Permission,
  type SystemRole,
} from './constants';

// Motor puro (sin React)
export {
  resolveEffectivePermissions,
  can,
  hasModuleAccess,
  canAny,
  canAll,
  getAccessibleModules,
  type ResolvedUser,
  type LegacyPermissions,
} from './engine';

// Hook de React
export { usePermissions, type UsePermissionsReturn } from './usePermissions';

// Componentes de React
export {
  PermissionGate,
  ModuleGate,
  AnyPermissionGate,
  ProtectedButton,
  NoAccessPage,
} from './components';
