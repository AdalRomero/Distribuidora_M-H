# Arquitectura Enterprise — Distribuidora M-H
## Parte 1: Análisis, Problemas y Diseños Críticos

---

## 1. ANÁLISIS DE LA ARQUITECTURA ACTUAL

### 1.1 Componentes Auditados

| Capa | Archivo(s) | Rol | Estado |
|------|-----------|-----|--------|
| DB Local (Native) | `databaseAdapter.native.ts` | SQLiteAdapter con JSI | ✅ Óptimo |
| DB Local (Web) | `databaseAdapter.web.ts` | LokiJSAdapter + IndexedDB | ⚠️ Limitado |
| Schema | `schema.ts` (v30, 18 tablas) | Definición de tablas | ⚠️ Faltan campos enterprise |
| Sync | `sync.ts` | Pull/Push via RPC | ⚠️ Monolítico |
| Auth | `AuthContext.tsx` | Sesión local vía AsyncStorage | 🔴 Sin expiración offline |
| Integridad | `IntegrityContext.tsx` + rules | Detección de inconsistencias | ✅ Buena base |
| Realtime | `RealtimeProvider.tsx` | WebSocket + debounce sync | ✅ Funcional |
| Settings | `SettingsContext.tsx` | Tema/Hotkeys en AsyncStorage | ✅ Correcto |

### 1.2 Fortalezas Detectadas

1. **Offline-First real**: UI siempre lee de WatermelonDB, nunca de Supabase directo.
2. **Anti-wipe**: Protección contra borrados masivos en 9 tablas críticas (umbral >10).
3. **Cuarentena**: `bitacora_errores` rescata payloads rechazados por Supabase sin romper la cola de sync.
4. **Limpieza de UUIDs corruptos**: Pre-sync cleanup en 4 tablas.
5. **Integrity Engine**: Sistema declarativo de reglas con detect/fix/formatItem.
6. **Dual adapter**: SQLite (native) / LokiJS (web) con `.d.ts` de puente.
7. **Fotografía de datos en documentos**: `descripcion_aplicada`, `precio_unitario_aplicado` — inmunidad a cambios de catálogo.

---

## 2. PROBLEMAS Y RIESGOS CRÍTICOS

### 🔴 P1 — Autenticación sin expiración offline

```
// AuthContext.tsx línea 29-31
const storedId = await AsyncStorage.getItem("activeUserId");
if (storedId) {
  await loadProfileData(storedId);
}
```

**Problema**: Solo guarda `activeUserId`. Sin timestamp de último login online, sin TTL, sin device_id. Un vendedor podría usar la app **indefinidamente** sin conectarse, impidiendo que un admin le revoque acceso.

**Riesgo real**: Despides a un empleado, le revocas permisos en Supabase, pero su dispositivo sigue funcionando offline con acceso total porque nunca se valida expiración.

---

### 🔴 P2 — Sin versionado de registros (Lost Update Problem)

**Ninguna tabla tiene `_version`**. Solo tienen `updated_at` (timestamp).

**Escenario de pérdida de datos**:
1. Dispositivo A edita producto X offline a las 10:00 (precio: $100→$150)
2. Dispositivo B edita producto X offline a las 10:05 (precio: $100→$200)  
3. Ambos sincronizan. **El último en llegar sobreescribe al otro sin detectar conflicto**.

El `updated_at` no es suficiente porque ambos dispositivos tienen relojes diferentes y WatermelonDB's sync usa "last write wins" por defecto.

---

### 🔴 P3 — Stock mutable directo en lotes

```
// lotes schema
{ name: "cantidad", type: "number" }
```

**Problema**: `lote.cantidad` se modifica directamente. No hay forma de reconstruir cómo llegó a ese número. Si hay una discrepancia de inventario, no puedes auditar qué pasó.

**Existe** `movimientos_inventario`, pero la tabla de lotes permite escritura directa en `cantidad` sin pasar por un movimiento, creando dos "fuentes de verdad" que pueden divergir.

---

