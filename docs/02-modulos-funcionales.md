# 02 · Módulos funcionales

Documento central. Cada requisito tiene un identificador (`HM-01`, `TK-03`…) para poder referenciarlo desde código, tests y commits. Los elementos marcados **[Sugerencia]** son propuestas que la dueña del producto aún no ha confirmado; se implementan solo si se aceptan.

Transversal a todos los módulos:

- Todo dato pertenece a un hogar y solo lo ven sus miembros.
- Los permisos son los de la matriz de [01-usuarios-y-roles.md](01-usuarios-y-roles.md).
- Toda pantalla es completamente usable en móvil (ver [05-frontend.md](05-frontend.md)).

---

## Módulo 1 · Hogar y miembros

| ID | Requisito |
|---|---|
| HM-01 | Un usuario registrado sin hogar puede **crear un hogar** indicando nombre, moneda (ISO 4217, default `USD`), zona horaria (IANA, propuesta desde el navegador) e inicio de semana (default lunes). Queda como `ADMIN`. |
| HM-02 | Un admin puede **generar códigos de invitación** eligiendo el rol con el que entrará la persona, la caducidad y los usos máximos. Puede ver los códigos vigentes y revocarlos. |
| HM-03 | Un usuario puede **unirse a un hogar** con un código válido y queda con el rol del código. |
| HM-04 | Lista de miembros: nombre visible, avatar/color, rol, estado (activo/inactivo), fecha de ingreso. |
| HM-05 | Un admin puede **cambiar el rol** de cualquier miembro y **desactivar/reactivar** miembros, respetando la regla "siempre al menos un admin". |
| HM-06 | Cada miembro edita su **nombre visible, color y avatar** dentro del hogar. El color identifica al miembro en tableros y gráficos. |
| HM-07 | Un admin edita nombre, moneda, zona horaria e inicio de semana del hogar. Cambiar el inicio de semana solo afecta a semanas futuras. |
| HM-08 | **[Sugerencia]** Un hogar puede tener varios admins y ambos ven exactamente lo mismo; no hay "vista de dueño". (Confirmado por la dueña: sí.) |

---

## Módulo 2 · Tareas

### Datos de una tarea

| Campo | Tipo | Notas |
|---|---|---|
| `title` | texto (1–120) | obligatorio |
| `description` | texto (0–1000) | opcional |
| `assigneeId` | membresía | opcional ("sin asignar" permitido solo en tareas manuales) |
| `dueDate` | fecha (día) | obligatorio. Se interpreta en la zona horaria del hogar |
| `priority` | `LOW` · `MEDIUM` · `HIGH` | default `MEDIUM` |
| `status` | `PENDING` · `DONE` · `SKIPPED` | default `PENDING` |
| `origin` | `MANUAL` · `PLAN` | lo define el sistema |
| `planId` | plan | solo si `origin = PLAN` |
| `completedById`, `completedAt` | membresía, fecha-hora | se rellenan al completar |
| `createdById` | membresía | quién la creó (null si la generó un plan) |

### Requisitos

| ID | Requisito |
|---|---|
| TK-01 | Un admin **crea tareas manuales** con los campos anteriores y las asigna a cualquier miembro activo, incluido él mismo. |
| TK-02 | Un admin **edita o elimina** cualquier tarea. Editar una tarea generada por un plan solo cambia esa instancia, no el plan. |
| TK-03 | El responsable de una tarea la **marca como hecha**. Se guarda quién y cuándo. También puede **deshacer** (vuelve a `PENDING`, se limpian `completedBy/At`). |
| TK-04 | Un admin puede marcar como hecha una tarea ajena (se registra que la completó el admin, no el asignado) o marcarla como **omitida** (`SKIPPED`, p. ej. "no aplicaba esta semana"). Las omitidas no cuentan como incumplimiento en reportes. |
| TK-05 | Una tarea `PENDING` cuya `dueDate` ya pasó se muestra como **vencida** (estado derivado, no se guarda). Puede completarse tarde; se conserva `completedAt` para medir puntualidad. |
| TK-06 | Vista **"Mis tareas"**: hoy, esta semana y vencidas del miembro autenticado, ordenadas por fecha y prioridad. Es la pantalla de inicio en móvil. |
| TK-07 | Vista **"Tablero del hogar"**: la semana actual con una columna/tarjeta por miembro y sus tareas. Navegación a semanas anteriores y siguientes. |
| TK-08 | Filtros: por miembro, estado, origen (manual/plan), prioridad, rango de fechas. Búsqueda por título. |
| TK-09 | Acción rápida **"Nueva tarea"** accesible en un toque desde cualquier pantalla (botón flotante en móvil, atajo en el header en escritorio). |
| TK-10 | Completar una tarea es una acción **optimista**: la UI cambia al instante y se revierte si el servidor falla. |

