# Backend Hardening — ERP-DGM Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar los puntos faltantes del backend: schema JSON universal, health endpoint, rate limiting, permisos por endpoint en gateway, permisos por grupo en JWT, logs en BD, y métricas en BD.

**Architecture:** Todas las respuestas usan un envelope `{ statusCode, intOpCode, data }`. El gateway agrega health, rate-limit, y verificación de permisos por ruta. Un hook `onResponse` en cada servicio inserta logs y métricas en Supabase. Los permisos se almacenan globalmente y también por grupo en la tabla `grupo_miembro_permisos`.

**Tech Stack:** Node.js, Fastify 5, @fastify/rate-limit, @supabase/supabase-js, Supabase (PostgreSQL), JWT

---

## Archivos a tocar

| Archivo | Acción |
|---------|--------|
| `backend/shared/response.js` | Modificar — nuevo envelope `statusCode + intOpCode + data` |
| `backend/shared/logger.js` | Crear — helper que inserta log/métrica en Supabase |
| `supabase/migrations/003_logs_metrics.sql` (en erp-dgm) | Crear — tablas `logs`, `metricas`, `grupo_miembro_permisos` |
| `backend/gateway/src/app.js` | Modificar — health, rate-limit, permiso por endpoint, hook de log |
| `backend/gateway/src/permissions.js` | Crear — mapa `METHOD:PATTERN → permiso requerido` |
| `backend/gateway/package.json` | Modificar — agregar `@fastify/rate-limit` |
| `backend/user-service/src/routes/auth.routes.js` | Modificar — JWT con `groupPermissions`, endpoint refresh, nuevo envelope |
| `backend/user-service/src/routes/users.routes.js` | Modificar — nuevo envelope |
| `backend/group-service/src/routes/groups.routes.js` | Modificar — nuevo envelope, permisos por grupo |
| `backend/ticket-service/src/routes/tickets.routes.js` | Modificar — nuevo envelope |

---

## Task 1: Migración SQL — tablas logs, métricas y permisos por grupo

**Files:**
- Create: `C:/Users/dg660/Documents/Clases/pagina/erp-dgm/supabase/migrations/003_logs_metrics.sql`

- [ ] **Crear el archivo de migración** con este contenido exacto:

```sql
-- =============================================================
-- ERP-DGM — Logs, Métricas y Permisos por Grupo
-- Ejecutar DESPUÉS de 001_schema.sql y 002_seed.sql
-- =============================================================

-- -------------------------
-- 1. LOGS DE REQUESTS
-- -------------------------
CREATE TABLE IF NOT EXISTS logs (
    id          BIGSERIAL    PRIMARY KEY,
    servicio    VARCHAR(20)  NOT NULL,          -- gateway | user | group | ticket
    metodo      VARCHAR(10)  NOT NULL,          -- GET POST PUT PATCH DELETE
    endpoint    VARCHAR(200) NOT NULL,
    usuario_id  UUID         REFERENCES usuarios(id) ON DELETE SET NULL,
    ip          VARCHAR(45),
    status_code INTEGER      NOT NULL,
    duracion_ms INTEGER,                        -- tiempo de respuesta en ms
    error_msg   TEXT,                           -- solo para errores
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_logs_servicio   ON logs(servicio);
CREATE INDEX IF NOT EXISTS idx_logs_created_at ON logs(created_at DESC);

-- -------------------------
-- 2. MÉTRICAS POR ENDPOINT
-- -------------------------
CREATE TABLE IF NOT EXISTS metricas (
    id              BIGSERIAL    PRIMARY KEY,
    servicio        VARCHAR(20)  NOT NULL,
    metodo          VARCHAR(10)  NOT NULL,
    endpoint        VARCHAR(200) NOT NULL,
    total_requests  INTEGER      NOT NULL DEFAULT 0,
    total_duracion  BIGINT       NOT NULL DEFAULT 0,   -- suma de ms para calcular avg
    UNIQUE (servicio, metodo, endpoint)
);

-- -------------------------
-- 3. PERMISOS POR GRUPO/USUARIO
-- -------------------------
CREATE TABLE IF NOT EXISTS grupo_miembro_permisos (
    id         SERIAL      PRIMARY KEY,
    grupo_id   INTEGER     NOT NULL REFERENCES grupos(id)    ON DELETE CASCADE,
    usuario_id UUID        NOT NULL REFERENCES usuarios(id)  ON DELETE CASCADE,
    permiso    VARCHAR(50) NOT NULL,
    UNIQUE (grupo_id, usuario_id, permiso)
);

CREATE INDEX IF NOT EXISTS idx_gmp_usuario ON grupo_miembro_permisos(usuario_id);
CREATE INDEX IF NOT EXISTS idx_gmp_grupo   ON grupo_miembro_permisos(grupo_id);

-- -------------------------
-- 4. SEED: permisos por grupo del usuario admin
-- -------------------------
INSERT INTO grupo_miembro_permisos (grupo_id, usuario_id, permiso)
SELECT g.id, 'a0000000-0000-0000-0000-000000000001', p.clave
FROM grupos g, permisos p
ON CONFLICT DO NOTHING;

-- usuario normal solo tiene ticket:view y ticket:edit_state en sus grupos
INSERT INTO grupo_miembro_permisos (grupo_id, usuario_id, permiso) VALUES
    (1, 'a0000000-0000-0000-0000-000000000002', 'ticket:view'),
    (1, 'a0000000-0000-0000-0000-000000000002', 'ticket:edit_state'),
    (2, 'a0000000-0000-0000-0000-000000000002', 'ticket:view'),
    (2, 'a0000000-0000-0000-0000-000000000002', 'ticket:edit_state'),
    (3, 'a0000000-0000-0000-0000-000000000002', 'ticket:view'),
    (3, 'a0000000-0000-0000-0000-000000000002', 'ticket:edit_state')
ON CONFLICT DO NOTHING;
```

