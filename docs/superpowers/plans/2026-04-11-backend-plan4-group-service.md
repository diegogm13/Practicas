# Backend Plan 4 — Group Service

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Crear el microservicio de grupos en Fastify (puerto 3002) que maneja CRUD de grupos y miembros conectado a Supabase.

**Architecture:** Fastify en puerto 3002. El JWT llega en el header Authorization (reenviado por el gateway). El servicio verifica el JWT con @fastify/jwt y comprueba los permisos del payload antes de ejecutar cada operación sobre las tablas `grupos` y `grupo_miembros` de Supabase.

**Tech Stack:** Node.js, Fastify, @fastify/jwt, @supabase/supabase-js, dotenv, node:test

---

## Estructura de archivos

```
backend/group-service/
├── .env.example
├── .env
├── package.json
├── index.js
└── src/
│   ├── app.js
│   ├── db.js
│   └── routes/
│       └── groups.routes.js
└── test/
    └── groups.test.js
```

---

### Task 1: Inicializar proyecto

- [ ] **Step 1: Crear `package.json`**

```json
{
  "name": "group-service",
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
cd C:/Users/dg660/Documents/Clases/pagina/backend/group-service
npm install fastify @fastify/jwt @supabase/supabase-js dotenv
```

- [ ] **Step 3: Crear `.env.example`**

```
PORT=3002
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
JWT_SECRET=dev_secret_erp_dgm_2026
```

- [ ] **Step 4: Crear `.env`** con credenciales reales (mismas de user-service)

```
PORT=3002
SUPABASE_URL=https://wurmjjhbbakitkckcdqv.supabase.co
SUPABASE_ANON_KEY=sb_publishable_6hXSOVPMiGv0cjn0KCC5Fw_Pl73qwnb
JWT_SECRET=dev_secret_erp_dgm_2026
```

- [ ] **Step 5: Crear `index.js`**

```js
'use strict'
require('dotenv').config()
const buildApp = require('./src/app')

const start = async () => {
    const app = buildApp()
    await app.listen({ port: Number(process.env.PORT) || 3002, host: '0.0.0.0' })
    console.log(`Group Service corriendo en http://localhost:${process.env.PORT || 3002}`)
}

start().catch((err) => {
    console.error(err)
    process.exit(1)
})
```

---

### Task 2: Supabase client + app skeleton

- [ ] **Step 1: Crear `src/db.js`**

```js
'use strict'
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
)

module.exports = supabase
```

- [ ] **Step 2: Crear `src/app.js`**

```js
'use strict'
const fastify = require('fastify')

function buildApp(opts = {}) {
    const app = fastify({ logger: opts.logger ?? true })

    app.register(require('@fastify/jwt'), {
        secret: process.env.JWT_SECRET || 'dev_secret',
    })

    app.register(require('./routes/groups.routes'), { prefix: '/groups' })

    return app
}

module.exports = buildApp
```

---

### Task 3: Rutas de grupos + tests

- [ ] **Step 1: Escribir tests fallidos**

Crear `test/groups.test.js`:

```js
'use strict'
require('dotenv').config()
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const buildApp = require('../src/app')
const supabase = require('../src/db')

let app
let adminToken
let testGroupId

// Obtiene token de admin haciendo login directo contra Supabase + jwt.sign
before(async () => {
    app = buildApp({ logger: false })
    await app.ready()

    // Generar token de admin manualmente con el mismo secret
    const bcrypt = require('bcryptjs')
    const { data: usuario } = await supabase
        .from('usuarios')
        .select('id, email')
        .eq('email', 'admin@miapp.com')
        .single()

    const { data: permisoRows } = await supabase
        .from('usuario_permisos')
        .select('permisos(clave)')
        .eq('usuario_id', usuario.id)

    const permissions = permisoRows.map((r) => r.permisos.clave)
    adminToken = app.jwt.sign({ userId: usuario.id, email: usuario.email, permissions }, { expiresIn: '1h' })
})

after(async () => {
    if (testGroupId) {
        await supabase.from('grupo_miembros').delete().eq('grupo_id', testGroupId)
        await supabase.from('grupos').delete().eq('id', testGroupId)
    }
    await app.close()
})

