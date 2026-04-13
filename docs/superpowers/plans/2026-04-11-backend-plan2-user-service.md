# Backend Plan 2 — User Service

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Crear el microservicio de usuarios en Fastify (puerto 3001) que maneja autenticación, CRUD de usuarios y permisos, conectado a Supabase y Redis.

**Architecture:** Fastify en puerto 3001. `src/db.js` exporta el cliente Supabase. `src/redis.js` exporta el cliente Redis (ioredis). Las rutas usan los schemas de `shared/` y responden con el envelope de `shared/response.js`. Al hacer login, el JWT se guarda en Redis (TTL 24h). Al hacer logout, se elimina de Redis.

**Tech Stack:** Node.js, Fastify, @fastify/jwt, @supabase/supabase-js, ioredis, bcryptjs, dotenv, node:test

---

## Estructura de archivos

```
backend/user-service/
├── .env.example
├── .env                          ← NO commitear
├── package.json
├── index.js                      ← arranca servidor
├── src/
│   ├── app.js                    ← instancia Fastify + plugins + rutas
│   ├── db.js                     ← cliente Supabase
│   ├── redis.js                  ← cliente Redis (ioredis)
│   └── routes/
│       ├── auth.routes.js        ← POST /auth/login, /register, /logout
│       └── users.routes.js       ← GET/PUT/DELETE /users, /users/:id/permissions
└── test/
    ├── auth.test.js
    └── users.test.js
```

---

### Task 1: Inicializar proyecto

**Files:**
- Create: `backend/user-service/package.json`
- Create: `backend/user-service/.env.example`
- Create: `backend/user-service/.env`
- Create: `backend/user-service/index.js`

- [ ] **Step 1: Crear package.json**

Crear `backend/user-service/package.json`:
```json
{
  "name": "user-service",
  "version": "1.0.0",
  "main": "index.js",
  "scripts": {
    "start": "node index.js",
    "test": "node --test test/*.test.js"
  }
}
```

- [ ] **Step 2: Instalar dependencias**

```bash
cd C:/Users/dg660/Documents/Clases/pagina/backend/user-service
npm install fastify @fastify/jwt @supabase/supabase-js ioredis bcryptjs dotenv
```

- [ ] **Step 3: Crear .env.example**

Crear `backend/user-service/.env.example`:
```
PORT=3001
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
JWT_SECRET=cambia_esto_por_un_secreto_seguro
REDIS_URL=redis://localhost:6379
```

- [ ] **Step 4: Crear .env**

Crear `backend/user-service/.env` con tus valores reales de Supabase:
```
PORT=3001
SUPABASE_URL=https://TU_PROYECTO.supabase.co
SUPABASE_ANON_KEY=TU_ANON_KEY
JWT_SECRET=dev_secret_erp_dgm_2026
REDIS_URL=redis://localhost:6379
```

- [ ] **Step 5: Crear index.js**

Crear `backend/user-service/index.js`:
```js
'use strict'
require('dotenv').config()
const buildApp = require('./src/app')

const start = async () => {
    const app = buildApp()
    await app.listen({ port: Number(process.env.PORT) || 3001, host: '0.0.0.0' })
    console.log(`User Service corriendo en http://localhost:${process.env.PORT || 3001}`)
}

start().catch((err) => {
    console.error(err)
    process.exit(1)
})
```

---

### Task 2: Cliente Supabase

**Files:**
- Create: `backend/user-service/src/db.js`

- [ ] **Step 1: Crear src/db.js**

```js
'use strict'
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
)

module.exports = supabase
```

---

### Task 3: Cliente Redis

**Files:**
- Create: `backend/user-service/src/redis.js`

- [ ] **Step 1: Levantar Redis (si no está corriendo)**

```bash
docker run -d -p 6379:6379 --name redis-erp redis:7
```

O si ya tienes Redis instalado localmente, solo asegúrate de que esté corriendo en el puerto 6379.

- [ ] **Step 2: Crear src/redis.js**

```js
'use strict'
const Redis = require('ioredis')

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379')

redis.on('error', (err) => console.error('Redis error:', err))