- [ ] **Ejecutar la migración** en el SQL Editor de Supabase (copiar y pegar el contenido).

---

## Task 2: Actualizar `shared/response.js` — nuevo envelope

**Files:**
- Modify: `C:/Users/dg660/Documents/Clases/pagina/backend/shared/response.js`

Los intOpCodes siguen el patrón `Sx<SVC><CODE>`:
- Gateway: `SxGW`
- User Service: `SxUS`
- Group Service: `SxGS`
- Ticket Service: `SxTS`

- [ ] **Reemplazar todo el contenido de `shared/response.js`:**

```js
'use strict'

/**
 * Envelope estándar ERP-DGM.
 *
 * Éxito:  { statusCode, intOpCode, data, message }
 * Error:  { statusCode, intOpCode, data: null, error }
 *
 * @param {any}    data       - payload
 * @param {string} svc        - prefijo del servicio: 'GW' | 'US' | 'GS' | 'TS'
 * @param {number} code       - HTTP status code (default 200)
 * @param {string} message    - mensaje opcional
 */
function ok(data, svc = 'GW', code = 200, message = 'Ok') {
    return { statusCode: code, intOpCode: `Sx${svc}${code}`, data, message }
}

/**
 * @param {string} error   - mensaje de error
 * @param {string} svc     - prefijo del servicio
 * @param {number} code    - HTTP status code (default 400)
 */
function fail(error, svc = 'GW', code = 400) {
    return { statusCode: code, intOpCode: `Sx${svc}${code}`, data: null, error }
}

module.exports = { ok, fail }
```

---

## Task 3: Crear `shared/logger.js` — helper logs y métricas

**Files:**
- Create: `C:/Users/dg660/Documents/Clases/pagina/backend/shared/logger.js`

- [ ] **Crear el archivo con este contenido exacto:**