test('GET /groups - lista grupos del usuario', async () => {
    const res = await app.inject({
        method: 'GET',
        url: '/groups',
        headers: { authorization: `Bearer ${adminToken}` },
    })
    assert.equal(res.statusCode, 200)
    const body = JSON.parse(res.body)
    assert.equal(body.success, true)
    assert.ok(Array.isArray(body.data))
    assert.ok(body.data.length >= 1)
})

test('GET /groups - sin token retorna 401', async () => {
    const res = await app.inject({ method: 'GET', url: '/groups' })
    assert.equal(res.statusCode, 401)
})

test('POST /groups - crea grupo nuevo', async () => {
    const res = await app.inject({
        method: 'POST',
        url: '/groups',
        headers: { authorization: `Bearer ${adminToken}` },
        payload: { nombre: `Grupo Test ${Date.now()}`, categoria: 'Tecnología', nivel: 'Básico' },
    })
    assert.equal(res.statusCode, 201)
    const body = JSON.parse(res.body)
    assert.equal(body.success, true)
    assert.ok(body.data.id)
    testGroupId = body.data.id
})

test('PUT /groups/:id - edita grupo', async () => {
    const res = await app.inject({
        method: 'PUT',
        url: `/groups/${testGroupId}`,
        headers: { authorization: `Bearer ${adminToken}` },
        payload: { nombre: 'Grupo Editado', categoria: 'Marketing', nivel: 'Avanzado' },
    })
    assert.equal(res.statusCode, 200)
    const body = JSON.parse(res.body)
    assert.equal(body.data.nombre, 'Grupo Editado')
})

test('GET /groups/:id/members - lista miembros', async () => {
    const res = await app.inject({
        method: 'GET',
        url: `/groups/${testGroupId}/members`,
        headers: { authorization: `Bearer ${adminToken}` },
    })
    assert.equal(res.statusCode, 200)
    const body = JSON.parse(res.body)
    assert.ok(Array.isArray(body.data))
})

test('POST /groups/:id/members - añade miembro', async () => {
    const { data: usuario } = await supabase
        .from('usuarios')
        .select('id')
        .eq('email', 'usuario@miapp.com')
        .single()

    const res = await app.inject({
        method: 'POST',
        url: `/groups/${testGroupId}/members`,
        headers: { authorization: `Bearer ${adminToken}` },
        payload: { usuario_id: usuario.id },
    })
    assert.equal(res.statusCode, 201)
    const body = JSON.parse(res.body)
    assert.equal(body.success, true)
})

test('DELETE /groups/:id/members/:userId - quita miembro', async () => {
    const { data: usuario } = await supabase
        .from('usuarios')
        .select('id')
        .eq('email', 'usuario@miapp.com')
        .single()

    const res = await app.inject({
        method: 'DELETE',
        url: `/groups/${testGroupId}/members/${usuario.id}`,
        headers: { authorization: `Bearer ${adminToken}` },
    })
    assert.equal(res.statusCode, 200)
    assert.equal(JSON.parse(res.body).success, true)
})

test('DELETE /groups/:id - elimina grupo', async () => {
    const res = await app.inject({
        method: 'DELETE',
        url: `/groups/${testGroupId}`,
        headers: { authorization: `Bearer ${adminToken}` },
    })
    assert.equal(res.statusCode, 200)
    assert.equal(JSON.parse(res.body).success, true)
    testGroupId = null
})
```

- [ ] **Step 2: Crear `src/routes/groups.routes.js`**

```js
'use strict'
const supabase = require('../db')
const { ok, fail } = require('../../shared/response')
const { createGroupBody, memberBody } = require('../../shared/schemas/group.schemas')