### 🟠 P4 — Documentos mutables

```
// documentos schema
{ name: "estado", type: "string" }  // Se puede cambiar directamente
```

Los documentos (facturas/cotizaciones) permiten cambios directos de `estado`, `total`, etc. No hay registro de **quién** canceló, **cuándo**, ni **por qué**. Una factura emitida debería ser inmutable; solo se le aplican operaciones (cancelar, generar nota crédito).

---

### 🟠 P5 — Sync monolítico sin journal

`sync.ts` ejecuta `synchronize()` como una operación atómica completa. No hay:
- Journal de qué se envió/recibió
- Priorización (facturas antes que configuraciones)
- Retry selectivo por tabla
- Registro de cuánto tardó cada sync

Si la sync falla a mitad de push, no hay forma de saber **qué registros** ya se procesaron.

---

### 🟠 P6 — No hay soft delete real

Las tablas usan `estado: boolean` como borrado lógico, pero:
- No hay `deleted_at` (cuándo se borró)
- No hay `deleted_by` (quién lo borró)
- No hay restauración controlada
- El sync sí permite `destroyPermanently()` (hard delete) en cuarentena

---

### 🟡 P7 — Web adapter limitado

```typescript
// databaseAdapter.web.ts
useWebWorker: false,  // ⚠️ Sin web worker
useIncrementalIndexedDB: true,
```

Sin WebWorker, las queries pesadas bloquean el hilo principal en web. Con datasets grandes (>5000 productos), el dashboard puede congelarse.

---

### 🟡 P8 — Sin auditoría de cambios

`bitacora_errores` solo registra errores de sync. No existe un **audit trail** de cambios normales (quién cambió un precio, quién editó un cliente, desde qué dispositivo).

---

## 3. DISEÑO: AUTENTICACIÓN OFFLINE HÍBRIDA

### 3.1 Nuevas columnas en schema (migración v31)

```typescript
// Agregar a tabla "perfiles"
{ name: "device_id", type: "string", isOptional: true },
{ name: "last_online_at", type: "number", isOptional: true },
{ name: "offline_ttl_hours", type: "number", isOptional: true },
{ name: "cached_permissions_json", type: "string", isOptional: true },
```

### 3.2 Nueva tabla `sesiones_dispositivo`

```typescript
tableSchema({
  name: "sesiones_dispositivo",
  columns: [
    { name: "perfil_id", type: "string", isIndexed: true },
    { name: "device_id", type: "string" },
    { name: "device_name", type: "string", isOptional: true },
    { name: "last_online_at", type: "number" },
    { name: "offline_ttl_hours", type: "number" },  
    { name: "is_active", type: "boolean" },
    { name: "revoked_at", type: "number", isOptional: true },
    { name: "created_at", type: "number" },
    { name: "updated_at", type: "number" },
  ],
})
```

### 3.3 Flujo de autenticación

```
┌─────────────────────────────────────────────────────────┐
│                    PRIMER LOGIN                          │
│                                                          │
│  1. Usuario ingresa credenciales                         │
│  2. Supabase Auth valida online (OBLIGATORIO)            │
│  3. Se genera device_id = Crypto.randomUUID()            │
│  4. Se cachea en AsyncStorage:                           │
│     - activeUserId                                       │
│     - deviceId                                           │
│     - lastOnlineAt = Date.now()                          │
│     - offlineTtlHours (según rol)                        │
│     - cachedPermissions = JSON del perfil+permisos       │
│  5. Se crea registro en sesiones_dispositivo             │
│  6. Primera sync completa                                │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                   LOGINS POSTERIORES                     │
│                                                          │
│  1. App arranca, lee AsyncStorage                        │
│  2. Calcula: horasOffline = (now - lastOnlineAt) / 3600  │
│  3. SI horasOffline < offlineTtlHours:                   │
│     → Login offline OK, usar cachedPermissions           │
│  4. SI horasOffline >= offlineTtlHours:                  │
│     → Requiere conexión online para renovar              │
│     → Si no hay red: modo lectura o bloqueo              │
│  5. Cuando hay red: refresh automático de sesión         │
│     → Actualizar lastOnlineAt                            │
│     → Verificar si sesión fue revocada en servidor       │
│     → Actualizar permisos si cambiaron                   │
└─────────────────────────────────────────────────────────┘
```

