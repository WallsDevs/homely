# 01 · Usuarios y roles

## Conceptos

- **Usuario (User):** una persona con correo y contraseña. Existe independientemente de cualquier hogar.
- **Membresía (Membership):** la pertenencia de un usuario a un hogar, con un **rol**. Es la entidad a la que se asignan tareas y la que registra gastos. En la v1 un usuario pertenece a un solo hogar, pero el modelo permite varios.
- **Rol:** `ADMIN` o `MEMBER`. El rol está en la membresía, no en el usuario: una persona podría ser admin en un hogar y miembro en otro.

## Roles

### `ADMIN`
Gestiona el hogar completo. **Puede haber varios admins y todos tienen exactamente los mismos permisos.** No existe un "dueño" o "creador" con privilegios especiales. Caso de uso base: una pareja donde ambos administran por igual.

### `MEMBER`
Participa: ve el tablero del hogar, completa sus tareas, registra gastos y consulta reportes. No modifica la configuración del hogar.

## Matriz de permisos

| Acción | ADMIN | MEMBER |
|---|:---:|:---:|
| **Hogar** | | |
| Crear hogar (quien lo crea queda ADMIN) | ✅ | ✅ |
| Editar nombre, moneda, zona horaria, inicio de semana | ✅ | ❌ |
| Generar / revocar códigos de invitación (con rol ADMIN o MEMBER) | ✅ | ❌ |
| Ver lista de miembros | ✅ | ✅ |
| Cambiar rol de un miembro | ✅ | ❌ |
| Desactivar / reactivar miembro | ✅ | ❌ |
| Editar su propio nombre visible, color y avatar | ✅ | ✅ |
| Salir del hogar | ✅ (si no es el último admin) | ✅ |
| **Tareas** | | |
| Ver todas las tareas del hogar | ✅ | ✅ |
| Crear tarea manual (y asignarla a cualquiera, incluido uno mismo) | ✅ | ❌ |
| Editar / eliminar cualquier tarea | ✅ | ❌ |
| Marcar como hecha / deshacer una tarea **propia** | ✅ | ✅ |
| Marcar como hecha / omitir una tarea **ajena** | ✅ | ❌ |
| **Planes** | | |
| Ver planes | ✅ | ✅ |
| Crear / editar / activar / desactivar / eliminar planes | ✅ | ❌ |
| **Gastos** | | |
| Ver gastos del hogar | ✅ | ✅ |
| Registrar gasto | ✅ | ✅ |
| Editar / eliminar gasto **propio** (registrado por uno mismo) | ✅ | ✅ |
| Editar / eliminar gasto **ajeno** | ✅ | ❌ |
| Crear / editar / archivar categorías | ✅ | ❌ |
| Crear / editar / eliminar metas de gasto | ✅ | ❌ |
| **Reportes** | | |
| Ver reportes semanales, mensuales e historial | ✅ | ✅ |
| **Mantenimiento** | | |
| Limpiar datos por rango de fechas | ✅ | ❌ |
| Ver log de auditoría | ✅ | ❌ |

## Reglas de integridad

1. **Siempre al menos un admin.** No se puede degradar a `MEMBER`, desactivar ni permitir que salga del hogar al último `ADMIN` activo. El servidor responde `409 LAST_ADMIN`.
2. **Un admin no tiene poder sobre otro admin más que el que tiene sobre sí mismo:** puede cambiarle el rol o desactivarlo (siempre que no viole la regla 1). Esto es intencional: los admins se confían entre sí.
3. **Desactivar ≠ eliminar.** Un miembro desactivado conserva su historial (tareas completadas, gastos). No recibe nuevas tareas de planes y no puede iniciar sesión en ese hogar. Los planes que lo tenían como responsable fijo pasan a "sin asignar" y se avisa al admin.
4. **Eliminar cuenta de usuario** (fuera de v1 salvo requerimiento legal): se anonimiza la membresía (`displayName = "Miembro eliminado"`) para no romper historial.

## Flujo de alta

```
Registro (correo, nombre, contraseña)
        │
        ▼
¿Tienes un código de invitación?
   │                      │
   no                     sí
   │                      │
   ▼                      ▼
Crear hogar          Unirse con código
(nombre, moneda,     → el código trae el rol
 zona horaria,         (ADMIN o MEMBER)
 inicio de semana)   → queda miembro con ese rol
→ queda ADMIN
        │
        ▼
    Dashboard
```

### Códigos de invitación

- Generados por un admin. Cadena corta legible (8 caracteres, sin `0/O/1/I`), p. ej. `K7MP-QW3R`.
- Llevan: `role` (con qué rol entra quien lo use), `expiresAt` (por defecto 7 días), `maxUses` (por defecto 1).
- Se comparten por fuera de la app (WhatsApp, voz). No hay envío de correo en v1.
- Pueden revocarse. Un código expirado o agotado responde `410 INVITATION_INVALID`.

## Sesión y seguridad de cuenta

- Contraseña mínima 8 caracteres; hash con `argon2id`.
- Access token JWT de 15 min en memoria del cliente; refresh token opaco (hash en BD) de 30 días en cookie `httpOnly; Secure; SameSite=Lax`, con rotación en cada uso.
- Cerrar sesión revoca el refresh token. "Cerrar sesión en todos los dispositivos" revoca todos los del usuario.
- Recuperación de contraseña: fuera de v1 (sin correo). Un admin **no** puede restablecer contraseñas de otros.
