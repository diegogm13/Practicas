# Diseño de Backend — Microservicios Node.js ERP-DGM

**Fecha:** 2026-03-30
**Estado:** Aprobado

## Contexto

El proyecto ERP-DGM tiene un frontend Angular y una BD que se migrará a MongoDB. El backend se implementará como microservicios independientes en Node.js/Fastify, con un API Gateway central que enruta las peticiones del frontend.

---

## Arquitectura General

```
Angular (Frontend)
       ↓ HTTP REST
API Gateway · Fastify · puerto 3000
  ├── valida JWT contra Redis
  ├── enruta → User Service    (puerto 3001)
  ├── enruta → Groups Service  (puerto 3002)
  └── enruta → Tickets Service (puerto 3003)

Redis ←→ API Gateway  (caché de tokens JWT, TTL 24h)

User Service    → MongoDB: erp_users
Groups Service  → MongoDB: erp_groups
Tickets Service → MongoDB: erp_tickets
```

Una sola instancia de MongoDB con 3 bases de datos separadas (una por servicio). Una instancia de Redis acoplada solo al Gateway.

---

## Servicios

### API Gateway (puerto 3000)
**Responsabilidad:** único punto de entrada desde Angular. Enruta peticiones, valida JWT.

- Framework: **Fastify** con plugin `@fastify/http-proxy`
- Valida el JWT de cada request consultando Redis
- Si el token no está en Redis (expirado o inválido) → 401
- Reenvía la petición al servicio correspondiente según el path:
  - `/auth/*` → User Service
  - `/users/*` → User Service
  - `/groups/*` → Groups Service
  - `/tickets/*` → Tickets Service
- No tiene lógica de negocio propia

### User Service (puerto 3001)
**Responsabilidad:** autenticación, gestión de usuarios y permisos.

- Framework: **Fastify**
- Base de datos: MongoDB `erp_users`
- Colecciones:
  - `usuarios` — email, usuario, password_hash (bcrypt), fullName, address, phone, birthDate
  - `permisos` — clave, descripcion
  - `usuario_permisos` — usuarioId, permisoId
- Endpoints:
  - `POST /auth/login` — valida credenciales, genera JWT, lo guarda en Redis
  - `POST /auth/logout` — elimina token de Redis
  - `POST /auth/register` — crea usuario con permisos por defecto
  - `GET /users` — lista usuarios (requiere permiso `users:view`)
  - `GET /users/:id` — detalle de usuario
  - `PUT /users/:id` — editar usuario
  - `DELETE /users/:id` — eliminar usuario
  - `GET /users/:id/permissions` — permisos de un usuario
  - `PUT /users/:id/permissions` — asignar permisos

### Groups Service (puerto 3002)
**Responsabilidad:** gestión de grupos y sus miembros.

- Framework: **Fastify**
- Base de datos: MongoDB `erp_groups`
- Colecciones:
  - `grupos` — nombre, categoria, nivel, autorId, createdAt
  - `grupo_miembros` — grupoId, usuarioId
- Endpoints:
  - `GET /groups` — lista grupos (filtra por usuario si no tiene `users:view`)
  - `POST /groups` — crear grupo (requiere `group:add`)
  - `PUT /groups/:id` — editar grupo (requiere `group:edit`)
  - `DELETE /groups/:id` — eliminar grupo (requiere `group:delete`)
  - `GET /groups/:id/members` — miembros del grupo
  - `POST /groups/:id/members` — añadir miembro
  - `DELETE /groups/:id/members/:userId` — quitar miembro

### Tickets Service (puerto 3003)
**Responsabilidad:** gestión de tickets, comentarios e historial.

- Framework: **Fastify**
- Base de datos: MongoDB `erp_tickets`
- Colecciones:
  - `tickets` — titulo, descripcion, estado, prioridad, asignadoA, creadorId, fechaCreacion, fechaLimite, grupoId
  - `ticket_comentarios` — ticketId, autorId, texto, fecha
  - `ticket_historial` — ticketId, autorId, cambio, fecha
- Endpoints:
  - `GET /tickets?grupoId=` — tickets de un grupo
  - `POST /tickets` — crear ticket (requiere `ticket:add`)
  - `PUT /tickets/:id` — editar ticket (requiere `ticket:edit`)
  - `PATCH /tickets/:id/estado` — cambiar estado (requiere `ticket:edit_state`)
  - `DELETE /tickets/:id` — eliminar ticket (requiere `ticket:delete`)
  - `POST /tickets/:id/comments` — añadir comentario
  - `GET /tickets/:id/history` — ver historial

---

## Autenticación y Permisos

1. Usuario hace login → User Service valida bcrypt → genera JWT con `{ userId, email, permissions[] }` → guarda en Redis con TTL 24h → devuelve token al cliente
2. En cada request → Angular envía `Authorization: Bearer <token>` → Gateway consulta Redis → si existe, extrae payload y lo reenvía al servicio como header `X-User` → servicio verifica permiso requerido
3. Logout → Gateway elimina token de Redis → siguientes requests con ese token fallan

---

## Stack Tecnológico

| Componente | Tecnología |
|---|---|
| Todos los servicios | Node.js + Fastify |
| Base de datos | MongoDB (una instancia, 3 DBs) |
| Caché de sesiones | Redis |
| Passwords | bcryptjs (costo 10) |
| Tokens | JWT (jsonwebtoken) |
| Proxy | @fastify/http-proxy |

---

## Estructura de Repositorio

```
backend/
├── gateway/          ← API Gateway (puerto 3000)
├── user-service/     ← User + Auth (puerto 3001)
├── group-service/    ← Groups (puerto 3002)
└── ticket-service/   ← Tickets (puerto 3003)
```

Cada servicio tiene su propio `package.json`. Se pueden levantar todos con un `docker-compose.yml` o manualmente con `node index.js` en cada carpeta.

---

## Notas

- El frontend Angular seguirá usando sus servicios actuales pero apuntando a `http://localhost:3000` en lugar de datos en memoria.
- Los permisos viajan en el JWT — el Gateway no necesita consultar MongoDB para verificarlos.
- MongoDB se popula con los mismos datos del seed de Supabase (adaptados a documentos).