### 3.4 TTL por rol

| Rol | TTL Offline | Modo al expirar |
|-----|-------------|-----------------|
| DEV | 72h | Solo lectura |
| Administrador | 24h | Solo lectura |
| Supervisor | 72h | Solo lectura |
| Vendedor | 168h (7 días) | Bloqueo total |

**Lógica**: Los vendedores en campo necesitan más autonomía offline. Los admins manejan datos más sensibles y deben validar sesión más frecuentemente.

### 3.5 Revocación remota

Cuando un admin desactiva un usuario en Supabase:
1. Se marca `sesiones_dispositivo.revoked_at = now()` en el servidor
2. En el próximo sync del dispositivo, el `pull_changes` incluye la sesión revocada
3. WatermelonDB aplica el cambio localmente
4. El `AuthContext` detecta `revoked_at != null` → cierra sesión inmediatamente

---

## 4. DISEÑO: VERSIONADO DE REGISTROS

### 4.1 Campos nuevos para tablas críticas

Agregar a: `productos`, `lotes`, `clientes`, `proveedores`, `documentos`, `plantillas_precios`

```typescript
{ name: "_version", type: "number" },           // Contador monotónico
{ name: "updated_by", type: "string", isOptional: true },  // perfil_id
{ name: "updated_device", type: "string", isOptional: true }, // device_id
```

### 4.2 Optimistic Concurrency Control

```
ESCRITURA LOCAL:
  1. Leer registro actual: version_actual = registro._version
  2. Modificar campos
  3. Guardar con _version = version_actual + 1
  4. Guardar updated_by = userId, updated_device = deviceId

PUSH A SUPABASE (en push_changes RPC):
  1. Para cada UPDATE recibido:
     a. Leer _version actual en Supabase
     b. SI _version_recibida == _version_servidor + 1:
        → Aplicar cambio normalmente
     c. SI _version_recibida <= _version_servidor:
        → CONFLICTO DETECTADO
        → Aplicar estrategia según tipo de entidad (ver sección 5)
        → Devolver en arreglo "conflictos" al cliente
```

### 4.3 Impacto en sync.ts

```typescript
// Nuevo arreglo en respuesta de push_changes
if (data && data.conflictos && data.conflictos.length > 0) {
  // Registrar cada conflicto en audit_log local
  // Aplicar resolución automática o marcar para revisión manual
}
```

---

## 5. DISEÑO: RESOLUCIÓN DE CONFLICTOS POR ENTIDAD

### 5.1 Matriz de estrategias

| Entidad | Estrategia | Razón |
|---------|-----------|-------|
| `productos` (precios) | **Last Write Wins + Audit** | Precios cambian frecuentemente, el último tiene razón |
| `productos` (datos base) | **Merge parcial campo a campo** | Dos usuarios pueden editar campos diferentes |
| `clientes` | **Merge parcial** | Un vendedor edita teléfono, otro edita dirección |
| `lotes.cantidad` | **NO APLICA** — solo movimientos | La cantidad nunca se edita directamente |
| `documentos` | **Append-only** | Las facturas no se editan, solo se les aplican operaciones |
| `configuraciones` | **Server Wins + Notificación** | Admin central tiene autoridad |
| `plantillas_precios` | **Server Wins** | Política central de la empresa |

### 5.2 Merge parcial (ejemplo para clientes)