---

## Módulo 3 · Planes (recurrencia semanal)

Un plan evita asignar lo mismo cada semana. Ejemplo guía: *"Sacar la basura — miércoles y sábado — responsable: Luis"*.

### Datos de un plan

| Campo | Tipo | Notas |
|---|---|---|
| `title`, `description`, `priority` | como en tarea | plantilla de las tareas que genera |
| `weekdays` | lista de `MON…SUN` | al menos uno. `[WED, SAT]` = dos tareas por semana |
| `assigneeId` | membresía | responsable fijo (puede ser null si se usa rotación) |
| `rotation` | lista ordenada de membresías | **[Sugerencia]** ver PL-06 |
| `isActive` | bool | un plan inactivo deja de generar tareas |
| `startsOn`, `endsOn` | fecha | opcionales. Acotan el periodo de generación |

### Requisitos

| ID | Requisito |
|---|---|
| PL-01 | Un admin **crea, edita, activa/desactiva y elimina** planes. Eliminar un plan no borra las tareas ya generadas (quedan con `planId = null` y `origin = PLAN`) para no perder historial. |
| PL-02 | **Generación semanal automática.** Al inicio de cada semana del hogar (según `weekStartsOn` y `timezone`) el sistema crea una tarea por cada plan activo y cada día en `weekdays` que caiga dentro de esa semana y dentro de `[startsOn, endsOn]`. |
| PL-03 | **Idempotencia.** Nunca se duplica una tarea para el mismo plan y día. Garantizado por el índice único `(planId, dueDate)`. Volver a ejecutar la generación es seguro. |
| PL-04 | **Generación perezosa (fallback).** Si al consultar una semana (actual o futura, máximo 4 semanas adelante) faltan tareas de planes activos, se generan en ese momento. Así la app no depende de que el job haya corrido. |
| PL-05 | Al **crear o activar** un plan a mitad de semana, se generan de inmediato las tareas de la semana actual cuyos días aún no han pasado. Al **desactivar** un plan se eliminan las tareas `PENDING` futuras de ese plan; las ya completadas se conservan. |
| PL-06 | **[Sugerencia] Rotación.** En lugar de un responsable fijo, el plan tiene una lista ordenada de miembros y cada semana el responsable avanza una posición (semana 1 Luis, semana 2 Iveth, semana 3 Luis…). Útil para repartir tareas que nadie quiere. |
| PL-07 | Vista de planes: lista con título, días de la semana (chips `L M X J V S D` resaltados), responsable, estado. Ordenados por activos primero. |
| PL-08 | Si el responsable fijo de un plan se desactiva, el plan queda "sin responsable", se marca visualmente y el admin recibe un aviso en el dashboard. Las tareas futuras se generan sin asignar. |

---

## Módulo 4 · Reportes e historial

### Reporte semanal