```js
'use strict'
const { createClient } = require('@supabase/supabase-js')

// El cliente se inicializa lazy para no bloquear si SUPABASE_URL no está disponible
let _supabase = null
function getDb() {
    if (!_supabase) {
        _supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_ANON_KEY
        )
    }
    return _supabase
}

/**
 * Inserta un registro de log en la tabla `logs`.
 * Fire-and-forget: no lanza excepciones.
 */
async function insertLog({ servicio, metodo, endpoint, usuarioId, ip, statusCode, duracionMs, errorMsg }) {
    try {
        await getDb().from('logs').insert({
            servicio,
            metodo,
            endpoint,
            usuario_id:  usuarioId ?? null,
            ip:          ip ?? null,
            status_code: statusCode,
            duracion_ms: duracionMs ?? null,
            error_msg:   errorMsg ?? null,
        })
    } catch (_) {
        // silencioso — no interrumpir el flujo principal
    }
}

/**
 * Actualiza (upsert) la fila de métricas para el endpoint dado.
 * Fire-and-forget: no lanza excepciones.
 */
async function upsertMetrica({ servicio, metodo, endpoint, duracionMs }) {
    try {
        const db = getDb()
        // Intentar incrementar si existe
        const { data } = await db
            .from('metricas')
            .select('id, total_requests, total_duracion')
            .eq('servicio', servicio)
            .eq('metodo', metodo)
            .eq('endpoint', endpoint)
            .maybeSingle()

        if (data) {
            await db.from('metricas').update({
                total_requests: data.total_requests + 1,
                total_duracion: data.total_duracion + (duracionMs ?? 0),
            }).eq('id', data.id)
        } else {
            await db.from('metricas').insert({
                servicio, metodo, endpoint,
                total_requests: 1,
                total_duracion: duracionMs ?? 0,
            })
        }
    } catch (_) {
        // silencioso
    }
}

module.exports = { insertLog, upsertMetrica }
```

---

## Task 4: Crear `gateway/src/permissions.js` — mapa de permisos por ruta

**Files:**
- Create: `C:/Users/dg660/Documents/Clases/pagina/backend/gateway/src/permissions.js`

- [ ] **Crear el archivo con este contenido exacto:**

```js
'use strict'

/**
 * Mapa de permisos requeridos por ruta del gateway.
 * Cada entrada: { method, pattern (RegExp), permission }
 * Si una ruta no aparece aquí, solo se valida el JWT (no permisos específicos).
 */
const ROUTE_PERMISSIONS = [
    // ── Tickets ────────────────────────────────────────
    { method: 'POST',   pattern: /^\/tickets$/,               permission: 'ticket:add' },
    { method: 'PUT',    pattern: /^\/tickets\/\d+$/,          permission: 'ticket:edit' },
    { method: 'PATCH',  pattern: /^\/tickets\/\d+\/estado$/,  permission: 'ticket:edit_state' },
    { method: 'DELETE', pattern: /^\/tickets\/\d+$/,          permission: 'ticket:delete' },
    // ── Groups ─────────────────────────────────────────
    { method: 'POST',   pattern: /^\/groups$/,                permission: 'group:add' },
    { method: 'PUT',    pattern: /^\/groups\/\d+$/,           permission: 'group:edit' },
    { method: 'DELETE', pattern: /^\/groups\/\d+$/,           permission: 'group:delete' },
    { method: 'POST',   pattern: /^\/groups\/\d+\/members$/,  permission: 'group:edit' },
    { method: 'DELETE', pattern: /^\/groups\/\d+\/members\/.+$/, permission: 'group:edit' },
    // ── Users ──────────────────────────────────────────
    { method: 'GET',    pattern: /^\/users$/,                 permission: 'users:view' },
    { method: 'PUT',    pattern: /^\/users\/.+$/,             permission: 'user:edit' },
    { method: 'DELETE', pattern: /^\/users\/.+$/,             permission: 'user:delete' },
    { method: 'PUT',    pattern: /^\/users\/.+\/permissions$/, permission: 'user:edit' },
]

/**
 * Devuelve el permiso requerido para method + url, o null si no aplica.
 * @param {string} method
 * @param {string} url  — solo el pathname, sin query string
 */
function requiredPermission(method, url) {
    const pathname = url.split('?')[0]
    const entry = ROUTE_PERMISSIONS.find(
        (r) => r.method === method && r.pattern.test(pathname)
    )
    return entry?.permission ?? null
}

module.exports = { requiredPermission }
```

---

## Task 5: Instalar `@fastify/rate-limit` en el gateway

**Files:**
- Modify: `C:/Users/dg660/Documents/Clases/pagina/backend/gateway/package.json` (auto)

- [ ] **Ejecutar en terminal:**

```bash
cd "C:/Users/dg660/Documents/Clases/pagina/backend/gateway"
npm install @fastify/rate-limit
```

Salida esperada: `added 1 package` (o similar, sin errores).

---

## Task 6: Actualizar `gateway/src/app.js` — health, rate-limit, permisos, logs

**Files:**
- Modify: `C:/Users/dg660/Documents/Clases/pagina/backend/gateway/src/app.js`

- [ ] **Reemplazar TODO el contenido del archivo:**

