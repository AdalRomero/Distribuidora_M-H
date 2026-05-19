// src/permissions/usePermissions.ts
// ─── Hook global de permisos — Offline-First ─────────────────────────────────
// Lee desde WatermelonDB (nunca Supabase directo).
// Se cachea en memoria y se recalcula solo cuando cambia el usuario o los permisos.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { database } from '../services/DB/indexBD';
import {
  resolveEffectivePermissions,
  can as canFn,
  hasModuleAccess as hasModuleAccessFn,
  canAny as canAnyFn,
  canAll as canAllFn,
  getAccessibleModules as getAccessibleModulesFn,
  type LegacyPermissions,
  type ResolvedUser,
} from './engine';
import type { Permission, AppModule, SystemRole } from './constants';

export interface UsePermissionsReturn {
  /** Whether permissions have been loaded */
  isLoaded: boolean;
  /** Set of all effective permissions for the current user */
  permissions: Set<Permission>;
  /** Check a single permission */
  can: (permission: Permission) => boolean;
  /** Check if user has access to a module (*.ver) */
  hasModuleAccess: (mod: AppModule) => boolean;
  /** Check if user has ANY of the listed permissions */
  canAny: (perms: Permission[]) => boolean;
  /** Check if user has ALL of the listed permissions */
  canAll: (perms: Permission[]) => boolean;
  /** Get modules the user can access (for sidebar) */
  accessibleModules: AppModule[];
  /** Can the user soft-delete? (backward compat with canDelete) */
  canDelete: boolean;
  /** Force reload permissions (e.g., after sync) */
  reload: () => Promise<void>;
}

const EMPTY_PERMS = new Set<Permission>();

export function usePermissions(): UsePermissionsReturn {
  const { userId, userRole } = useAuth();
  const [permissions, setPermissions] = useState<Set<Permission>>(EMPTY_PERMS);
  const [isLoaded, setIsLoaded] = useState(false);

  const loadPermissions = useCallback(async () => {
    if (!userId) {
      setPermissions(EMPTY_PERMS);
      setIsLoaded(true);
      return;
    }

    try {
      // 1. Leer permisos legacy de WatermelonDB
      let legacyPerms: LegacyPermissions = {
        inventario: false,
        clientes: false,
        facturas: false,
        precios: false,
        usuarios: false,
        configuraciones: false,
        borrar: false,
      };

      try {
        const permRecord = await database.get('permisos').find(userId) as any;
        if (permRecord) {
          legacyPerms = {
            inventario: !!permRecord.inventario,
            clientes: !!permRecord.clientes,
            facturas: !!permRecord.facturas,
            precios: !!permRecord.precios,
            usuarios: !!permRecord.usuarios,
            configuraciones: !!permRecord.configuraciones,
            borrar: !!permRecord.borrar,
          };
        }
      } catch {
        // No permissions record found — use defaults only
      }

      // 2. Leer overrides granulares (nueva columna, null si no existe aún)
      let granularOverrides: Permission[] | null = null;
      try {
        const permRecord = await database.get('permisos').find(userId) as any;
        if (permRecord && permRecord.permisosGranulares) {
          const parsed = JSON.parse(permRecord.permisosGranulares);
          if (Array.isArray(parsed)) {
            granularOverrides = parsed;
          }
        }
      } catch {
        // Column doesn't exist yet or parse failed — use legacy only
      }

      // 3. Resolver permisos efectivos
      const resolved: ResolvedUser = {
        userId,
        role: (userRole || 'Empleado') as SystemRole,
        legacyPermissions: legacyPerms,
        granularOverrides,
      };

      const effective = resolveEffectivePermissions(resolved);
      setPermissions(effective);
    } catch (e) {
      console.error('[usePermissions] Error loading permissions:', e);
      // Fallback: solo defaults del rol
      const { ROLE_DEFAULT_PERMISSIONS } = require('./constants');
      const defaults = ROLE_DEFAULT_PERMISSIONS[(userRole || 'Empleado') as SystemRole] ?? [];
      setPermissions(new Set(defaults));
    } finally {
      setIsLoaded(true);
    }
  }, [userId, userRole]);

  // Cargar al montar y cuando cambie el usuario
  useEffect(() => {
    loadPermissions();
  }, [loadPermissions]);

  // Helpers memoizados
  const can = useCallback(
    (permission: Permission) => canFn(permissions, permission),
    [permissions]
  );

  const hasModuleAccess = useCallback(
    (mod: AppModule) => hasModuleAccessFn(permissions, mod),
    [permissions]
  );

  const canAny = useCallback(
    (perms: Permission[]) => canAnyFn(permissions, perms),
    [permissions]
  );

  const canAll = useCallback(
    (perms: Permission[]) => canAllFn(permissions, perms),
    [permissions]
  );

  const accessibleModules = useMemo(
    () => getAccessibleModulesFn(permissions),
    [permissions]
  );

  const canDelete = useMemo(
    () => canFn(permissions, 'inventario.borrar') || canFn(permissions, 'clientes.borrar'),
    [permissions]
  );

  return {
    isLoaded,
    permissions,
    can,
    hasModuleAccess,
    canAny,
    canAll,
    accessibleModules,
    canDelete,
    reload: loadPermissions,
  };
}
