# Distribuidora M-H - Contexto General de la Aplicación

Este documento sirve como referencia técnica y funcional completa de la arquitectura, pila tecnológica y el modelo de datos de la aplicación **Distribuidora M-H**, una solución móvil offline-first premium diseñada para la gestión comercial, control de inventarios, facturación y distribución.

---

## 1. Introducción y Propósito

**Distribuidora M-H** es una aplicación comercial robusta diseñada para operar en entornos con o sin conectividad permanente a internet (enfoque **Offline-First**). La aplicación permite el control integral de las operaciones del día a día de una distribuidora:

*   **Ventas y Facturación:** Creación de facturas, cotizaciones y pedidos detallados.
*   **Gestión de Clientes y Proveedores:** Directorios de contacto, asignación de listas de precios y condiciones comerciales.
*   **Control de Inventario Riguroso:** Administración de productos e inventarios clasificados por **Lotes** con semáforo de caducidad inteligente.
*   **Políticas de Precios Dinámicas:** Un potente motor de plantillas y reglas de descuento especiales por cliente, familia o producto.
*   **Gestión de Usuarios y Accesos:** Control de roles y permisos granulares para resguardar las operaciones críticas (como el borrado lógico).

---

## 2. Pila Tecnológica (Tech Stack)

La aplicación está construida sobre tecnologías modernas, optimizadas para el rendimiento reactivo y la portabilidad:

1.  **Frontend & Framework Móvil:**
    *   **React Native** con **Expo** (Expo SDK & Expo Router v2+).
    *   **Vite** / **Next.js** en componentes web de administración si aplica, utilizando Vanilla CSS.
    *   **Lucide React Native** para la iconografía dinámica.
2.  **Base de Datos Local (Offline Engine):**
    *   **WatermelonDB:** Base de datos relacional y altamente reactiva construida sobre SQLite (mediante adaptadores nativos rápidos). Utiliza `@nozbe/with-observables` y `RxJS` para reaccionar inmediatamente en la interfaz a cualquier cambio en los datos locales.
3.  **Backend & Base de Datos Remota:**
    *   **Supabase:** Base de datos en la nube (PostgreSQL), gestión de autenticación, funciones Edge, políticas de seguridad a nivel de fila (RLS) y procedimientos almacenados (RPCs) para la sincronización.
4.  **Sincronización:**
    *   Un adaptador bidireccional personalizado (`src/sync.ts`) que orquesta los flujos de `pull` y `push` contra Supabase y gestiona una cuarentena local para registros conflictivos o rechazados.

---

## 3. Sincronización y Resiliencia (Offline-First)

El núcleo offline de la aplicación se encuentra en `src/sync.ts`. Este archivo maneja la sincronización bidireccional mediante los RPCs de Supabase `pull_changes` y `push_changes`:

### Mecanismos Clave:
*   **Limpieza de Emergencia:** Antes de sincronizar, se analizan colecciones críticas y se destruyen permanentemente registros que tengan IDs no válidos (los IDs de WatermelonDB deben ser UUIDv4 de 36 caracteres) para evitar bucles de bloqueo del motor de sincronización.
*   **Cuarentena de Datos (Rescate):** En el proceso de `push`, si Supabase rechaza ciertos registros (ej. por violaciones de clave única, datos duplicados o inconsistencias), estos registros no bloquean la sincronización del resto de la cola. El sistema:
    1.  Extrae los registros rechazados y los guarda en la tabla local `bitacora_errores` con su respectivo `payloadJson` y mensaje de error.
    2.  Elimina inmediatamente los registros problemáticos de la base de datos local para despejar el canal de sincronización y evitar registros fantasma en la interfaz.

---

## 4. Modelo de Datos y Esquema Relacional

El esquema de base de datos relacional consta de 6 áreas principales. A continuación, se detallan las tablas representadas en WatermelonDB (`src/services/DB/schema.ts`) y sincronizadas en Supabase:

### 4.1. Usuarios, Perfiles y Accesos
*   `perfiles`: Representa la cuenta del usuario en local con su estado (Activo/Inactivo) y hash de contraseña para autenticación local.
*   `informacion_perfil`: Contiene los detalles personales del usuario (nombre, correo, apellidos) y su Rol.
    *   *Roles admitidos:* `DEV`, `Administrador`, `Ventas`, `Cobranza`, `Empleado`, `Personalizado`.
*   `permisos`: Tabla que define de forma granular los accesos para usuarios con rol `Personalizado`. Contiene banderas booleanas para el control de módulos:
    *   `inventario`, `clientes`, `facturas`, `precios`, `usuarios`, `configuraciones`.
    *   `borrar` *(Nueva Columna)*: Controla explícitamente quién puede efectuar la acción de borrado lógico en las tablas.

