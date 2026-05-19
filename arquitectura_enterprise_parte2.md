# Arquitectura Enterprise — Distribuidora M-H
## Parte 2: Sync, Auditoría, Seguridad, Migraciones y Roadmap

---

## 8. DISEÑO: SINCRONIZACIÓN AVANZADA

### 8.1 Problemas del sync actual

```typescript
// sync.ts actual — una sola llamada monolítica
await synchronize({
  database,
  pullChanges: async ({ lastPulledAt }) => {
    const { data } = await supabase.rpc("pull_changes", { last_pulled_at: lastPulledAt ?? 0 });
    return { changes: data.changes, timestamp: data.timestamp };
  },
  pushChanges: async ({ changes }) => { /* todo junto */ }
});
```

**Problemas**:
- Si falla a mitad, no sabe qué se procesó
- No hay registro de duración ni resultado
- No diferencia prioridades (una factura nueva vs un cambio de tema)
- No hay retry selectivo

### 8.2 Nueva tabla `sync_journal`

```typescript
tableSchema({
  name: "sync_journal",
  columns: [
    { name: "sync_id", type: "string" },             // UUID de la sesión de sync
    { name: "direction", type: "string" },            // 'pull' | 'push'
    { name: "status", type: "string" },               // 'started' | 'completed' | 'failed' | 'partial'
    { name: "tables_affected", type: "string" },      // JSON array de tablas
    { name: "records_pulled", type: "number" },
    { name: "records_pushed", type: "number" },
    { name: "records_rejected", type: "number" },
    { name: "conflicts_detected", type: "number" },
    { name: "duration_ms", type: "number" },
    { name: "error_message", type: "string", isOptional: true },
    { name: "device_id", type: "string" },
    { name: "created_at", type: "number" },
  ],
})
```

> **Nota**: Esta tabla NO se sincroniza a Supabase. Es solo local para diagnóstico.

### 8.3 Colas de prioridad

```
PRIORIDAD ALTA (sync inmediato):
  - documentos (facturas nuevas/cancelaciones)
  - movimientos_inventario
  - operaciones_documento

PRIORIDAD MEDIA (sync normal, cada 30s):
  - productos, lotes, clientes, proveedores
  - precios_especiales_*, plantillas_precios

PRIORIDAD BAJA (sync diferido, cada 5min o al cerrar app):
  - configuraciones (invoice_templates)
  - bitacora_errores
  - categorias_clientes, margenes, almacenes
```

### 8.4 Retry inteligente

```typescript
const RETRY_CONFIG = {
  maxRetries: 5,
  backoff: [1000, 3000, 10000, 30000, 60000], // ms entre intentos
  retryableErrors: [
    'NETWORK_ERROR',
    'TIMEOUT',
    'PGRST_TIMEOUT',
    '503',  // Service unavailable
  ],
  nonRetryableErrors: [
    'SYNC_BLOCKED_MASS_DELETION',
    'AUTH_EXPIRED',
    '401',
    '403',
  ],
};

// Flujo
async function syncWithRetry() {
  for (let attempt = 0; attempt < RETRY_CONFIG.maxRetries; attempt++) {
    try {
      await syncApp();
      return; // Éxito
    } catch (error) {
      const code = extractErrorCode(error);
      if (RETRY_CONFIG.nonRetryableErrors.includes(code)) {
        throw error; // No reintentar
      }
      await sleep(RETRY_CONFIG.backoff[attempt]);
    }
  }
  // Si llegamos aquí: marcar sync como fallido en journal
}
```

### 8.5 Sync parcial por roles

```
ADMINISTRADOR / DEV:
  → Sync completo (todas las tablas)

SUPERVISOR:
  → Sync completo excepto: perfiles de otros usuarios, configuraciones admin

VENDEDOR:
  → Sync limitado:
    - productos, lotes (solo lectura)
    - clientes (lectura + escritura de los asignados)
    - documentos (solo los propios)
    - movimientos_inventario (solo los propios)
```

Implementar en `pull_changes` RPC con filtro por `usuario_id`.

---

## 9. DISEÑO: SISTEMA DE AUDITORÍA

