# 00 · Visión de Homely

## El problema

Llevar un hogar entre varias personas genera dos fricciones constantes:

1. **Las tareas recurrentes dependen de la memoria de alguien.** Alguien tiene que recordar que la basura sale miércoles y sábado, repartir el trabajo cada semana y perseguir a quien no lo hizo. No hay evidencia de quién cumplió y quién no, así que las conversaciones se vuelven percepciones.
2. **Los gastos se dispersan.** Comida, gasolina, mascotas, limpieza… se pagan desde distintos bolsillos y momentos. Al final del mes nadie sabe cuánto se fue ni en qué, ni si se pasó de lo que se quería gastar.

## La solución

Homely es una web donde un hogar:

- Define **planes semanales** una sola vez y el sistema genera y asigna las tareas cada semana.
- Cada miembro **marca lo que hizo** desde su propio celular.
- Ve un **reporte semanal** claro: qué se cumplió, qué no, por quién, y la tendencia del año.
- Registra **gastos** en segundos, agrupados por categoría, con **metas** opcionales que avisan al acercarse al límite.
- **Limpia los datos antiguos** cuando ya no aportan.

## Para quién

Hogares pequeños (parejas, familias, compañeros de piso) donde dos o más personas comparten responsabilidades y presupuesto. El caso inicial: una pareja donde **ambos son administradores** con los mismos permisos.

## Principios (ordenan toda decisión)

| Principio | Qué significa en la práctica |
|---|---|
| **Minimalismo sofisticado** | Pocas cosas en pantalla, cada una bien hecha. Tipografía cuidada, espacio generoso, paleta neutra con un acento, sin adornos. |
| **Mobile-first, 100 % responsive** | Se usa desde el celular fuera de casa y desde el PC en casa. Toda pantalla funciona completa en cualquier tamaño. Registrar una tarea o un gasto toma segundos y un par de toques. |
| **Rendimiento** | Carga inicial ligera, navegación instantánea, datos cacheados, consultas indexadas. Nada que haga esperar. |
| **Calidad senior** | Arquitectura por capas, tipado estricto, validación en los bordes, errores controlados, tests, seguridad por defecto. El código debe poder crecer sin reescribirse. |
| **Configurable, no rígido** | Los días de cada plan, las categorías, las metas, la moneda y el inicio de semana los decide cada hogar. |

## Objetivos de la v1

- Autenticación con cuenta por persona y hogares con varios administradores.
- Módulos: Hogar y miembros · Tareas · Planes · Reportes e historial · Gastos y metas.
- Reporte semanal por hogar y por miembro, historial del año en curso, limpieza por rango de fechas.
- PWA instalable.

## No-objetivos de la v1 (explícitamente fuera)

- App móvil nativa (la PWA cubre el caso).
- Notificaciones push / correo (solo avisos dentro de la app).
- Integración bancaria o lectura automática de recibos.
- Pagos entre miembros dentro de la app.
- Chat o comentarios en tareas.
- Recurrencias complejas (quincenal, mensual, "cada 3 días"): la v1 solo soporta **semanal por días de la semana**. El modelo deja la puerta abierta.

## Glosario

| Término | Definición |
|---|---|
| **Hogar (Household)** | Unidad que agrupa miembros, tareas, planes, gastos y metas. Todo dato pertenece a un hogar. |
| **Miembro (Membership)** | La relación de un usuario con un hogar, con un rol. Las tareas se asignan a membresías, no a usuarios. |
| **Tarea (Task)** | Algo concreto con fecha límite y un responsable. Puede ser manual o generada por un plan. |
| **Plan (TaskPlan)** | Plantilla de tarea + días de la semana + responsable. Genera tareas cada semana. |
| **Semana** | Rango de 7 días que empieza en el día configurado por el hogar (`weekStartsOn`, por defecto lunes). |
| **Gasto (Expense)** | Un pago registrado con monto, categoría y fecha. |
| **Meta (BudgetGoal)** | Límite de gasto para una categoría (o el total) en un periodo semanal o mensual. |

## Índice de la documentación

| Doc | Contenido |
|---|---|
| [01-usuarios-y-roles.md](01-usuarios-y-roles.md) | Roles, matriz de permisos, flujo de alta |
| [02-modulos-funcionales.md](02-modulos-funcionales.md) | Requisitos por módulo (documento central) |
| [03-modelo-de-datos.md](03-modelo-de-datos.md) | Entidades, schema Prisma, índices |
| [04-api.md](04-api.md) | Convenciones REST, auth, errores, endpoints |
| [05-frontend.md](05-frontend.md) | Arquitectura React, rutas, estado, responsive |
| [06-diseno-ui.md](06-diseno-ui.md) | Sistema de diseño |
| [07-arquitectura-backend.md](07-arquitectura-backend.md) | Capas, validación, jobs, seguridad |
| [08-stack-y-convenciones.md](08-stack-y-convenciones.md) | Librerías, lint, tests, git, env |
| [09-roadmap.md](09-roadmap.md) | Fases de implementación |