module.exports = redis
```

---

### Task 4: App Fastify (esqueleto)

**Files:**
- Create: `backend/user-service/src/app.js`
- Create: `backend/user-service/src/routes/users.routes.js` (stub)

- [ ] **Step 1: Crear src/routes/users.routes.js (stub)**

```js
'use strict'
async function usersRoutes(fastify) {
    // implementado en Task 6
}
module.exports = usersRoutes
```

- [ ] **Step 2: Crear src/app.js**

```js
'use strict'
const fastify = require('fastify')

function buildApp(opts = {}) {
    const app = fastify({ logger: opts.logger ?? true })

    app.register(require('@fastify/jwt'), {
        secret: process.env.JWT_SECRET || 'dev_secret',
    })

    app.register(require('./routes/auth.routes'))
    app.register(require('./routes/users.routes'), { prefix: '/users' })

    return app
}

module.exports = buildApp
```

---

### Task 5: Rutas de auth + tests

**Files:**
- Create: `backend/user-service/test/auth.test.js`
- Create: `backend/user-service/src/routes/auth.routes.js`

- [ ] **Step 1: Escribir tests fallidos**

Crear `backend/user-service/test/auth.test.js`:
```js
'use strict'
require('dotenv').config()
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const buildApp = require('../src/app')
const supabase = require('../src/db')
const redis = require('../src/redis')

const TEST_EMAIL = `auth-test-${Date.now()}@test.com`
const TEST_PASS  = 'Test@12345'
let app

before(async () => {
    app = buildApp({ logger: false })
    await app.ready()

    // Insertar usuario de prueba directamente en Supabase
    const bcrypt = require('bcryptjs')
    const hash = await bcrypt.hash(TEST_PASS, 10)
    await supabase.from('usuarios').insert({
        usuario:      `testauth${Date.now()}`,
        email:        TEST_EMAIL,
        password_hash: hash,
        full_name:    'Test Auth User',
        activo:       true,
    })
})

after(async () => {
    // Limpiar usuario de prueba
    await supabase.from('usuarios').delete().eq('email', TEST_EMAIL)
    await app.close()
    await redis.quit()
})

test('POST /auth/login - credenciales válidas retorna token', async () => {
    const res = await app.inject({
        method: 'POST',
        url: '/auth/login',
        payload: { email: TEST_EMAIL, password: TEST_PASS },
    })
    assert.equal(res.statusCode, 200)
    const body = JSON.parse(res.body)
    assert.equal(body.success, true)
    assert.ok(body.data.token, 'debe incluir token')
    assert.equal(body.data.user.email, TEST_EMAIL)
    assert.ok(Array.isArray(body.data.user.permissions))
})

test('POST /auth/login - password incorrecto retorna 401', async () => {
    const res = await app.inject({
        method: 'POST',
        url: '/auth/login',
        payload: { email: TEST_EMAIL, password: 'wrong' },
    })
    assert.equal(res.statusCode, 401)
    const body = JSON.parse(res.body)
    assert.equal(body.success, false)
})

test('POST /auth/login - email inexistente retorna 401', async () => {
    const res = await app.inject({
        method: 'POST',
        url: '/auth/login',
        payload: { email: 'noexiste@test.com', password: TEST_PASS },
    })
    assert.equal(res.statusCode, 401)
})

test('POST /auth/register - usuario nuevo creado correctamente', async () => {
    const res = await app.inject({
        method: 'POST',
        url: '/auth/register',
        payload: {
            usuario:   `newuser${Date.now()}`,
            email:     `new-${Date.now()}@test.com`,
            password:  'New@12345',
            full_name: 'Nuevo Usuario',
        },
    })
    assert.equal(res.statusCode, 201)
    const body = JSON.parse(res.body)
    assert.equal(body.success, true)
    assert.ok(body.data.id)
    // Limpiar
    await supabase.from('usuarios').delete().eq('id', body.data.id)
})