### 9.1 Nueva tabla `audit_log`

```typescript
tableSchema({
  name: "audit_log",
  columns: [
    { name: "tabla", type: "string", isIndexed: true },
    { name: "registro_id", type: "string", isIndexed: true },
    { name: "accion", type: "string" },  // 'create' | 'update' | 'delete' | 'restore'
    { name: "usuario_id", type: "string", isIndexed: true },
    { name: "device_id", type: "string" },
    { name: "campos_cambiados", type: "string", isOptional: true }, // JSON: ["precio_lista","descripcion"]
    { name: "valores_anteriores", type: "string", isOptional: true }, // JSON snapshot parcial
    { name: "valores_nuevos", type: "string", isOptional: true },     // JSON snapshot parcial
    { name: "created_at", type: "number", isIndexed: true },
  ],
})
```

### 9.2 Tablas auditadas obligatoriamente

| Tabla | Campos auditados | Justificación |
|-------|-----------------|---------------|
| `productos` | precio_lista, precio_mayoreo, precio_menudeo, costo_base, estado | Cambios de precio son críticos |
| `lotes` | cantidad, estado | Inventario físico |
| `clientes` | descuento_global, lista_precio_base, estado | Condiciones comerciales |
| `documentos` | estado | Cancelaciones |
| `plantillas_precios` | * | Política de precios |
| `reglas_plantilla` | * | Reglas de descuento |

### 9.3 Helper para crear audit entries

```typescript
// src/utils/auditHelper.ts
async function logAudit(params: {
  tabla: string;
  registroId: string;
  accion: 'create' | 'update' | 'delete' | 'restore';
  userId: string;
  deviceId: string;
  camposChanged?: string[];
  valoresAnteriores?: Record<string, any>;
  valoresNuevos?: Record<string, any>;
}) {
  await database.write(async () => {
    await database.get('audit_log').create((entry: any) => {
      entry._raw.id = Crypto.randomUUID();
      entry.tabla = params.tabla;
      entry.registroId = params.registroId;
      entry.accion = params.accion;
      entry.usuarioId = params.userId;
      entry.deviceId = params.deviceId;
      entry.camposCambiados = params.camposChanged 
        ? JSON.stringify(params.camposChanged) : null;
      entry.valoresAnteriores = params.valoresAnteriores 
        ? JSON.stringify(params.valoresAnteriores) : null;
      entry.valoresNuevos = params.valoresNuevos 
        ? JSON.stringify(params.valoresNuevos) : null;
    });
  });
}
```

### 9.4 Política de retención

```
LOCAL: Mantener últimos 90 días de audit_log
SUPABASE: Mantener todo (con particionamiento por mes)
LIMPIEZA: Ejecutar al arrancar la app, borrar logs locales > 90 días
```

---

## 10. DISEÑO: SOFT DELETE UNIVERSAL

### 10.1 Campos a agregar a TODAS las tablas que usan `estado: boolean`

```typescript
{ name: "deleted_at", type: "number", isOptional: true },
{ name: "deleted_by", type: "string", isOptional: true },
```

### 10.2 Tablas afectadas

`productos`, `lotes`, `clientes`, `proveedores`, `familias`, `impuestos`, `almacenes`, `margenes`, `categorias_clientes`, `plantillas_precios`, `invoice_templates`

### 10.3 Convención

```
estado = true   + deleted_at = null    → ACTIVO
estado = false  + deleted_at = null    → DESACTIVADO (pero visible en admin)
estado = false  + deleted_at = <ts>    → BORRADO LÓGICO (oculto en UI normal)
```

### 10.4 Restauración

```typescript
async function restaurarRegistro(tabla: string, id: string, userId: string) {
  await database.write(async () => {
    const record = await database.get(tabla).find(id);
    await record.update((r: any) => {
      r.estado = false;  // Restaurar como "desactivado", no activo directamente
      r.deletedAt = null;
      r.deletedBy = null;
    });
  });
  // Log en auditoría
  await logAudit({ tabla, registroId: id, accion: 'restore', userId, deviceId });
}
```