```js
'use strict'
const fastify     = require('fastify')
const httpProxy   = require('@fastify/http-proxy')
const { ok, fail }            = require('../../../shared/response')
const { requiredPermission }  = require('./permissions')
const { insertLog, upsertMetrica } = require('../../../shared/logger')

const PUBLIC_URLS = ['/auth/login', '/auth/register']

function buildApp(opts = {}) {
    const app = fastify({ logger: opts.logger ?? true })

    // ── CORS ────────────────────────────────────────────────────────────────
    app.register(require('@fastify/cors'), {
        origin: 'http://localhost:4200',
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        credentials: true,
    })

    // ── Rate limiting ────────────────────────────────────────────────────────
    app.register(require('@fastify/rate-limit'), {
        max: 100,
        timeWindow: '1 minute',
        errorResponseBuilder: () => fail('Too many requests', 'GW', 429),
    })

    // ── JWT ──────────────────────────────────────────────────────────────────
    app.register(require('@fastify/jwt'), {
        secret: process.env.JWT_SECRET || 'dev_secret',
    })

    // ── Health endpoint ──────────────────────────────────────────────────────
    app.get('/health', async (_req, reply) => {
        return reply.code(200).send(ok({ status: 'ok', ts: new Date().toISOString() }, 'GW', 200, 'Gateway healthy'))
    })

    // ── Auth + Permission hook ───────────────────────────────────────────────
    app.addHook('onRequest', async (request, reply) => {
        if (request.method === 'OPTIONS') return
        if (request.url === '/health') return

        const isPublic = PUBLIC_URLS.includes(request.url.split('?')[0])
        if (isPublic) return

        // 1. Validar JWT
        try {
            await request.jwtVerify()
        } catch {
            return reply.code(401).send(fail('Token inválido o ausente', 'GW', 401))
        }

        // 2. Verificar permiso específico del endpoint
        const required = requiredPermission(request.method, request.url)
        if (required) {
            const perms = request.user?.permissions ?? []
            if (!perms.includes(required)) {
                return reply.code(403).send(fail(`Permiso requerido: ${required}`, 'GW', 403))
            }
        }
    })

    // ── Log + Métrica hook (fire-and-forget) ─────────────────────────────────
    app.addHook('onResponse', async (request, reply) => {
        if (request.method === 'OPTIONS' || request.url === '/health') return
        const duracion = Math.round(reply.elapsedTime)
        const usuarioId = request.user?.userId ?? null
        const ip = request.ip

        insertLog({
            servicio:   'gateway',
            metodo:     request.method,
            endpoint:   request.url.split('?')[0],
            usuarioId,
            ip,
            statusCode: reply.statusCode,
            duracionMs: duracion,
            errorMsg:   reply.statusCode >= 400 ? reply.raw.statusMessage ?? null : null,
        })

        upsertMetrica({
            servicio:  'gateway',
            metodo:    request.method,
            endpoint:  request.url.split('?')[0],
            duracionMs: duracion,
        })
    })

    // ── Proxies ───────────────────────────────────────────────────────────────
    const userUrl   = process.env.USER_SERVICE_URL   || 'http://localhost:3001'
    const groupUrl  = process.env.GROUP_SERVICE_URL  || 'http://localhost:3002'
    const ticketUrl = process.env.TICKET_SERVICE_URL || 'http://localhost:3003'

    app.register(httpProxy, { upstream: userUrl,   prefix: '/auth',    rewritePrefix: '/auth'    })
    app.register(httpProxy, { upstream: userUrl,   prefix: '/users',   rewritePrefix: '/users'   })
    app.register(httpProxy, { upstream: groupUrl,  prefix: '/groups',  rewritePrefix: '/groups'  })
    app.register(httpProxy, { upstream: ticketUrl, prefix: '/tickets', rewritePrefix: '/tickets' })

    return app
}

module.exports = buildApp
```

---

## Task 7: Actualizar `auth.routes.js` — JWT con permisos por grupo + endpoint refresh

**Files:**
- Modify: `C:/Users/dg660/Documents/Clases/pagina/backend/user-service/src/routes/auth.routes.js`

- [ ] **Reemplazar todo el contenido:**