| ID | Requisito |
|---|---|
| RP-01 | **Resumen del hogar** para una semana: total de tareas asignadas, completadas, pendientes/vencidas, omitidas y **% de cumplimiento** (`completadas / (asignadas − omitidas)`). |
| RP-02 | **Desglose por miembro**: los mismos contadores para cada miembro, con su color. Se visualiza como tiles + barra comparativa. |
| RP-03 | **Comparativa con la semana anterior**: delta de % de cumplimiento del hogar y de cada miembro (↑ ↓ =). |
| RP-04 | **Tareas que más se incumplen**: ranking de títulos de plan con más tareas `PENDING` vencidas en el periodo seleccionado (semana, 4 semanas, 12 semanas, año). Responde a "qué tareas nunca lleva a cabo". |
| RP-05 | **Racha**: semanas consecutivas en las que el miembro completó el 100 % de sus tareas. |
| RP-06 | Navegación entre semanas (anterior/siguiente, selector de semana). La semana por defecto es la actual; al terminar la semana el dashboard muestra un acceso directo al reporte de la semana que acaba de cerrar. |
| RP-07 | **[Sugerencia] Puntualidad**: de las completadas, cuántas se hicieron el mismo día de `dueDate` y cuántas después. |
| RP-08 | **[Sugerencia] Tendencia**: gráfico de líneas del % de cumplimiento por miembro en las últimas 12 semanas. |
| RP-09 | **[Sugerencia] Resumen mensual**: mismos indicadores agregados por mes. |

### Historial

| ID | Requisito |
|---|---|
| RP-10 | Por defecto todos los reportes y listados históricos muestran **solo el año en curso**. Hay un selector de año para ver otros años si aún existen datos. |
| RP-11 | El historial de un miembro muestra, por semana del año, su % de cumplimiento y las tareas que dejó pendientes. Sirve para la conversación "cómo te ayudo a cumplirlas". |

### Limpieza de datos

| ID | Requisito |
|---|---|
| RP-12 | Un admin puede **eliminar datos por rango de fechas** (`desde` – `hasta`, inclusive, en la zona horaria del hogar). Se eliminan: tareas con `dueDate` en el rango (cualquier estado) y gastos con `date` en el rango. **No** se eliminan planes, categorías, metas, miembros ni el log de auditoría. |
| RP-13 | Antes de borrar, la app muestra un **resumen de lo que se va a eliminar** (n tareas, n gastos, monto total) y exige **confirmación escribiendo el nombre del hogar**. |
| RP-14 | El rango no puede incluir la semana actual ni fechas futuras (evita borrar trabajo en curso por error). El servidor lo valida también. |
| RP-15 | La operación se ejecuta en una transacción y deja una entrada en el **log de auditoría** (quién, cuándo, rango, cantidades). |

---

## Módulo 5 · Gastos y metas

### Datos de un gasto

| Campo | Tipo | Notas |
|---|---|---|
| `amount` | decimal (12,2) > 0 | en la moneda del hogar |
| `categoryId` | categoría | obligatorio |
| `date` | fecha (día) | default hoy |
| `description` | texto (0–200) | opcional ("mercado semanal", "gasolina") |
| `paidById` | membresía | opcional: quién puso el dinero |
| `registeredById` | membresía | quién lo registró (automático) |
| `paymentMethod` | `CASH` · `CARD` · `TRANSFER` · `OTHER` | opcional |

### Categorías

Cada hogar tiene sus categorías con nombre, color e icono. Al crear el hogar se siembran: **Comida · Comida fuera · Transporte · Limpieza · Mascotas · Servicios · Salud · Ocio · Otros**. Se pueden renombrar, recolorear, crear nuevas y **archivar** (no eliminar, para conservar historial).

### Requisitos