```
Servidor tiene:    { nombre: "Juan", telefono: "555-1234", ciudad: "CDMX", _version: 5 }
Dispositivo envía: { nombre: "Juan P.", telefono: "555-1234", ciudad: "CDMX", _version: 5 }
Otro disp. envió:  { nombre: "Juan", telefono: "555-9999", ciudad: "CDMX", _version: 5 }

→ El servidor ya tiene _version: 6 (del otro dispositivo, cambió teléfono)
→ Este dispositivo envía _version: 5 (cambió nombre)
→ CONFLICTO: ambos parten de _version 5

RESOLUCIÓN MERGE:
  - nombre: "Juan P." (del dispositivo actual, porque servidor no lo cambió)
  - telefono: "555-9999" (del servidor, porque el dispositivo actual no lo cambió)
  - _version: 7
  - Se registra en audit_log con ambas versiones
```

### 5.3 Implementación en RPC `push_changes`

```sql
-- Pseudocódigo del merge parcial en PostgreSQL
CREATE OR REPLACE FUNCTION resolve_conflict_merge(
  p_table TEXT,
  p_id UUID,
  p_incoming JSONB,
  p_incoming_version INT
) RETURNS JSONB AS $$
DECLARE
  v_current RECORD;
  v_base_version INT;
  v_merged JSONB;
BEGIN
  -- Obtener registro actual del servidor
  EXECUTE format('SELECT * FROM %I WHERE id = $1', p_table)
    INTO v_current USING p_id;
  
  -- Si versiones coinciden, no hay conflicto
  IF v_current._version = p_incoming_version THEN
    RETURN p_incoming;  -- Aplicar directo
  END IF;
  
  -- Merge campo a campo: incoming gana solo si cambió ese campo
  v_merged := to_jsonb(v_current);
  FOR key IN SELECT jsonb_object_keys(p_incoming) LOOP
    -- Si el campo incoming difiere del base Y el servidor no lo cambió
    -- → aplicar el incoming
    -- (requiere almacenar snapshot base, ver sección de audit)
  END LOOP;
  
  v_merged := v_merged || jsonb_build_object('_version', v_current._version + 1);
  RETURN v_merged;
END;
$$ LANGUAGE plpgsql;
```

---

## 6. DISEÑO: INVENTARIO BASADO EN MOVIMIENTOS

### 6.1 Problema actual

```
lote.cantidad = 50  ← ¿Cómo llegó a 50? No hay forma de saberlo.
                      ¿Fueron 100 - 30 - 20? ¿O 10 + 40? Imposible auditar.
```

### 6.2 Principio: `cantidad` es DERIVADA, nunca escrita directamente

```
stock_actual(lote) = SUM(movimientos WHERE lote_id = X AND tipo IN ('entrada','ajuste_positivo'))
                   - SUM(movimientos WHERE lote_id = X AND tipo IN ('salida','ajuste_negativo','merma'))
```

### 6.3 Columnas mejoradas para `movimientos_inventario`

```typescript
tableSchema({
  name: "movimientos_inventario",
  columns: [
    { name: "almacen_id", type: "string", isIndexed: true },
    { name: "producto_id", type: "string", isIndexed: true },
    { name: "lote_id", type: "string", isIndexed: true, isOptional: true },
    { name: "usuario_id", type: "string", isIndexed: true },
    { name: "documento_id", type: "string", isOptional: true, isIndexed: true }, // ← NUEVO: traza a factura
    { name: "tipo", type: "string" },
    // Tipos: 'entrada' | 'salida' | 'ajuste_positivo' | 'ajuste_negativo' 
    //        | 'merma' | 'transferencia_entrada' | 'transferencia_salida'
    //        | 'apartado' | 'liberacion_apartado'
    { name: "cantidad", type: "number" },           // Siempre positivo
    { name: "cantidad_anterior", type: "number" },   // ← NUEVO: snapshot pre-movimiento
    { name: "cantidad_posterior", type: "number" },   // ← NUEVO: snapshot post-movimiento
    { name: "referencia", type: "string", isOptional: true }, // ← NUEVO: nota libre
    { name: "device_id", type: "string", isOptional: true },  // ← NUEVO
    { name: "created_at", type: "number" },
  ],
})
```

### 6.4 Flujo de venta (ejemplo)