```js
'use strict'
const bcrypt   = require('bcryptjs')
const supabase = require('../db')
const { ok, fail } = require('../../../shared/response')
const { loginBody, registerBody } = require('../../../shared/schemas/auth.schemas')

async function getGlobalPermissions(userId) {
    const { data } = await supabase
        .from('usuario_permisos')
        .select('permisos(clave)')
        .eq('usuario_id', userId)
    return (data || []).map((r) => r.permisos.clave)
}

async function getGroupPermissions(userId) {
    const { data } = await supabase
        .from('grupo_miembro_permisos')
        .select('grupo_id, permiso')
        .eq('usuario_id', userId)
    const map = {}
    for (const row of (data || [])) {
        const key = String(row.grupo_id)
        if (!map[key]) map[key] = []
        map[key].push(row.permiso)
    }
    return map
}

async function authRoutes(fastify) {
    // POST /auth/login
    fastify.post('/auth/login', {
        schema: { body: loginBody },
    }, async (request, reply) => {
        const { email, password } = request.body

        const { data: usuario, error } = await supabase
            .from('usuarios')
            .select('id, email, full_name, password_hash, activo')
            .eq('email', email)
            .single()

        if (error || !usuario)
            return reply.code(401).send(fail('Credenciales inválidas', 'US', 401))

        if (!usuario.activo)
            return reply.code(401).send(fail('Usuario inactivo', 'US', 401))

        const valid = await bcrypt.compare(password, usuario.password_hash)
        if (!valid)
            return reply.code(401).send(fail('Credenciales inválidas', 'US', 401))

        const [permissions, groupPermissions] = await Promise.all([
            getGlobalPermissions(usuario.id),
            getGroupPermissions(usuario.id),
        ])

        const token = fastify.jwt.sign(
            { userId: usuario.id, email: usuario.email, permissions, groupPermissions },
            { expiresIn: '24h' }
        )

        return reply.code(200).send(ok({
            token,
            user: { id: usuario.id, email: usuario.email, full_name: usuario.full_name, permissions, groupPermissions },
        }, 'US', 200, 'Login exitoso'))
    })

    // POST /auth/register
    fastify.post('/auth/register', {
        schema: { body: registerBody },
    }, async (request, reply) => {
        const { usuario, email, password, full_name, address, phone, birth_date } = request.body

        const { data: exists } = await supabase
            .from('usuarios')
            .select('id')
            .or(`email.eq.${email},usuario.eq.${usuario}`)
            .limit(1)
            .maybeSingle()

        if (exists)
            return reply.code(409).send(fail('Email o usuario ya registrado', 'US', 409))

        const password_hash = await bcrypt.hash(password, 10)
        const { data: newUser, error } = await supabase
            .from('usuarios')
            .insert({ usuario, email, password_hash, full_name, address, phone, birth_date, activo: true })
            .select('id')
            .single()

        if (error)
            return reply.code(500).send(fail('Error al crear usuario', 'US', 500))

        const { data: defaultPerms } = await supabase
            .from('permisos')
            .select('id')
            .in('clave', ['group:view', 'ticket:view'])

        if (defaultPerms?.length > 0) {
            await supabase.from('usuario_permisos').insert(
                defaultPerms.map((p) => ({ usuario_id: newUser.id, permiso_id: p.id }))
            )
        }

        return reply.code(201).send(ok({ id: newUser.id }, 'US', 201, 'Usuario creado exitosamente'))
    })

    // GET /auth/permissions/group/:groupId — refrescar permisos de un grupo
    fastify.get('/auth/permissions/group/:groupId', async (request, reply) => {
        try {
            await request.jwtVerify()
        } catch {
            return reply.code(401).send(fail('Token inválido o ausente', 'US', 401))
        }
        const { groupId } = request.params
        const { data } = await supabase
            .from('grupo_miembro_permisos')
            .select('permiso')
            .eq('usuario_id', request.user.userId)
            .eq('grupo_id', groupId)

        const permisos = (data || []).map((r) => r.permiso)
        return reply.code(200).send(ok(permisos, 'US', 200))
    })

    // POST /auth/logout
    fastify.post('/auth/logout', async (request, reply) => {
        if (request.method === 'OPTIONS') return
        try {
            await request.jwtVerify()
        } catch {
            return reply.code(401).send(fail('Token inválido o ausente', 'US', 401))
        }
        return reply.code(200).send(ok(null, 'US', 200, 'Sesión cerrada'))
    })
}

module.exports = authRoutes
```