### 10.5 Limpieza programada (purga de borrados viejos)

```
Registros con deleted_at > 180 días → elegibles para hard delete
Solo ejecutar purga con confirmación de admin + sync completo previo
```

---

## 11. ESTRATEGIA: WEB vs DESKTOP

### 11.1 Diferencias de arquitectura

| Característica | Desktop (Native/Electron) | Web (Browser) |
|---|---|---|
| DB Engine | SQLite via JSI | LokiJS + IndexedDB |
| Capacidad de datos | Ilimitado práctico | ~50-100MB recomendado |
| Offline | Total e indefinido | Limitado por caché del browser |
| WebWorker | No necesario (JSI es nativo) | **Activar** `useWebWorker: true` |
| Sync | Completo | Parcial según rol |

### 11.2 Fix crítico para Web

```typescript
// databaseAdapter.web.ts — CAMBIAR:
export const getAdapter = () => {
  return new LokiJSAdapter({
    schema: mySchema,
    useWebWorker: true,  // ← CAMBIAR de false a true
    useIncrementalIndexedDB: true,
  });
};
```

### 11.3 Estrategia de datos para Web

```
WEB — DATOS QUE SÍ DESCARGAR:
  ✅ productos (catálogo completo, necesario para vender)
  ✅ lotes (stock actual)
  ✅ clientes (los asignados al usuario)
  ✅ familias, impuestos, margenes (catálogos pequeños)
  ✅ documentos (últimos 30 días)
  ✅ plantillas_precios, reglas

WEB — DATOS QUE NO DESCARGAR:
  ❌ movimientos_inventario históricos (volumen alto)
  ❌ audit_log (solo en desktop)
  ❌ sync_journal (solo local)
  ❌ bitacora_errores completa (solo últimos 50)
```

Implementar en `pull_changes` con un parámetro `platform: 'web' | 'native'`.

---

## 12. DISEÑO: MÉTRICAS DEL HOME (OPTIMIZADO)

### 12.1 Enfoque actual (ya optimizado)

El hook `useDashboardStats` ya usa `Q.between` con rangos de fecha. **Esto es correcto** y no necesita tabla de analytics pre-calculada.

### 12.2 Mejoras adicionales

**Caché de snapshots diarios** (opcional, solo si >10,000 documentos):

```typescript
// Nueva tabla liviana (NO sincronizada)
tableSchema({
  name: "stats_cache",
  columns: [
    { name: "fecha", type: "string" },  // "2026-05-19"
    { name: "tipo_metrica", type: "string" }, // "ventas_total" | "docs_count" | etc
    { name: "valor", type: "number" },
    { name: "created_at", type: "number" },
  ],
})
```

**Estrategia**: Al cerrar el día (primera apertura del día siguiente), calcular totales del día anterior y cachearlos. Las consultas del dashboard para períodos pasados leen del caché; solo el día actual se calcula en tiempo real.

### 12.3 Comparaciones avanzadas ya implementadas

El `DashboardFilter` con `periodA`/`periodB` + selector personalizado en `home.tsx` ya cubre:
- Semana 1 vs Semana 2
- Mes actual vs Mes anterior
- Año 1 vs Año 2
- Rango libre vs otro rango libre

---

## 13. SEGURIDAD Y RESILIENCIA

### 13.1 Validación de payloads pre-push

```typescript
// Antes de enviar cambios en pushChanges:
function validatePayload(changes: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // 1. Verificar que no hay IDs vacíos o inválidos
  for (const [table, data] of Object.entries(changes)) {
    for (const record of (data as any).created || []) {
      if (!record.id || record.id.length !== 36) {
        errors.push(`${table}: ID inválido ${record.id}`);
      }
    }
  }
  
  // 2. Verificar que campos monetarios no son negativos
  for (const doc of changes.documentos?.created || []) {
    if (doc.total < 0) errors.push(`Documento con total negativo: ${doc.id}`);
  }
  
  // 3. Verificar integridad referencial básica
  // (producto_id existe en productos locales, etc.)
  
  return { valid: errors.length === 0, errors };
}
```

### 13.2 Protección contra corrupción de DB