test('POST /auth/register - email duplicado retorna 409', async () => {
    const res = await app.inject({
        method: 'POST',
        url: '/auth/register',
        payload: {
            usuario:   `dup${Date.now()}`,
            email:     TEST_EMAIL,
            password:  'Dup@12345',
            full_name: 'Duplicado',
        },
    })
    assert.equal(res.statusCode, 409)
    const body = JSON.parse(res.body)
    assert.equal(body.success, false)
})

test('POST /auth/logout - invalida el token', async () => {
    // Primero login
    const loginRes = await app.inject({
        method: 'POST',
        url: '/auth/login',
        payload: { email: TEST_EMAIL, password: TEST_PASS },
    })
    const { token } = JSON.parse(loginRes.body).data

    // Logout
    const logoutRes = await app.inject({
        method: 'POST',
        url: '/auth/logout',
        headers: { authorization: `Bearer ${token}` },
    })
    assert.equal(logoutRes.statusCode, 200)

    // Verificar que el token ya no está en Redis
    const stored = await redis.get(`jwt:${token}`)
    assert.equal(stored, null)
})
```

- [ ] **Step 2: Ejecutar tests — verificar que fallan**

```bash
cd C:/Users/dg660/Documents/Clases/pagina/backend/user-service
npm test
```

Salida esperada: `Error: Cannot find module '../src/routes/auth.routes'`

- [ ] **Step 3: Crear src/routes/auth.routes.js**

```js
'use strict'
const bcrypt = require('bcryptjs')
const supabase = require('../db')
const redis = require('../redis')
const { ok, fail } = require('../../shared/response')
const { loginBody, registerBody, tokenResponse } = require('../../shared/schemas/auth.schemas')

async function authRoutes(fastify) {
    // POST /auth/login
    fastify.post('/auth/login', {
        schema: { body: loginBody, response: { 200: tokenResponse } },
    }, async (request, reply) => {
        const { email, password } = request.body

        // Buscar usuario
        const { data: usuario, error } = await supabase
            .from('usuarios')
            .select('id, email, full_name, password_hash, activo')
            .eq('email', email)
            .single()

        if (error || !usuario) {
            return reply.code(401).send(fail('Credenciales inválidas'))
        }

        if (!usuario.activo) {
            return reply.code(401).send(fail('Usuario inactivo'))
        }

        const valid = await bcrypt.compare(password, usuario.password_hash)
        if (!valid) {
            return reply.code(401).send(fail('Credenciales inválidas'))
        }

        // Obtener permisos
        const { data: permisoRows } = await supabase
            .from('usuario_permisos')
            .select('permisos(clave)')
            .eq('usuario_id', usuario.id)

        const permissions = (permisoRows || []).map((r) => r.permisos.clave)

        // Generar JWT
        const token = fastify.jwt.sign(
            { userId: usuario.id, email: usuario.email, permissions },
            { expiresIn: '24h' }
        )

        // Guardar en Redis con TTL 24h
        await redis.set(`jwt:${token}`, JSON.stringify({ userId: usuario.id, email: usuario.email, permissions }), 'EX', 86400)

        return reply.code(200).send(ok({
            token,
            user: { id: usuario.id, email: usuario.email, full_name: usuario.full_name, permissions },
        }))
    })

    // POST /auth/register
    fastify.post('/auth/register', {
        schema: { body: registerBody },
    }, async (request, reply) => {
        const { usuario, email, password, full_name, address, phone, birth_date } = request.body

        // Verificar duplicado
        const { data: exists } = await supabase
            .from('usuarios')
            .select('id')
            .or(`email.eq.${email},usuario.eq.${usuario}`)
            .limit(1)
            .single()

        if (exists) {
            return reply.code(409).send(fail('Email o usuario ya registrado'))
        }

        const password_hash = await bcrypt.hash(password, 10)
        const { data: newUser, error } = await supabase
            .from('usuarios')
            .insert({ usuario, email, password_hash, full_name, address, phone, birth_date, activo: true })
            .select('id')
            .single()

        if (error) {
            return reply.code(500).send(fail('Error al crear usuario'))
        }

        // Permisos por defecto: group:view, ticket:view
        const { data: defaultPerms } = await supabase
            .from('permisos')
            .select('id')
            .in('clave', ['group:view', 'ticket:view'])

        if (defaultPerms && defaultPerms.length > 0) {
            await supabase.from('usuario_permisos').insert(
                defaultPerms.map((p) => ({ usuario_id: newUser.id, permiso_id: p.id }))
            )
        }

        return reply.code(201).send(ok({ id: newUser.id }, 'Usuario creado exitosamente'))
    })

    // POST /auth/logout
    fastify.post('/auth/logout', async (request, reply) => {
        try {
            await request.jwtVerify()
        } catch {
            return reply.code(401).send(fail('Token inválido o ausente'))
        }

        const token = request.headers.authorization?.replace('Bearer ', '')
        if (token) {
            await redis.del(`jwt:${token}`)
        }

        return reply.code(200).send(ok(null, 'Sesión cerrada'))
    })
}

