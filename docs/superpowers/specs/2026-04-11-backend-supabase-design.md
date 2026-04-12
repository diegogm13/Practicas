# Diseño de Backend — Microservicios Fastify + Supabase

**Fecha:** 2026-04-11
**Estado:** Aprobado

## Contexto

El proyecto ERP-DGM tiene un frontend Angular en `erp-dgm/` y un backend de microservicios en `C:\Users\dg660\Documents\Clases\pagina\backend\`. El frontend solo habla con el API Gateway en el puerto 3000 — los servicios internos (3001–3003) nunca se exponen directamente a Angular.

---

## Arquitectura General

```
Angular (erp-dgm, puerto 4200)
         ↓ HTTP REST → http://localhost:3000
┌─────────────────────────────────────────┐
│  API Gateway · Fastify · puerto 3000    │
│  - Valida JWT contra Redis (TTL 24h)    │
│  - Enruta por path con http-proxy       │
└──┬──────────┬──────────┬────────────────┘
   ↓          ↓          ↓
User Svc   Group Svc  Ticket Svc
:3001       :3002       :3003
   └──────────┴──────────┘
              ↓
         Supabase (PostgreSQL)
```

| Servicio | Puerto | Framework |
|---|---|---|
| gateway | 3000 | Fastify + @fastify/http-proxy |
| user-service | 3001 | Fastify |
| group-service | 3002 | Fastify |
| ticket-service | 3003 | Fastify |

**Ubicación del backend:** `C:\Users\dg660\Documents\Clases\pagina\backend\`

```
backend/
├── shared/
│   ├── response.js
│   └── schemas/
│       ├── auth.schemas.js
│       ├── user.schemas.js
│       ├── group.schemas.js
│       └── ticket.schemas.js
├── gateway/
├── user-service/
├── group-service/
└── ticket-service/
```

---

## Base de Datos (Supabase)

Conexión: `@supabase/supabase-js` con `SUPABASE_URL` + `SUPABASE_ANON_KEY` desde `.env` en cada servicio.

### Schema SQL

```sql
CREATE TABLE usuarios (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario       VARCHAR(50)  NOT NULL UNIQUE,
    email         VARCHAR(150) NOT NULL UNIQUE,
    password_hash TEXT         NOT NULL,
    full_name     VARCHAR(150) NOT NULL,
    address       TEXT,
    phone         VARCHAR(20),
    birth_date    DATE,
    activo        BOOLEAN      NOT NULL DEFAULT true,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE permisos (
    id          SERIAL PRIMARY KEY,
    clave       VARCHAR(50) NOT NULL UNIQUE,
    descripcion TEXT
);

CREATE TABLE usuario_permisos (
    usuario_id UUID    NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    permiso_id INTEGER NOT NULL REFERENCES permisos(id) ON DELETE CASCADE,
    PRIMARY KEY (usuario_id, permiso_id)
);

CREATE TABLE grupos (
    id         SERIAL PRIMARY KEY,
    nombre     VARCHAR(100) NOT NULL,
    categoria  VARCHAR(50)  NOT NULL,
    nivel      VARCHAR(20)  NOT NULL,
    autor_id   UUID         NOT NULL REFERENCES usuarios(id),
    created_at TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE grupo_miembros (
    id         SERIAL PRIMARY KEY,
    grupo_id   INTEGER NOT NULL REFERENCES grupos(id) ON DELETE CASCADE,
    usuario_id UUID    NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    UNIQUE (grupo_id, usuario_id)
);

CREATE TABLE ticket_estados (
    id     SERIAL PRIMARY KEY,
    nombre VARCHAR(30) NOT NULL UNIQUE
);

CREATE TABLE tickets (
    id             SERIAL PRIMARY KEY,
    titulo         VARCHAR(200) NOT NULL,
    descripcion    TEXT         NOT NULL,
    estado_id      INTEGER      NOT NULL REFERENCES ticket_estados(id) DEFAULT 1,
    prioridad      VARCHAR(10)  NOT NULL DEFAULT 'Media',
    asignado_a     UUID REFERENCES usuarios(id),
    creador_id     UUID         NOT NULL REFERENCES usuarios(id),
    fecha_creacion TIMESTAMPTZ  NOT NULL DEFAULT now(),
    fecha_limite   DATE         NOT NULL,
    grupo_id       INTEGER      NOT NULL REFERENCES grupos(id) ON DELETE CASCADE
);

CREATE TABLE ticket_comentarios (
    id        SERIAL PRIMARY KEY,
    ticket_id INTEGER     NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    autor_id  UUID        NOT NULL REFERENCES usuarios(id),
    texto     TEXT        NOT NULL,
    fecha     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE ticket_historial (
    id        SERIAL PRIMARY KEY,
    ticket_id INTEGER     NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    autor_id  UUID        NOT NULL REFERENCES usuarios(id),
    cambio    TEXT        NOT NULL,
    fecha     TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### Seed (datos verificados contra proyecto Angular)

**ticket_estados:**
- Pendiente, En Progreso, Revisión, Finalizado

**Usuarios:**
| usuario | email | full_name | activo | permisos |
|---|---|---|---|---|
| admin | admin@miapp.com | Carlos Ramírez | true | todos (14) |
| usuario | usuario@miapp.com | Laura Mendoza | true | group:view, ticket:view, ticket:edit_state |
| test | test@miapp.com | Pedro Soto | false | group:view, ticket:view |

Contraseñas (bcrypt costo 10): Admin@12345 / User@12345! / Test#12345

**Permisos (14):**
group:view, group:edit, group:add, group:delete,
ticket:view, ticket:edit, ticket:add, ticket:delete, ticket:edit_state,
user:view, users:view, user:add, user:edit, user:delete

**Grupos:**
| nombre | categoria | nivel | autor |
|---|---|---|---|
| Grupo Alpha | Tecnología | Avanzado | admin |
| Grupo Beta | Marketing | Intermedio | usuario |
| Grupo Gamma | Ventas | Básico | test |

**Miembros:**
- Grupo Alpha: admin, usuario, test
- Grupo Beta: usuario, test
- Grupo Gamma: test, admin, usuario

**Tickets (todos en Grupo Alpha):**
| titulo | estado | prioridad | asignado | creador | fecha_limite |
|---|---|---|---|---|---|
| Configurar entorno de staging | En Progreso | Alta | admin | admin | 2026-03-15 |
| Revisar vulnerabilidades de seguridad | Pendiente | Crítica | usuario | admin | 2026-03-10 |
| Optimizar consultas SQL del módulo de reportes | Revisión | Media | test | usuario | 2026-03-20 |
| Actualizar dependencias de Node.js | Finalizado | Baja | admin | test | 2026-02-28 |

**Comentarios (ticket 1):**
- autor: admin, texto: "Iniciando configuración de Docker.", fecha: 2026-02-11

**Historial (ticket 1):**
- cambio: "Estado cambiado a En Progreso", fecha: 2026-02-12, autor: admin

---

## Código Compartido (`shared/`)

### `shared/response.js`

```js
const ok   = (data, message = 'Ok') => ({ success: true,  data,       message })
const fail = (error)                 => ({ success: false, data: null, error })
module.exports = { ok, fail }
```

### Estructura de respuesta

**Éxito:**
```json
{ "success": true, "data": { ... }, "message": "Ok" }
```

**Error:**
```json
{ "success": false, "data": null, "error": "Mensaje de error" }
```

### `shared/schemas/` — JSON Schemas Fastify

Un archivo por dominio. Cada servicio importa los schemas que necesita:

```js
const { loginBody, tokenResponse } = require('../shared/schemas/auth.schemas')

fastify.post('/auth/login', {
    schema: { body: loginBody, response: { 200: tokenResponse } }
}, handler)
```

Archivos:
- `auth.schemas.js` — loginBody, registerBody, tokenResponse
- `user.schemas.js` — userResponse, updateUserBody, permissionsBody
- `group.schemas.js` — groupResponse, createGroupBody, memberBody
- `ticket.schemas.js` — ticketResponse, createTicketBody, updateTicketBody, estadoBody

---

## Flujo de Autenticación

```
1. Login
   Angular → POST /auth/login → Gateway → User Service
   User Service: valida bcrypt → genera JWT → guarda en Redis (TTL 24h)
   Respuesta: { success: true, data: { token, user: { id, email, full_name, permissions[] } } }

2. Request autenticado
   Angular envía: Authorization: Bearer <token>
   Gateway: busca token en Redis → si existe extrae payload
   Gateway: inyecta header X-User: <JSON payload> → reenvía al servicio
   Servicio: lee X-User, verifica permiso requerido → responde

3. Logout
   Angular → POST /auth/logout → Gateway → User Service
   User Service: elimina token de Redis → siguientes requests con ese token → 401
```

---

## Endpoints

### Gateway (3000)

| Path | Enruta a | Requiere JWT |
|---|---|---|
| POST /auth/login | user-service | No |
| POST /auth/register | user-service | No |
| * /auth/* | user-service | Sí |
| * /users/* | user-service | Sí |
| * /groups/* | group-service | Sí |
| * /tickets/* | ticket-service | Sí |

### User Service (3001)

| Método | Path | Permiso requerido |
|---|---|---|
| POST | /auth/login | — |
| POST | /auth/register | — |
| POST | /auth/logout | — |
| GET | /users | users:view |
| GET | /users/:id | — |
| PUT | /users/:id | user:edit |
| DELETE | /users/:id | user:delete |
| GET | /users/:id/permissions | — |
| PUT | /users/:id/permissions | user:edit |

### Group Service (3002)

| Método | Path | Permiso requerido |
|---|---|---|
| GET | /groups | group:view |
| POST | /groups | group:add |
| PUT | /groups/:id | group:edit |
| DELETE | /groups/:id | group:delete |
| GET | /groups/:id/members | group:view |
| POST | /groups/:id/members | group:edit |
| DELETE | /groups/:id/members/:userId | group:edit |

### Ticket Service (3003)

| Método | Path | Permiso requerido |
|---|---|---|
| GET | /tickets?grupoId= | ticket:view |
| POST | /tickets | ticket:add |
| PUT | /tickets/:id | ticket:edit |
| PATCH | /tickets/:id/estado | ticket:edit_state |
| DELETE | /tickets/:id | ticket:delete |
| POST | /tickets/:id/comments | ticket:view |
| GET | /tickets/:id/history | ticket:view |

---

## Tests

Framework: `node:test` (built-in Node.js). Tests de integración con `app.inject()` de Fastify.

| Servicio | Archivo | Cobertura |
|---|---|---|
| user-service | test/auth.test.js | login válido, password incorrecto, registro, email duplicado |
| user-service | test/users.test.js | CRUD usuarios + asignar permisos |
| group-service | test/groups.test.js | CRUD grupos + miembros |
| ticket-service | test/tickets.test.js | CRUD tickets + cambio estado + comentarios |

---

## Variables de Entorno (`.env` por servicio)

```
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
JWT_SECRET=secreto_seguro
REDIS_URL=redis://localhost:6379
PORT=300x
```