```typescript
// Ejecutar al arrancar la app
async function healthCheck(): Promise<{ ok: boolean; issues: string[] }> {
  const issues: string[] = [];
  
  // 1. Verificar que tablas críticas son legibles
  const criticalTables = ['productos', 'lotes', 'documentos', 'clientes'];
  for (const table of criticalTables) {
    try {
      await database.get(table).query().fetchCount();
    } catch (e) {
      issues.push(`Tabla ${table} corrupta o inaccesible`);
    }
  }
  
  // 2. Verificar que el sync no está bloqueado indefinidamente
  const blockedReason = localStorage.getItem('sync_blocked_reason');
  if (blockedReason) {
    issues.push(`Sync bloqueado: ${blockedReason}`);
  }
  
  return { ok: issues.length === 0, issues };
}
```

### 13.3 Backup local automático

```
Desktop: Exportar snapshot de WatermelonDB a archivo .json cada 24h
Web: No aplica (IndexedDB no es confiable para backups)
Retención: Últimos 3 backups (72h)
```

---

## 14. MIGRACIONES SEGURAS

### 14.1 Estrategia WatermelonDB

WatermelonDB usa migraciones incrementales via `schemaMigrations`. Cada cambio de schema **debe** tener su migración correspondiente.

```typescript
// Ejemplo: Migración v30 → v31
schemaMigrations({
  migrations: [
    {
      toVersion: 31,
      steps: [
        // Nuevas columnas en perfiles
        addColumns({ table: 'perfiles', columns: [
          { name: 'device_id', type: 'string', isOptional: true },
          { name: 'last_online_at', type: 'number', isOptional: true },
          { name: 'offline_ttl_hours', type: 'number', isOptional: true },
        ]}),
        // Nuevas columnas soft delete en productos
        addColumns({ table: 'productos', columns: [
          { name: '_version', type: 'number' },
          { name: 'updated_by', type: 'string', isOptional: true },
          { name: 'deleted_at', type: 'number', isOptional: true },
          { name: 'deleted_by', type: 'string', isOptional: true },
        ]}),
        // Nueva tabla
        createTable({
          name: 'audit_log',
          columns: [ /* ... */ ]
        }),
        // ... más pasos
      ],
    },
  ],
});
```

### 14.2 Reglas de oro

1. **Nunca borrar columnas** — solo agregar (con `isOptional: true`)
2. **Nunca renombrar tablas** — crear nueva, migrar datos, desactivar vieja
3. **Valores default para columnas nuevas** — `_version` default 0, `deleted_at` default null
4. **Testear migración en branch de Supabase** antes de producción
5. **Supabase primero** — Aplicar migración en Supabase ANTES de actualizar la app

### 14.3 Rollback

WatermelonDB **no soporta rollback nativo**. Estrategia:
1. Backup pre-migración (automático)
2. Si falla la migración → WatermelonDB hace `destroyDatabase()` y re-sync completo
3. El backup local permite restaurar si el re-sync también falla

---

## 15. ROADMAP POR FASES

### FASE 1 — Fundamentos (1-2 semanas)
> **Prioridad máxima. Sin esto, todo lo demás está en riesgo.**

| # | Tarea | Impacto |
|---|-------|---------|
| 1.1 | Agregar `_version`, `updated_by`, `deleted_at`, `deleted_by` a tablas críticas | Base para todo lo demás |
| 1.2 | Crear tabla `audit_log` | Trazabilidad |
| 1.3 | Crear tabla `sesiones_dispositivo` | Auth offline |
| 1.4 | Migración WatermelonDB v31 | Esquema |
| 1.5 | Migración Supabase equivalente | Backend |
| 1.6 | Implementar `device_id` persistente | Identificación |

### FASE 2 — Autenticación y Auditoría (1 semana)

| # | Tarea |
|---|-------|
| 2.1 | Refactorizar `AuthContext.tsx` con TTL offline |
| 2.2 | Implementar `logAudit()` helper |
| 2.3 | Integrar auditoría en operaciones de precio e inventario |
| 2.4 | Implementar revocación remota de sesiones |