module.exports = authRoutes
```

- [ ] **Step 4: Ejecutar tests — deben pasar**

```bash
cd C:/Users/dg660/Documents/Clases/pagina/backend/user-service
npm test
```

Salida esperada:
```
✔ POST /auth/login - credenciales válidas retorna token
✔ POST /auth/login - password incorrecto retorna 401
✔ POST /auth/login - email inexistente retorna 401
✔ POST /auth/register - usuario nuevo creado correctamente
✔ POST /auth/register - email duplicado retorna 409
✔ POST /auth/logout - invalida el token
ℹ tests 6, pass 6
```

---

### Task 6: Rutas de usuarios + tests

**Files:**
- Create: `backend/user-service/test/users.test.js`
- Modify: `backend/user-service/src/routes/users.routes.js`

- [ ] **Step 1: Escribir tests fallidos**

Crear `backend/user-service/test/users.test.js`:
```js
'use strict'
require('dotenv').config()
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const buildApp = require('../src/app')
const supabase = require('../src/db')
const redis = require('../src/redis')

let app
let adminToken
let testUserId

before(async () => {
    app = buildApp({ logger: false })
    await app.ready()

    // Login con admin del seed
    const res = await app.inject({
        method: 'POST',
        url: '/auth/login',
        payload: { email: 'admin@miapp.com', password: 'Admin@12345' },
    })
    adminToken = JSON.parse(res.body).data.token

    // Crear usuario de prueba para operaciones CRUD
    const bcrypt = require('bcryptjs')
    const hash = await bcrypt.hash('Crud@12345', 10)
    const { data } = await supabase
        .from('usuarios')
        .insert({
            usuario:       `crud${Date.now()}`,
            email:         `crud-${Date.now()}@test.com`,
            password_hash:  hash,
            full_name:     'CRUD Test User',
            activo:        true,
        })
        .select('id')
        .single()
    testUserId = data.id
})

after(async () => {
    await supabase.from('usuario_permisos').delete().eq('usuario_id', testUserId)
    await supabase.from('usuarios').delete().eq('id', testUserId)
    await app.close()
    await redis.quit()
})

test('GET /users - lista todos los usuarios (requiere users:view)', async () => {
    const res = await app.inject({
        method: 'GET',
        url: '/users',
        headers: { authorization: `Bearer ${adminToken}` },
    })
    assert.equal(res.statusCode, 200)
    const body = JSON.parse(res.body)
    assert.equal(body.success, true)
    assert.ok(Array.isArray(body.data))
    assert.ok(body.data.length >= 1)
})

test('GET /users - sin token retorna 401', async () => {
    const res = await app.inject({ method: 'GET', url: '/users' })
    assert.equal(res.statusCode, 401)
})

test('GET /users/:id - retorna usuario por id', async () => {
    const res = await app.inject({
        method: 'GET',
        url: `/users/${testUserId}`,
        headers: { authorization: `Bearer ${adminToken}` },
    })
    assert.equal(res.statusCode, 200)
    const body = JSON.parse(res.body)
    assert.equal(body.success, true)
    assert.equal(body.data.id, testUserId)
    assert.ok(!body.data.password_hash, 'no debe exponer el hash')
})

