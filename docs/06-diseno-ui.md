# 06 · Sistema de diseño

Dirección: **minimalismo sofisticado**. Homely debe sentirse calmado, preciso y caro sin ser frío. Menos elementos, mejor ejecutados. Referencias de tono: Linear, Things 3, Notion en modo claro, apps bancarias nórdicas.

## Principios visuales

1. **Jerarquía por tipografía y espacio, no por color.** El color se reserva para el acento, los estados y la identidad de miembros/categorías.
2. **Bordes sutiles en vez de sombras.** Las superficies se separan con 1 px de borde a baja opacidad y ligeros cambios de tono de fondo. Sombras solo en elementos flotantes (FAB, menús, hojas).
3. **Una sola familia tipográfica.** Variación por peso y tamaño.
4. **Espacio generoso y constante.** Escala de 4 px. El contenido respira; las listas no se apretujan.
5. **Movimiento discreto.** Transiciones de 150–200 ms con `ease-out`. Nada rebota, nada parpadea. Respeta `prefers-reduced-motion`.
6. **Mobile-first.** Cada componente se diseña primero a 360 px de ancho.

## Tokens

Se declaran en `client/src/styles/globals.css` con `@theme` de Tailwind v4 y variables CSS, con dos temas (`:root` claro y `[data-theme="dark"]`).

**Nombres de utilidad en código** (para evitar `text-text` / `bg-bg`): `--bg` → `canvas`, `--border` → `line`, `--text` → `fg`, `--text-2` → `fg-2`, `--text-3` → `fg-3`. Ej.: `bg-canvas`, `border-line`, `text-fg-2`, `bg-accent-soft`. Tipografía: `text-display`, `text-h1`, `text-h2`, `text-body`, `text-small`, `text-caption`; números con la utilidad `tabular`. Hover solo con puntero: variante `hover-pointer:`. La galería viva de componentes está en `/dev/ui` (solo desarrollo).

### Color

| Token | Claro | Oscuro | Uso |
|---|---|---|---|
| `--bg` | `#FAFAF8` | `#0F1012` | fondo de página (blanco roto / grafito) |
| `--surface` | `#FFFFFF` | `#17181B` | tarjetas, hojas, diálogos |
| `--surface-2` | `#F3F3F0` | `#1F2024` | fondos secundarios, inputs, hover |
| `--border` | `#E6E6E2` | `#2A2B30` | bordes 1 px |
| `--text` | `#161616` | `#F2F2F0` | texto principal |
| `--text-2` | `#6B6B68` | `#A3A39E` | texto secundario, labels |
| `--text-3` | `#8C8C88` | `#7D7D78` | placeholders, metadatos (ajustado en Fase 0 para mejor contraste) |
| `--accent` | `#2F6B5E` | `#5FA895` | **único acento**: acciones primarias, foco, enlaces (verde salvia profundo) |
| `--accent-fg` | `#FFFFFF` | `#0F1012` | texto sobre acento |
| `--accent-soft` | `#E4EFEB` | `#1C2A26` | fondos de chips/badges del acento |
| `--success` | `#2E7D4F` | `#5CC284` | tarea completada, meta OK |
| `--warning` | `#9A6A0F` | `#E0B35A` | meta en aviso, tarea de hoy pendiente (oscurecido en claro para contraste AA) |
| `--danger` | `#B3433C` | `#E57368` | vencida, excedida, eliminar |
| `--info` | `#3B6EA8` | `#7FA9DD` | notas informativas |

Colores de **miembros** (8, se asignan en orden): `#E07A5F #5B8DEF #8E7CC3 #D4A942 #4FA3A5 #C86B9B #7D9B5B #A47A5A`.
Colores de **categorías**: la misma paleta ampliada a 12 tonos; cada hogar puede personalizar.

Regla: el acento aparece **una vez** por pantalla como acción primaria. Nunca dos botones de acento juntos.

### Tipografía