async function groupsRoutes(fastify) {
    // Verificar JWT en todas las rutas
    fastify.addHook('onRequest', async (request, reply) => {
        try {
            await request.jwtVerify()
        } catch {
            return reply.code(401).send(fail('Token inválido o ausente'))
        }
    })

    // GET /groups — grupos del usuario actual
    fastify.get('/', async (request, reply) => {
        if (!request.user.permissions.includes('group:view')) {
            return reply.code(403).send(fail('Sin permiso'))
        }

        // Admin ve todos los grupos, otros solo los suyos
        let query = supabase
            .from('grupos')
            .select('id, nombre, categoria, nivel, autor_id, created_at')

        if (!request.user.permissions.includes('users:view')) {
            // Filtrar por grupos donde el usuario es miembro
            const { data: membresias } = await supabase
                .from('grupo_miembros')
                .select('grupo_id')
                .eq('usuario_id', request.user.userId)

            const grupoIds = (membresias || []).map((m) => m.grupo_id)
            if (grupoIds.length === 0) return reply.code(200).send(ok([]))
            query = query.in('id', grupoIds)
        }

        const { data, error } = await query
        if (error) return reply.code(500).send(fail('Error al obtener grupos'))
        return reply.code(200).send(ok(data))
    })

    // POST /groups — crear grupo
    fastify.post('/', {
        schema: { body: createGroupBody },
    }, async (request, reply) => {
        if (!request.user.permissions.includes('group:add')) {
            return reply.code(403).send(fail('Sin permiso'))
        }
        const { nombre, categoria, nivel } = request.body
        const { data, error } = await supabase
            .from('grupos')
            .insert({ nombre, categoria, nivel, autor_id: request.user.userId })
            .select('id, nombre, categoria, nivel, autor_id, created_at')
            .single()

        if (error) return reply.code(500).send(fail('Error al crear grupo'))
        return reply.code(201).send(ok(data, 'Grupo creado exitosamente'))
    })

    // PUT /groups/:id — editar grupo
    fastify.put('/:id', {
        schema: { body: createGroupBody },
    }, async (request, reply) => {
        if (!request.user.permissions.includes('group:edit')) {
            return reply.code(403).send(fail('Sin permiso'))
        }
        const { nombre, categoria, nivel } = request.body
        const { data, error } = await supabase
            .from('grupos')
            .update({ nombre, categoria, nivel })
            .eq('id', request.params.id)
            .select('id, nombre, categoria, nivel, autor_id, created_at')
            .single()

        if (error || !data) return reply.code(404).send(fail('Grupo no encontrado'))
        return reply.code(200).send(ok(data))
    })

    // DELETE /groups/:id — eliminar grupo
    fastify.delete('/:id', async (request, reply) => {
        if (!request.user.permissions.includes('group:delete')) {
            return reply.code(403).send(fail('Sin permiso'))
        }
        const { error } = await supabase
            .from('grupos')
            .delete()
            .eq('id', request.params.id)

        if (error) return reply.code(500).send(fail('Error al eliminar grupo'))
        return reply.code(200).send(ok(null, 'Grupo eliminado'))
    })

    // GET /groups/:id/members
    fastify.get('/:id/members', async (request, reply) => {
        if (!request.user.permissions.includes('group:view')) {
            return reply.code(403).send(fail('Sin permiso'))
        }
        const { data, error } = await supabase
            .from('grupo_miembros')
            .select('id, usuario_id, usuarios(email, full_name)')
            .eq('grupo_id', request.params.id)

        if (error) return reply.code(500).send(fail('Error al obtener miembros'))
        return reply.code(200).send(ok(data))
    })

    // POST /groups/:id/members — añadir miembro
    fastify.post('/:id/members', {
        schema: { body: memberBody },
    }, async (request, reply) => {
        if (!request.user.permissions.includes('group:edit')) {
            return reply.code(403).send(fail('Sin permiso'))
        }
        const { usuario_id } = request.body
        const { data, error } = await supabase
            .from('grupo_miembros')
            .insert({ grupo_id: Number(request.params.id), usuario_id })
            .select('id, grupo_id, usuario_id')
            .single()

        if (error) return reply.code(409).send(fail('El usuario ya es miembro o no existe'))
        return reply.code(201).send(ok(data, 'Miembro añadido'))
    })

    // DELETE /groups/:id/members/:userId — quitar miembro
    fastify.delete('/:id/members/:userId', async (request, reply) => {
        if (!request.user.permissions.includes('group:edit')) {
            return reply.code(403).send(fail('Sin permiso'))
        }
        const { error } = await supabase
            .from('grupo_miembros')
            .delete()
            .eq('grupo_id', request.params.id)
            .eq('usuario_id', request.params.userId)

        if (error) return reply.code(500).send(fail('Error al quitar miembro'))
        return reply.code(200).send(ok(null, 'Miembro eliminado'))
    })
}

module.exports = groupsRoutes
```
