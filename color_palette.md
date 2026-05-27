# Paleta de Colores - Distribuidora M-H

Esta guía presenta la identidad cromática y el sistema de diseño visual de la aplicación **Distribuidora M-H**. Los colores han sido seleccionados para transmitir profesionalismo, orden, control operativo y una estética premium moderna (glassmorphism y modo oscuro activo).

---

## Vista Previa de la Paleta de Colores

````carousel
![Infografía de la Paleta](C:\Users\i3zac\.gemini\antigravity\brain\8b2f9898-bc02-4211-acc8-a1f4e1843eda\infographic_color_palette_1779656580946.png)
<!-- slide -->
![Diseño de Interfaz M-H](C:\Users\i3zac\.gemini\antigravity\brain\8b2f9898-bc02-4211-acc8-a1f4e1843eda\color_palette_preview_1779656415855.png)
````

---

## 1. Colores de Marca Principales (Core Brand Colors)

Estos colores definen la personalidad visual de la distribuidora. Se encuentran configurados como variables personalizadas dentro del motor de Tailwind CSS v4.

| Nombre en Sistema | Código HEX | Variable CSS / Tailwind | Uso Principal |
| :--- | :--- | :--- | :--- |
| **MH Blue** | `#15335c` | `--color-mh-blue` / `text-mh-blue` | Color principal de la marca. Transmite seriedad, confianza y solidez corporativa. Se usa en botones primarios, iconos activos y elementos destacados. |
| **MH Blue Dark** | `#0f2744` | `--color-mh-blue-dark` / `text-mh-blue-dark` | Versión oscura del azul primario. Usado para títulos de sección (`h1`, `h2`), cabeceras principales de navegación y zonas de alto contraste. |
| **MH Pink** | `#e11d48` | `--color-mh-pink` / `text-mh-pink` | Acento vibrante y enérgico (Rose 600). Utilizado para llamados a la acción (CTA), toggles interactivos, notificaciones activas y realces de marca. |
| **Mist 300** | `#c8d5e0` | `--color-mist-300` / `border-mist-300` | Tono de gris azulado muy suave. Usado para bordes, separadores de tarjetas y líneas divisorias limpias para evitar grillas rígidas oscuras. |

---

## 2. Semáforo Inteligente de Caducidades (Smart Expiration Traffic Light)

Dado que la aplicación opera con gestión estricta de inventarios por **Lotes**, se utiliza un semáforo visual para indicar de un vistazo el nivel de urgencia o proximidad de la fecha de caducidad:

| Nivel de Semáforo | Color Representativo | Clases Tailwind | Significado / Umbral en Días |
| :--- | :--- | :--- | :--- |
| **Seguro (Verde)** | `#10b981` (Emerald 500) | `bg-emerald-500` / `text-emerald-700` | Lote con fecha de caducidad lejana (Umbral Verde). Stock seguro para distribución normal. |
| **Atención (Amarillo)** | `#f59e0b` (Amber 500) | `bg-amber-500` / `text-amber-700` | Lote aproximándose a la fecha crítica (Umbral Amarillo). Requiere rotación rápida (FIFO). |
| **Crítico (Rojo)** | `#ef4444` (Red 500) | `bg-rose-500` / `text-rose-700` | Lote vencido o a punto de vencer (Umbral Rojo). Bloqueado para venta o requiere atención inmediata. |

---

## 3. Colores Semánticos de la Interfaz (UI Status Colors)

Colores estandarizados para representar estados del sistema, alertas, flujos de facturación y retroalimentación de usuario (éxito, advertencia, peligro).

| Estado / Uso | Color | Clases Tailwind | Ejemplos de Uso |
| :--- | :--- | :--- | :--- |
| **Éxito (Success)** | `#059669` (Emerald 600) | `text-emerald-600` / `bg-emerald-50` | Facturas pagadas, sincronización exitosa local-remoto, registros guardados correctamente. |
| **Advertencia (Warning)** | `#d97706` (Amber 600) | `text-amber-600` / `bg-amber-50` | Documentos pendientes, advertencias de stock mínimo en almacén, desconexión de red temporal. |
| **Error / Peligro (Danger)** | `#dc2626` (Red 600) | `text-red-600` / `bg-red-50` | Botón de borrado lógico (Soft Delete), fallos de validación, errores críticos de sincronización. |
| **Info / Neutro** | `#3b82f6` (Blue 500) | `text-blue-500` / `bg-blue-50` | Cotizaciones o borradores generados, diálogos informativos generales. |

---

## 4. Fondos y Neutros (Backgrounds & Neutrals)

Para lograr una apariencia premium con profundidad y soporte nativo para **Modo Claro** y **Modo Oscuro**:

### Modo Claro (Light Mode)
*   **Fondo Principal (App Base):** `#f8fafc` (Slate 50) — Fondo general limpio y descansado.
*   **Tarjetas y Contenedores:** `#ffffff` (White) — Con sombras suaves (`shadow-sm`) y bordes `--color-mist-300`.
*   **Fondo Secundario / Inputs:** `#f1f5f9` (Slate 100) — Entradas de texto desactivadas o fondos de tablas.
*   **Bordes / Divisores:** `#e2e8f0` (Slate 200).

### Modo Oscuro (Dark Mode)
*   **Fondo Principal (App Base):** `#090d16` — Un tono negro azulado profundo y vibrante.
*   **Tarjetas y Contenedores:** `#111827` (Gray 900) o `#1e293b` (Slate 800) con opacidades del 80% (efecto de vidrio/glassmorphism).
*   **Bordes / Divisores:** `#1f2937` (Gray 800) o `#334155` (Slate 700).

---

## 5. Integración Técnica (Tailwind CSS v4)

La paleta se encuentra declarada en `global.css` mediante la directiva `@theme` de la siguiente forma:

```css
@import "tailwindcss";

@theme {
  --color-mh-blue: #15335c;
  --color-mh-blue-dark: #0f2744;
  --color-mh-pink: #e11d48;
  --color-mist-300: #c8d5e0;
  
  /* Animación de entrada suave para modals y listas */
  --animate-fade-in: fade-in 0.15s ease-out;
}

@keyframes fade-in {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}
```