---

## Task 8: Actualizar `users.routes.js` — nuevo envelope + logs

**Files:**
- Modify: `C:/Users/dg660/Documents/Clases/pagina/backend/user-service/src/routes/users.routes.js`

- [ ] **Reemplazar el bloque de imports y el hook onRequest al inicio:**

Sustituir la primera parte del archivo (hasta el primer `fastify.get`) con:

```js
'use strict'
const supabase = require('../db')
const { ok, fail } = require('../../../shared/response')
const { updateUserBody, permissionsBody } = require('../../../shared/schemas/user.schemas')
const { insertLog, upsertMetrica } = require('../../../shared/logger')

async function usersRoutes(fastify) {
    fastify.addHook('onRequest', async (request, reply) => {
        if (request.method === 'OPTIONS') return
        try {
            await request.jwtVerify()
        } catch {
            return reply.code(401).send(fail('Token inválido o ausente', 'US', 401))
        }
    })

    fastify.addHook('onResponse', async (request, reply) => {
        if (request.method === 'OPTIONS') return
        insertLog({
            servicio: 'user',
            metodo: request.method,
            endpoint: request.url.split('?')[0],
            usuarioId: request.user?.userId ?? null,
            ip: request.ip,
            statusCode: reply.statusCode,
            duracionMs: Math.round(reply.elapsedTime),
        })
        upsertMetrica({
            servicio: 'user',
            metodo: request.method,
            endpoint: request.url.split('?')[0],
            duracionMs: Math.round(reply.elapsedTime),
        })
    })
```

- [ ] **Actualizar TODAS las llamadas `ok()` y `fail()` en el resto del archivo** cambiando:
  - `ok(data)` → `ok(data, 'US', 200)`
  - `ok(data, 'mensaje')` → `ok(data, 'US', 200, 'mensaje')`
  - `ok(null, 'mensaje')` → `ok(null, 'US', 200, 'mensaje')`
  - `fail('mensaje')` → `fail('mensaje', 'US', 400)` (ajustar código según contexto: 404, 403, 500)

---

## Task 9: Actualizar `groups.routes.js` — nuevo envelope + logs + permisos por grupo

**Files:**
- Modify: `C:/Users/dg660/Documents/Clases/pagina/backend/group-service/src/routes/groups.routes.js`

- [ ] **Reemplazar el inicio del archivo (hook onRequest) con:**

```js
'use strict'
const supabase = require('../db')
const { ok, fail } = require('../../../shared/response')
const { createGroupBody, memberBody } = require('../../../shared/schemas/group.schemas')
const { insertLog, upsertMetrica } = require('../../../shared/logger')

async function groupsRoutes(fastify) {
    fastify.addHook('onRequest', async (request, reply) => {
        if (request.method === 'OPTIONS') return
        try {
            await request.jwtVerify()
        } catch {
            return reply.code(401).send(fail('Token inválido o ausente', 'GS', 401))
        }
    })

    fastify.addHook('onResponse', async (request, reply) => {
        if (request.method === 'OPTIONS') return
        insertLog({
            servicio: 'group',
            metodo: request.method,
            endpoint: request.url.split('?')[0],
            usuarioId: request.user?.userId ?? null,
            ip: request.ip,
            statusCode: reply.statusCode,
            duracionMs: Math.round(reply.elapsedTime),
        })
        upsertMetrica({
            servicio: 'group',
            metodo: request.method,
            endpoint: request.url.split('?')[0],
            duracionMs: Math.round(reply.elapsedTime),
        })
    })
```

- [ ] **Actualizar todas las llamadas `ok()`/`fail()`** usando prefijo `'GS'`:
  - `fail('Sin permiso')` → `fail('Sin permiso', 'GS', 403)`
  - `fail('Error al obtener grupos')` → `fail('Error al obtener grupos', 'GS', 500)`
  - `ok([])` → `ok([], 'GS', 200)`
  - `ok(data)` → `ok(data, 'GS', 200)`
  - `ok(data, 'Grupo creado exitosamente')` → `ok(data, 'GS', 201, 'Grupo creado exitosamente')`
  - etc.

- [ ] **Agregar endpoint `GET /groups/:id/member-permissions`** antes del cierre de `groupsRoutes`:

```js
    // GET /groups/:id/member-permissions/:userId — permisos de un miembro en un grupo
    fastify.get('/:id/member-permissions/:userId', async (request, reply) => {
        if (!request.user.permissions.includes('group:view')) {
            return reply.code(403).send(fail('Sin permiso', 'GS', 403))
        }
        const { data, error } = await supabase
            .from('grupo_miembro_permisos')
            .select('permiso')
            .eq('grupo_id', request.params.id)
            .eq('usuario_id', request.params.userId)

        if (error) return reply.code(500).send(fail('Error al obtener permisos', 'GS', 500))
        return reply.code(200).send(ok((data || []).map(r => r.permiso), 'GS', 200))
    })

    // PUT /groups/:id/member-permissions/:userId — asignar permisos a un miembro en un grupo
    fastify.put('/:id/member-permissions/:userId', async (request, reply) => {
        if (!request.user.permissions.includes('group:edit')) {
            return reply.code(403).send(fail('Sin permiso', 'GS', 403))
        }
        const { permissions } = request.body ?? {}
        if (!Array.isArray(permissions)) {
            return reply.code(400).send(fail('permissions debe ser un array', 'GS', 400))
        }
        const groupId = Number(request.params.id)
        const userId  = request.params.userId

        await supabase.from('grupo_miembro_permisos')
            .delete()
            .eq('grupo_id', groupId)
            .eq('usuario_id', userId)

        if (permissions.length > 0) {
            await supabase.from('grupo_miembro_permisos').insert(
                permissions.map((p) => ({ grupo_id: groupId, usuario_id: userId, permiso: p }))
            )
        }

        return reply.code(200).send(ok(permissions, 'GS', 200, 'Permisos actualizados'))
    })
```

---

## Task 10: Actualizar `tickets.routes.js` — nuevo envelope + logs

**Files:**
- Modify: `C:/Users/dg660/Documents/Clases/pagina/backend/ticket-service/src/routes/tickets.routes.js`

- [ ] **Reemplazar el inicio del archivo (hook onRequest) con:**

```js
'use strict'
const supabase = require('../db')
const { ok, fail } = require('../../../shared/response')
const { createTicketBody, updateTicketBody, estadoBody, comentarioBody } = require('../../../shared/schemas/ticket.schemas')
const { insertLog, upsertMetrica } = require('../../../shared/logger')

async function ticketsRoutes(fastify) {
    fastify.addHook('onRequest', async (request, reply) => {
        if (request.method === 'OPTIONS') return
        try {
            await request.jwtVerify()
        } catch {
            return reply.code(401).send(fail('Token inválido o ausente', 'TS', 401))
        }
    })

    fastify.addHook('onResponse', async (request, reply) => {
        if (request.method === 'OPTIONS') return
        insertLog({
            servicio: 'ticket',
            metodo: request.method,
            endpoint: request.url.split('?')[0],
            usuarioId: request.user?.userId ?? null,
            ip: request.ip,
            statusCode: reply.statusCode,
            duracionMs: Math.round(reply.elapsedTime),
        })
        upsertMetrica({
            servicio: 'ticket',
            metodo: request.method,
            endpoint: request.url.split('?')[0],
            duracionMs: Math.round(reply.elapsedTime),
        })
    })
```

- [ ] **Actualizar todas las llamadas `ok()`/`fail()`** usando prefijo `'TS'`:
  - `fail('Sin permiso')` → `fail('Sin permiso', 'TS', 403)`
  - `fail('Error al obtener tickets')` → `fail('Error al obtener tickets', 'TS', 500)`
  - `ok(data)` → `ok(data, 'TS', 200)`
  - `ok(data, 'Ticket creado exitosamente')` → `ok(data, 'TS', 201, 'Ticket creado exitosamente')`
  - `ok(null, 'Ticket eliminado')` → `ok(null, 'TS', 200, 'Ticket eliminado')`
  - etc.

---

## Task 11: Actualizar el frontend — respuesta con nuevo esquema

**Files:**
- Modify: `C:/Users/dg660/Documents/Clases/pagina/erp-dgm/src/app/services/auth.service.ts`
- Modify: `C:/Users/dg660/Documents/Clases/pagina/erp-dgm/src/app/services/ticket.service.ts`

El nuevo esquema de respuesta es `{ statusCode, intOpCode, data, message }` en lugar de `{ success, data, message }`.