Familia: **Inter** (variable, `font-feature-settings: "cv11", "ss01", "tnum"`), fallback `system-ui`. Alternativa aceptada: Geist. Los números tabulares (`tnum`) son obligatorios en montos y contadores.

| Token | Tamaño / interlineado | Peso | Uso |
|---|---|---|---|
| `display` | 32/38 (móvil 28/34) | 600 | títulos de página, total del mes |
| `h1` | 24/30 | 600 | secciones principales |
| `h2` | 18/26 | 600 | títulos de tarjeta |
| `body` | 15/22 | 400 | texto base (15 px, no 16, para densidad elegante) |
| `body-strong` | 15/22 | 500 | nombres, títulos de tarea |
| `small` | 13/18 | 400 | metadatos, labels |
| `caption` | 12/16 | 500 | badges, eje de gráficos (mayúsculas con `tracking 0.04em`) |
| `mono-num` | hereda | 500 + `tnum` | montos, porcentajes |

Tipografía fluida en `display` con `clamp()`.

### Espaciado y forma

- Escala: `4 8 12 16 20 24 32 40 48 64`.
- Padding de tarjeta: 16 móvil, 20 escritorio. Gutter de página: 16 móvil, 24 tablet, 32 escritorio.
- Radio: `sm 6` (inputs, chips), `md 10` (tarjetas, botones), `lg 16` (hojas, diálogos), `full` (avatares, pills).
- Borde: `1px solid var(--border)`.
- Sombras: `--shadow-float: 0 8px 24px rgb(0 0 0 / 0.08)` (claro) · `0 8px 24px rgb(0 0 0 / 0.4)` (oscuro). Solo FAB, menús, hojas, diálogos.
- Ancho máximo del contenido en escritorio: 1120 px, centrado.

### Iconografía

`lucide-react`, 20 px en UI, 16 px dentro de texto, 24 px en la navegación. Trazo 1.75. Nunca iconos rellenos salvo el estado activo de la navegación.

## Breakpoints y layout

| Nombre | Rango | Layout |
|---|---|---|
| Móvil | < 768 | una columna; nav inferior 64 px + safe area; FAB 56 px abajo-derecha |
| Tablet | 768–1023 | sidebar de 64 px (iconos); contenido en 1–2 columnas |
| Escritorio | ≥ 1024 | sidebar de 240 px; contenido hasta 1120 px; paneles laterales para detalles |

- Mobile-first: los estilos base son móviles; `md:` y `lg:` añaden.
- Áreas táctiles mínimas 44 × 44 px.
- Sin scroll horizontal de página en ningún tamaño.

## Componentes base (`shared/ui`)

Cada componente documenta variantes, estados y su comportamiento en los tres tamaños.