test('PUT /users/:id - actualiza full_name', async () => {
    const res = await app.inject({
        method: 'PUT',
        url: `/users/${testUserId}`,
        headers: { authorization: `Bearer ${adminToken}` },
        payload: { full_name: 'CRUD Updated' },
    })
    assert.equal(res.statusCode, 200)
    const body = JSON.parse(res.body)
    assert.equal(body.data.full_name, 'CRUD Updated')
})

test('GET /users/:id/permissions - lista permisos del usuario', async () => {
    const res = await app.inject({
        method: 'GET',
        url: `/users/${testUserId}/permissions`,
        headers: { authorization: `Bearer ${adminToken}` },
    })
    assert.equal(res.statusCode, 200)
    const body = JSON.parse(res.body)
    assert.ok(Array.isArray(body.data))
})

test('PUT /users/:id/permissions - asigna permisos', async () => {
    const res = await app.inject({
        method: 'PUT',
        url: `/users/${testUserId}/permissions`,
        headers: { authorization: `Bearer ${adminToken}` },
        payload: { permissions: ['group:view', 'ticket:view'] },
    })
    assert.equal(res.statusCode, 200)
    const body = JSON.parse(res.body)
    assert.ok(body.data.permissions.includes('group:view'))
    assert.ok(body.data.permissions.includes('ticket:view'))
})

test('DELETE /users/:id - elimina usuario', async () => {
    // Crear usuario temporal para eliminar
    const bcrypt = require('bcryptjs')
    const hash = await bcrypt.hash('Del@12345', 10)
    const { data } = await supabase
        .from('usuarios')
        .insert({ usuario: `del${Date.now()}`, email: `del-${Date.now()}@test.com`, password_hash: hash, full_name: 'Del User', activo: true })
        .select('id')
        .single()

    const res = await app.inject({
        method: 'DELETE',
        url: `/users/${data.id}`,
        headers: { authorization: `Bearer ${adminToken}` },
    })
    assert.equal(res.statusCode, 200)
    const body = JSON.parse(res.body)
    assert.equal(body.success, true)
})
```

- [ ] **Step 2: Ejecutar tests — verificar que fallan**

```bash
cd C:/Users/dg660/Documents/Clases/pagina/backend/user-service
npm test
```

Salida esperada: los 7 tests de users fallan con 404.

- [ ] **Step 3: Implementar src/routes/users.routes.js**

```js
'use strict'
const supabase = require('../db')
const { ok, fail } = require('../../shared/response')
const { updateUserBody, permissionsBody } = require('../../shared/schemas/user.schemas')