| ID | Requisito |
|---|---|
| EX-01 | Cualquier miembro **registra un gasto** en un formulario de un solo paso: monto (teclado numérico en móvil), categoría (chips), fecha (hoy por defecto), descripción opcional. Acción rápida "Nuevo gasto" en un toque desde cualquier pantalla. |
| EX-02 | Un miembro edita/elimina sus propios gastos; un admin, cualquiera. |
| EX-03 | Lista de gastos con agrupación por día, filtros por categoría, miembro, método y rango de fechas, y búsqueda por descripción. Total del periodo filtrado siempre visible. |
| EX-04 | Un admin gestiona **categorías** (crear, editar, archivar, reordenar). |
| EX-05 | Un admin crea **metas** opcionales: por categoría o **total del hogar**, con periodo `WEEKLY` o `MONTHLY` y un monto. Máximo una meta activa por combinación (categoría, periodo). |
| EX-06 | Estado de una meta en el periodo en curso: `OK` (< 80 %), `WARNING` (80–100 %), `EXCEEDED` (> 100 %). Los umbrales son constantes de configuración. |
| EX-07 | **Aviso en la app**: el dashboard muestra un banner discreto cuando una meta entra en `WARNING` o `EXCEEDED` ("Comida: $265 de $300 este mes · 88 %"). Sin push ni correo. |
| EX-08 | **Reporte de gastos** (semanal y mensual): total, por categoría (barras horizontales ordenadas), comparación con el periodo anterior, estado de cada meta, gasto por miembro (quién pagó). Aparece también como sección dentro del reporte semanal del Módulo 4. |
| EX-09 | **[Sugerencia] Gastos fijos recurrentes.** Igual que los planes de tareas: "Internet — $40 — día 5 de cada mes" se registra solo. Modelo `RecurringExpense`. |
| EX-10 | **[Sugerencia] Balance entre miembros.** Con `paidById` se puede calcular cuánto puso cada uno y mostrar "Luis pagó $320, Iveth $180 → diferencia $70". Solo informativo, sin liquidaciones. |
| EX-11 | **[Sugerencia] Exportar CSV** de gastos del periodo filtrado. |
| EX-12 | **[Sugerencia] Moneda por hogar** (ya contemplada en HM-01). Sin conversión entre monedas. |

---

## Dashboard (pantalla de inicio)

Combina lo esencial de todos los módulos en una sola vista, priorizando el móvil:

1. **Hoy:** mis tareas de hoy con check directo. Si no hay, mensaje breve.
2. **Avisos:** metas en `WARNING`/`EXCEEDED`, planes sin responsable, tareas vencidas del hogar.
3. **Semana:** mini-resumen de cumplimiento del hogar (anillo o barra) con enlace al reporte.
4. **Gastos del mes:** total y top 3 categorías.
5. Acciones rápidas: **Nueva tarea** (admin) y **Nuevo gasto** (todos).

---

## Trazabilidad con las ideas originales

| Idea de la dueña | Requisitos |
|---|---|
| Panel para crear y asignar tareas | TK-01, TK-02, TK-09 |
| Módulo de miembros, asignar tareas incluso a mí | HM-04, TK-01 |
| Tareas que no haya que asignar cada semana, plan configurable por días (basura miércoles y sábado) | PL-01 … PL-05 |
| Que los miembros indiquen cuándo hicieron una tarea | TK-03, TK-10 |
| Resumen al final de la semana con contadores por miembro | RP-01, RP-02, RP-06 |
| Más datos para el reporte (sugerencias pedidas) | RP-03, RP-04, RP-05, RP-07, RP-08, RP-09 |
| Historial de qué tan a menudo deja tareas pendientes, qué tareas nunca hizo | RP-04, RP-11 |
| Historial solo del año presente | RP-10 |
| Botón para vaciar datos por rango de fechas | RP-12 … RP-15 |
| Registrar todo tipo de gastos (comida, gasolina, limpieza, mascotas…) | EX-01, EX-03, EX-04 |
| Metas opcionales de gasto, aviso al acercarse, ver en reportes si se excedió | EX-05, EX-06, EX-07, EX-08 |
| Más ideas para gastos (sugerencias pedidas) | EX-09, EX-10, EX-11 |
| Dos administradores con permisos iguales | HM-02, HM-05, HM-08, [01-usuarios-y-roles.md](01-usuarios-y-roles.md) |
| Totalmente responsive, usable fuera de casa desde cualquier dispositivo | TK-09, EX-01, Dashboard, [05-frontend.md](05-frontend.md), [06-diseno-ui.md](06-diseno-ui.md) |