```
1. Vendedor crea factura con 5 unidades del Producto A, Lote L1
2. Sistema lee lote L1.cantidad = 50 (cantidad_anterior)
3. Crea MovimientoInventario:
   - tipo: "salida"
   - cantidad: 5
   - cantidad_anterior: 50
   - cantidad_posterior: 45
   - documento_id: factura.id
4. Actualiza lote L1.cantidad = 45
5. En sync, el movimiento sube como registro immutable
6. Si hay conflicto, el servidor RECALCULA:
   stock = SUM(entradas) - SUM(salidas) para ese lote
```

### 6.5 Reconstrucción de stock (función de auditoría)

```typescript
async function recalcularStockLote(loteId: string): Promise<number> {
  const movimientos = await database
    .get<MovimientoInventario>('movimientos_inventario')
    .query(Q.where('lote_id', loteId))
    .fetch();
  
  let stock = 0;
  for (const mov of movimientos) {
    switch (mov.tipo) {
      case 'entrada':
      case 'ajuste_positivo':
      case 'transferencia_entrada':
      case 'liberacion_apartado':
        stock += mov.cantidad;
        break;
      case 'salida':
      case 'ajuste_negativo':
      case 'merma':
      case 'transferencia_salida':
      case 'apartado':
        stock -= mov.cantidad;
        break;
    }
  }
  return stock;
}
```

### 6.6 Regla de integridad: Stock ≠ Movimientos

```typescript
// Nueva regla para IntegrityEngine
{
  id: 'stock_vs_movimientos',
  label: 'Stock divergente de movimientos',
  severity: 'critical',
  triggers: ['startup', 'on_demand'],
  detect: async () => {
    const lotes = await database.get('lotes').query(Q.where('estado', true)).fetch();
    const divergentes = [];
    for (const lote of lotes) {
      const stockCalculado = await recalcularStockLote(lote.id);
      if (Math.abs(lote.cantidad - stockCalculado) > 0.001) {
        divergentes.push({ lote, esperado: stockCalculado, actual: lote.cantidad });
      }
    }
    return divergentes;
  },
  // ... fix: recalcular y corregir
}
```

---

## 7. DISEÑO: DOCUMENTOS INMUTABLES (APPEND-ONLY)

### 7.1 Principio

Una vez que un documento tiene `estado = 'completado'`, **NUNCA** se modifican sus campos monetarios ni sus detalles. Solo se le pueden aplicar **operaciones**:

| Operación | Efecto |
|-----------|--------|
| `cancelar` | Crea registro en `operaciones_documento`, revierte stock via movimientos |
| `nota_credito` | Crea nuevo documento tipo `nota_credito` referenciando al original |
| `pago_parcial` | Crea registro de pago, no modifica el documento |

### 7.2 Nueva tabla `operaciones_documento`

```typescript
tableSchema({
  name: "operaciones_documento",
  columns: [
    { name: "documento_id", type: "string", isIndexed: true },
    { name: "tipo_operacion", type: "string" },
    // 'cancelacion' | 'nota_credito' | 'pago' | 'reimpresion' | 'envio_email'
    { name: "usuario_id", type: "string" },
    { name: "device_id", type: "string", isOptional: true },
    { name: "motivo", type: "string", isOptional: true },
    { name: "monto", type: "number", isOptional: true },
    { name: "documento_relacionado_id", type: "string", isOptional: true },
    { name: "metadata_json", type: "string", isOptional: true },
    { name: "created_at", type: "number" },
  ],
})
```

### 7.3 Flujo de cancelación

```
1. Usuario solicita cancelar Factura F-001
2. Sistema crea OperacionDocumento(tipo='cancelacion', motivo='...', usuario_id)
3. Sistema cambia documento.estado = 'cancelado' (único campo que cambia)
4. Sistema crea MovimientosInventario de tipo 'entrada' para revertir stock
5. Todo queda trazado: quién, cuándo, por qué, y el stock se reconstruye
```

---

> **Continúa en Parte 2**: Sync avanzado, Auditoría, Soft Delete, Web vs Desktop, Métricas, Seguridad, Migraciones y Roadmap.