async function usersRoutes(fastify) {
    // Verificar JWT en todas las rutas de este plugin
    fastify.addHook('onRequest', async (request, reply) => {
        try {
            await request.jwtVerify()
        } catch {
            return reply.code(401).send(fail('Token inválido o ausente'))
        }
    })

    // GET /users — lista todos (requiere users:view)
    fastify.get('/', async (request, reply) => {
        if (!request.user.permissions.includes('users:view')) {
            return reply.code(403).send(fail('Sin permiso'))
        }
        const { data, error } = await supabase
            .from('usuarios')
            .select('id, usuario, email, full_name, address, phone, birth_date, activo, created_at')
        if (error) return reply.code(500).send(fail('Error al obtener usuarios'))
        return reply.code(200).send(ok(data))
    })

    // GET /users/:id
    fastify.get('/:id', async (request, reply) => {
        const { data, error } = await supabase
            .from('usuarios')
            .select('id, usuario, email, full_name, address, phone, birth_date, activo, created_at')
            .eq('id', request.params.id)
            .single()
        if (error || !data) return reply.code(404).send(fail('Usuario no encontrado'))
        return reply.code(200).send(ok(data))
    })

    // PUT /users/:id
    fastify.put('/:id', {
        schema: { body: updateUserBody },
    }, async (request, reply) => {
        if (!request.user.permissions.includes('user:edit') && request.user.userId !== request.params.id) {
            return reply.code(403).send(fail('Sin permiso'))
        }
        const { full_name, address, phone, birth_date, activo } = request.body
        const { data, error } = await supabase
            .from('usuarios')
            .update({ full_name, address, phone, birth_date, activo })
            .eq('id', request.params.id)
            .select('id, usuario, email, full_name, address, phone, birth_date, activo, created_at')
            .single()
        if (error || !data) return reply.code(404).send(fail('Usuario no encontrado'))
        return reply.code(200).send(ok(data))
    })

    // DELETE /users/:id (requiere user:delete)
    fastify.delete('/:id', async (request, reply) => {
        if (!request.user.permissions.includes('user:delete')) {
            return reply.code(403).send(fail('Sin permiso'))
        }
        const { error } = await supabase
            .from('usuarios')
            .delete()
            .eq('id', request.params.id)
        if (error) return reply.code(500).send(fail('Error al eliminar usuario'))
        return reply.code(200).send(ok(null, 'Usuario eliminado'))
    })

    // GET /users/:id/permissions
    fastify.get('/:id/permissions', async (request, reply) => {
        const { data, error } = await supabase
            .from('usuario_permisos')
            .select('permisos(clave)')
            .eq('usuario_id', request.params.id)
        if (error) return reply.code(500).send(fail('Error al obtener permisos'))
        const permissions = (data || []).map((r) => r.permisos.clave)
        return reply.code(200).send(ok(permissions))
    })

    // PUT /users/:id/permissions (requiere user:edit)
    fastify.put('/:id/permissions', {
        schema: { body: permissionsBody },
    }, async (request, reply) => {
        if (!request.user.permissions.includes('user:edit')) {
            return reply.code(403).send(fail('Sin permiso'))
        }
        const { permissions } = request.body

        // Obtener IDs de los permisos solicitados
        const { data: permisoRows, error: permError } = await supabase
            .from('permisos')
            .select('id, clave')
            .in('clave', permissions)
        if (permError) return reply.code(500).send(fail('Error al obtener permisos'))

        // Reemplazar todos los permisos del usuario
        await supabase.from('usuario_permisos').delete().eq('usuario_id', request.params.id)

        if (permisoRows && permisoRows.length > 0) {
            await supabase.from('usuario_permisos').insert(
                permisoRows.map((p) => ({ usuario_id: request.params.id, permiso_id: p.id }))
            )
        }

        return reply.code(200).send(ok({ permissions: (permisoRows || []).map((p) => p.clave) }))
    })
}

module.exports = usersRoutes
```

- [ ] **Step 4: Ejecutar todos los tests — deben pasar**

```bash
cd C:/Users/dg660/Documents/Clases/pagina/backend/user-service
npm test
```

Salida esperada:
```
✔ POST /auth/login - credenciales válidas retorna token
✔ POST /auth/login - password incorrecto retorna 401
✔ POST /auth/login - email inexistente retorna 401
✔ POST /auth/register - usuario nuevo creado correctamente
✔ POST /auth/register - email duplicado retorna 409
✔ POST /auth/logout - invalida el token
✔ GET /users - lista todos los usuarios
✔ GET /users - sin token retorna 401
✔ GET /users/:id - retorna usuario por id
✔ PUT /users/:id - actualiza full_name
✔ GET /users/:id/permissions - lista permisos del usuario
✔ PUT /users/:id/permissions - asigna permisos
✔ DELETE /users/:id - elimina usuario
ℹ tests 13, pass 13
```

---

### Task 7: Verificar servidor corriendo

- [ ] **Step 1: Asegurarse de que Redis está corriendo**

```bash
docker ps | grep redis
# o
docker start redis-erp
```

- [ ] **Step 2: Arrancar el servidor**

```bash
cd C:/Users/dg660/Documents/Clases/pagina/backend/user-service
npm start
```

Salida esperada:
```
User Service corriendo en http://localhost:3001
```

- [ ] **Step 3: Probar login con curl**

```bash
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"admin@miapp.com\",\"password\":\"Admin@12345\"}"
```

Salida esperada: JSON con `success: true`, `data.token` y `data.user.permissions` con 14 permisos.

---

## Siguiente paso

Con User Service funcionando, continuar con **Plan 3 — API Gateway** que proxy todas las rutas al servicio correspondiente y valida JWT contra Redis.