### FASE 3 — Inventario transaccional (2 semanas)

| # | Tarea |
|---|-------|
| 3.1 | Agregar campos a `movimientos_inventario` (documento_id, cantidades snapshot) |
| 3.2 | Refactorizar creación de documentos para SIEMPRE crear movimiento |
| 3.3 | Crear `recalcularStockLote()` |
| 3.4 | Agregar regla de integridad `stock_vs_movimientos` |
| 3.5 | Crear tabla `operaciones_documento` |
| 3.6 | Refactorizar cancelación de documentos a append-only |

### FASE 4 — Sync avanzado (1-2 semanas)

| # | Tarea |
|---|-------|
| 4.1 | Crear tabla `sync_journal` (local only) |
| 4.2 | Implementar logging en sync.ts |
| 4.3 | Implementar retry con backoff |
| 4.4 | Activar `useWebWorker: true` en web adapter |
| 4.5 | Implementar validación de payload pre-push |

### FASE 5 — Conflictos y Resiliencia (2 semanas)

| # | Tarea |
|---|-------|
| 5.1 | Implementar optimistic concurrency en `push_changes` RPC |
| 5.2 | Implementar merge parcial para clientes |
| 5.3 | Implementar detección de conflictos en respuesta de push |
| 5.4 | Health check al arrancar la app |
| 5.5 | Backup local automático (desktop only) |

---

## 16. QUÉ NO HACER

| ❌ Evitar | ✅ Hacer en su lugar |
|-----------|---------------------|
| Crear tabla de analytics pre-calculada | Queries con `Q.between` + caché diario ligero |
| Refactorizar sync.ts completo de una vez | Agregar journal y retry incrementalmente |
| Borrar columna `estado` existente | Agregar `deleted_at` al lado, mantener `estado` |
| Forzar re-sync completo en cada migración | Migraciones incrementales con `addColumns` |
| Sync de audit_log a Supabase (ida y vuelta) | Sync solo de subida (push-only, sin pull) |
| Hard delete en cualquier tabla crítica | Soft delete universal con `deleted_at` |
| Implementar CRDT o event sourcing puro | Overkill para este volumen — versionado simple basta |

---

## 17. ESCENARIOS EDGE-CASE

| Escenario | Solución |
|-----------|----------|
| Dos vendedores venden el mismo lote offline | Los movimientos son append-only; al sync, el stock se recalcula. Si queda negativo → alerta en IntegrityEngine |
| Dispositivo offline 30 días con 500 facturas | Sync parcial por batches. El journal registra progreso. Si falla, retoma donde quedó |
| Admin cambia precio mientras vendedor tiene cotización abierta | La cotización tiene `precio_unitario_aplicado` (fotografía). No le afecta el cambio |
| Reinstalación de la app | Login online obligatorio → sync completo → restore de datos. Los datos locales (audit, journal) se pierden, pero Supabase tiene todo |
| Cambio de esquema con app vieja abierta | WatermelonDB detecta versión de schema diferente → ejecuta migración automáticamente al abrir |
| Dos dispositivos crean el mismo cliente offline | UUIDs garantizan que no colisionan. Si el RFC coincide, el RPC de Supabase lo detecta y lo pone en `rechazados` |

---

## 18. RECOMENDACIONES ENTERPRISE

1. **Monitoreo en Supabase**: Crear dashboard de métricas de sync (syncs/hora, rechazos/día, dispositivos activos)
2. **Alertas**: Configurar alerta si un dispositivo no sincroniza en >48h
3. **Rate limiting**: En `push_changes`, limitar a 500 registros por batch
4. **Compresión**: Los payloads JSON de audit_log y metadata pueden comprimirse con LZ-string antes de almacenar
5. **Índices en Supabase**: Asegurar índices en `updated_at` para cada tabla (el `pull_changes` filtra por timestamp)
6. **Particionamiento**: En Supabase, particionar `movimientos_inventario` y `audit_log` por mes cuando superen 100k registros
7. **Testing**: Crear suite de tests que simule 3 dispositivos offline editando los mismos registros y verificar que la resolución de conflictos produce el resultado esperado