- [ ] **En `auth.service.ts`**, actualizar el pipe del método `login()`:

```typescript
// Cambiar el tipo de respuesta esperada de:
.post<{ success: boolean; data: { token: string; user: {...} }; message: string }>
// A:
.post<{ statusCode: number; intOpCode: string; data: { token: string; user: { id: string; email: string; permissions: string[]; groupPermissions: Record<string, string[]> } }; message: string }>
```

Y en el `tap`, cambiar `res.success && res.data` → `res.statusCode === 200 && res.data`.

- [ ] **En `auth.service.ts`**, actualizar el método `register()`:

```typescript
// Cambiar el tipo de respuesta esperada de:
.post<{ success: boolean; data: any; message: string }>
// A:
.post<{ statusCode: number; intOpCode: string; data: any; message: string }>
```

Y cambiar `res.success` por `res.statusCode < 300`.

- [ ] **En `ticket.service.ts`**, actualizar TODOS los tipos de respuesta:

```typescript
// Cambiar { success: boolean; data: any[] } por:
{ statusCode: number; intOpCode: string; data: any[] }
// Y cambiar { success: boolean; data: any } por:
{ statusCode: number; intOpCode: string; data: any }
```

No se necesita cambiar la lógica en los `map()` ya que todos usan `res.data` que no cambia.

---

## Task 12: Verificación final — reiniciar servicios y probar

- [ ] **Reiniciar todos los servicios** (en terminales separadas):

```bash
# Terminal 1
cd "C:/Users/dg660/Documents/Clases/pagina/backend/user-service"
node index.js

# Terminal 2
cd "C:/Users/dg660/Documents/Clases/pagina/backend/group-service"
node index.js

# Terminal 3
cd "C:/Users/dg660/Documents/Clases/pagina/backend/ticket-service"
node index.js

# Terminal 4
cd "C:/Users/dg660/Documents/Clases/pagina/backend/gateway"
node index.js
```

- [ ] **Probar health endpoint:**

```bash
curl http://localhost:3000/health
```

Salida esperada:
```json
{"statusCode":200,"intOpCode":"SxGW200","data":{"status":"ok","ts":"..."},"message":"Gateway healthy"}
```

- [ ] **Probar rate limiting** (ejecutar 101 veces seguidas):

```bash
for i in $(seq 1 101); do curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/health; done | tail -5
```

Salida esperada: las últimas líneas deben mostrar `429`.

- [ ] **Probar login y verificar nuevo esquema:**

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@miapp.com","password":"Admin@12345"}'
```

Salida esperada:
```json
{"statusCode":200,"intOpCode":"SxUS200","data":{"token":"eyJ...","user":{"id":"...","permissions":[...],"groupPermissions":{"1":[...],"2":[...]}}},"message":"Login exitoso"}
```

- [ ] **Verificar logs en Supabase** — abrir el Table Editor y revisar la tabla `logs`. Debe tener registros de los requests anteriores.

- [ ] **Verificar métricas en Supabase** — revisar la tabla `metricas`. Debe tener filas con `total_requests > 0`.

- [ ] **Probar permiso denegado en gateway (403):**

```bash
# Primero obtener token de usuario sin permisos admin
TOKEN=$(curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"usuario@miapp.com","password":"User@12345!"}' | node -e "process.stdin.resume();let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).data.token))")

# Intentar crear un grupo (requiere group:add)
curl -X POST http://localhost:3000/groups \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"nombre":"Test","categoria":"Ventas","nivel":"Básico"}'
```

Salida esperada:
```json
{"statusCode":403,"intOpCode":"SxGW403","data":null,"error":"Permiso requerido: group:add"}
```

---

## Checklist de cobertura de requerimientos

- [x] GET /health en gateway → Task 6
- [x] Rate limiting 100 req/min con 429 → Tasks 5, 6
- [x] Schema JSON universal `statusCode + intOpCode + data` → Tasks 2, 7-11
- [x] Gateway verifica permisos por endpoint → Tasks 4, 6
- [x] JWT con permisos por grupo → Tasks 1, 7
- [x] Endpoint refresh permisos por grupo → Task 7 (`GET /auth/permissions/group/:groupId`)
- [x] Logs en BD → Tasks 1, 3, 8, 9, 10
- [x] Métricas en BD → Tasks 1, 3, 8, 9, 10