| Componente | Variantes / notas | Móvil → Escritorio |
|---|---|---|
| **Button** | `primary` (acento), `secondary` (borde), `ghost`, `danger`; tamaños `sm 32` `md 40` `lg 48`; estado `loading` con spinner inline; icono opcional | `lg` a ancho completo en formularios móviles; `md` en escritorio |
| **IconButton** | 40 × 40, `ghost` por defecto; `aria-label` obligatorio | igual |
| **Input / Textarea** | label arriba, helper/error abajo, prefijo (símbolo de moneda) y sufijo; `inputmode` configurable | altura 48 móvil, 40 escritorio |
| **AmountInput** | número grande centrado para "Nuevo gasto", `inputmode="decimal"`, formato en vivo | 40 px tipografía móvil, 32 escritorio |
| **Select / Combobox** | nativo en móvil (`<select>`), popover en escritorio | nativo → popover |
| **ChipGroup** | selección simple o múltiple (días de semana, categorías); scroll horizontal con fade | scroll → wrap |
| **SegmentedControl** | 2–4 opciones (prioridad, periodo) | igual |
| **Checkbox (TaskCheck)** | 28 px redondo, animación de check 150 ms, color `success` | igual |
| **Avatar** | iniciales sobre color de miembro; tamaños 24/32/40; `AvatarGroup` apilado | igual |
| **Badge** | `neutral`, `accent`, `success`, `warning`, `danger`; `caption` en mayúsculas | igual |
| **Card** | `surface` + borde; header opcional con título y acción | padding 16 → 20 |
| **ListItem / CardList** | fila con avatar/icono, título, meta y acción; swipe en móvil | tarjetas → `Table` |
| **Table** | solo ≥ `md`; cabecera pegajosa; filas 48 px; numéricos alineados a la derecha | — → tabla |
| **Dialog** | centrado, máx. 480 px, foco atrapado | se convierte en **BottomSheet** en móvil |
| **BottomSheet** | desde abajo, asa, altura `auto` o `full`, arrastre para cerrar | solo móvil |
| **Popover / Menu** | acciones secundarias (…); en móvil se abre como hoja | hoja → popover |
| **Toast** | abajo-centro en móvil, abajo-derecha en escritorio; 4 s; acción "Deshacer" | — |
| **EmptyState** | icono 32 px, título `h2`, texto `small`, CTA opcional | centrado, máx. 320 px |
| **Skeleton** | bloques con pulso suave; formas que imitan el contenido real | — |
| **StatTile** | label `caption`, valor `display`/`h1` con `tnum`, delta con flecha y color semántico | grid 2 cols → 4 cols |
| **ProgressBar / ProgressRing** | altura 6 px; color según estado de meta o cumplimiento | — |
| **WeekPicker** | ‹ 19–25 oct › con botón "Hoy" | pegado arriba → inline con el título |
| **WeekdayChips** | `L M X J V S D`, seleccionados en acento | — |
| **AppNav** | barra inferior (5 ítems, activo con icono relleno + label) / sidebar | — |
| **FAB** | 56 px, acento, sombra float; abre menú de acciones rápidas | solo móvil y tablet |

## Patrones de pantalla

- **Cabecera de página:** título `display` + acción primaria a la derecha (escritorio) o nada (móvil, la acción está en el FAB). Subtítulo `small` en `--text-2` cuando aporte contexto ("Semana del 19 al 25 de octubre").
- **Secciones:** título `caption` en mayúsculas + contenido. Separación 32 px.
- **Tarjeta de tarea:** `[TaskCheck] Título (body-strong) · meta (small: Avatar + nombre · fecha) · Badge prioridad solo si HIGH`. Vencida: fecha en `--danger`. Completada: título en `--text-3` con tachado suave.
- **Fila de gasto:** `[Icono categoría sobre color-soft] Descripción o nombre de categoría · small: categoría · pagó X` ··· `monto (mono-num, derecha)`.
- **Meta:** `nombre · $gastado de $meta` + `ProgressBar` + `Badge estado`.
- **Estados vacíos** siempre dicen qué hacer: "Aún no hay planes. Crea el primero: las tareas se generarán solas cada semana."
- **Confirmaciones destructivas:** Dialog con título claro, consecuencias en una línea, botón `danger`. La limpieza de datos exige escribir el nombre del hogar.

## Microinteracciones

- Completar tarea: check se dibuja (150 ms), la fila se atenúa; toast con "Deshacer".
- Guardar gasto: la hoja se cierra y el total del filtro cuenta hacia el nuevo valor (200 ms).
- Barra de meta: se anima desde 0 al montar; cambia de color al cruzar umbrales.
- Hover solo en dispositivos con puntero (`@media (hover: hover)`).

## Modo oscuro

Se soporta desde el primer componente. Nunca se invierte la paleta: cada token tiene su valor oscuro. Las superficies oscuras suben de luminosidad con la elevación (bg → surface → surface-2). Los colores de miembro y categoría se aclaran ~10 % en oscuro para mantener contraste.

## Lo que Homely no hace

- Degradados, glassmorphism, sombras grandes, ilustraciones decorativas.
- Más de un color de acento. Más de una familia tipográfica.
- Textos en mayúsculas salvo `caption`.
- Modales encima de modales.
- Animaciones mayores de 250 ms.