### 4.2. Catálogo de Clientes y Proveedores
*   `clientes`: Directorio maestro de clientes con campos de facturación (RFC, dirección fiscal, descuento global y lista de precios base asignada).
*   `contactos`: Vínculo secundario uno a muchos para registrar teléfonos, correos o medios de contacto de un cliente.
*   `proveedores`: Fichas comerciales de proveedores.
*   `proveedor_contactos`: Contactos asociados a cada proveedor.
*   `proveedor_productos`: Tabla de unión que vincula qué productos surte cada proveedor, almacenando tiempos de entrega y precios de compra pactados.

### 4.3. Productos, Inventarios y Lotes
*   `familias`: Agrupaciones lógicas de productos. Contiene umbrales en días (`umbral_verde_dias`, `umbral_amarillo_dias`, `umbral_rojo_dias`) para la detección automática de caducidad del inventario por semáforo de colores.
*   `productos`: Catálogo maestro de artículos. Almacena la descripción, códigos internos, clave SAT, costos base, precios de lista y margen asignado.
*   `producto_impuestos` y `impuestos`: Tablas para vincular impuestos (IVA, IEPS) aplicables a cada artículo.
*   `codigos_alternos`: Códigos de barra adicionales para búsquedas y escaneo de un producto.
*   `lotes` *(Crucial)*: Gestión física del stock. Los productos no incrementan un simple contador plano, sino que se organizan por lotes que registran:
    *   `cantidad` (existencia física), `unidad_medida`, `costo_adquisicion`, `fecha_caducidad` y estado.
*   `movimientos_inventario`: Libro contable de auditoría que registra cada alteración en el stock (tipo de movimiento, cantidad, almacén, usuario y lote afectado).

### 4.4. Transacciones
*   `documentos`: Cabecera de transacciones comerciales (Facturas, Cotizaciones, Pro-formas). Registra folios, estados, subtotales, impuestos y totales.
*   `documentos_detalles`: Partidas individuales de cada documento, que registran la fotografía del precio unitario, descuento aplicado e impuestos en el momento de la venta.

### 4.5. Configuración y Precios Especiales
*   `plantillas_precios`: Colección de listas de precios alternativas configuradas de forma masiva.
*   `reglas_plantilla`: Reglas específicas que otorgan un descuento porcentual o precio fijo a familias o productos concretos.
*   `clientes_plantillas`: Tabla pivote que vincula qué cliente tiene activa qué lista o plantilla de precios especial.
*   `precios_especiales_clientes`: Descuentos directos específicos cliente-producto.
*   `precios_especiales_familias_clientes`: Descuentos directos cliente-familia de productos.

---

## 5. El Sistema de Seguridad de Borrado Lógico (Soft Delete)

Para mantener la integridad histórica de reportes de ventas, estadísticas de stock y auditoría, la aplicación prohíbe la eliminación directa física de registros en la base de datos real.

En su lugar, se emplea un **Soft Delete** (borrado lógico):
*   Se marca el registro local usando el método `.markAsDeleted()` de WatermelonDB (o desactivando el toggle de estado).
*   En la sincronización, el backend mantiene el registro físico pero lo oculta de todas las consultas ordinarias de la aplicación.

### El Permiso Unificado `canDelete`
La capacidad de visualizar y presionar el botón de eliminar (icono de bote de basura) se unifica en el contexto de autenticación (`AuthContext.tsx`). 

Un usuario está autorizado para borrar si cumple cualquiera de las siguientes condiciones:
1.  Es un usuario con rol de desarrollo (`DEV`).
2.  Es un usuario con rol de administrador (`Administrador`).
3.  Posee el permiso específico `borrar: true` habilitado en su registro de permisos personales en la base de datos (independientemente de su rol).

Cualquier componente del sistema puede verificar la autorización importando `useAuth()` y validando el flag `canDelete`:
```tsx
const { canDelete } = useAuth();

// ... en el render ...
{canDelete && (
  <button onClick={() => handleDelete(item.id)} title="Borrar">
    <Trash2 className="w-4 h-4" />
  </button>
)}
```

---

## 6. Normas de Estilo y Visualización de Tablas

Para garantizar una experiencia de usuario (UX) sumamente premium, intuitiva y rápida, la aplicación sigue estrictas directrices de diseño en sus listados y tablas de administración:

1.  **Botones de Acción Directos:** No se deben emplear menús contextuales desplegables ("tres puntos") para ocultar las opciones comunes. Las acciones de **Editar** (icono `Edit2`) y **Borrar** (icono `Trash2` cuando se cuenta con `canDelete`) deben mostrarse visibles en todo momento directamente en la fila dentro de una columna dedicada.
2.  **Columna de Estado Clara:** El estado de un registro se representa de manera limpia y táctil mediante un Toggle Switch (`Activo/Inactivo`) ocupando su propia columna dedicada antes de la columna de acciones.
3.  **Carga Eficiente (Pagination / Infinite Scroll):** Las vistas principales consumen el hook `usePagination` para renderizar progresivamente los elementos mediante scroll infinito e Intersection Observer, manteniendo una fluidez de 60fps en dispositivos móviles.
