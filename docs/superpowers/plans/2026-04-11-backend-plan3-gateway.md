# Backend Plan 3 — API Gateway

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Crear el API Gateway en Fastify (puerto 3000) que valida JWT y enruta todas las peticiones de Angular a los microservicios correspondientes.

**Architecture:** Fastify en puerto 3000 con @fastify/http-proxy. Un hook `onRequest` global valida el JWT para rutas protegidas (todas excepto /auth/login y /auth/register). Si el JWT es válido, el proxy reenvía la request completa (incluyendo el header Authorization) al servicio destino, que también valida el JWT por su cuenta — sin Redis, sin estado.

**Tech Stack:** Node.js, Fastify, @fastify/http-proxy, @fastify/jwt, dotenv

---

## Estructura de archivos

```
backend/gateway/
├── .env.example
├── .env
├── package.json
├── index.js
└── src/
    └── app.js
```

---

### Task 1: Inicializar proyecto

**Files:**
- Create: `backend/gateway/package.json`
- Create: `backend/gateway/.env.example`
- Create: `backend/gateway/.env`
- Create: `backend/gateway/index.js`

- [ ] **Step 1: Crear `package.json`**

```json
{
  "name": "gateway",
  "version": "1.0.0",
  "main": "index.js",
  "scripts": {
    "start": "node index.js"
  }
}
```

- [ ] **Step 2: Instalar dependencias**

```bash
cd C:/Users/dg660/Documents/Clases/pagina/backend/gateway
npm install fastify @fastify/http-proxy @fastify/jwt dotenv
```

- [ ] **Step 3: Crear `.env.example`**

```
PORT=3000
JWT_SECRET=dev_secret_erp_dgm_2026
USER_SERVICE_URL=http://localhost:3001
GROUP_SERVICE_URL=http://localhost:3002
TICKET_SERVICE_URL=http://localhost:3003
```

- [ ] **Step 4: Crear `.env`** con los mismos valores (desarrollo local)

```
PORT=3000
JWT_SECRET=dev_secret_erp_dgm_2026
USER_SERVICE_URL=http://localhost:3001
GROUP_SERVICE_URL=http://localhost:3002
TICKET_SERVICE_URL=http://localhost:3003
```

- [ ] **Step 5: Crear `index.js`**

```js
'use strict'
require('dotenv').config()
const buildApp = require('./src/app')

const start = async () => {
    const app = buildApp()
    await app.listen({ port: Number(process.env.PORT) || 3000, host: '0.0.0.0' })
    console.log(`API Gateway corriendo en http://localhost:${process.env.PORT || 3000}`)
}

start().catch((err) => {
    console.error(err)
    process.exit(1)
})
```

---

### Task 2: App Gateway

**Files:**
- Create: `backend/gateway/src/app.js`

- [ ] **Step 1: Crear `src/app.js`**

```js
'use strict'
const fastify = require('fastify')
const httpProxy = require('@fastify/http-proxy')

const PUBLIC_ROUTES = [
    { method: 'POST', url: '/auth/login' },
    { method: 'POST', url: '/auth/register' },
]

function buildApp(opts = {}) {
    const app = fastify({ logger: opts.logger ?? true })

    // Registrar JWT con el mismo secret que los servicios
    app.register(require('@fastify/jwt'), {
        secret: process.env.JWT_SECRET || 'dev_secret',
    })

    // Hook global: valida JWT en todas las rutas excepto las públicas
    app.addHook('onRequest', async (request, reply) => {
        const isPublic = PUBLIC_ROUTES.some(
            (r) => r.method === request.method && r.url === request.url
        )
        if (isPublic) return

        try {
            await request.jwtVerify()
        } catch {
            return reply.code(401).send({ success: false, data: null, error: 'Token inválido o ausente' })
        }
    })

    const userUrl   = process.env.USER_SERVICE_URL   || 'http://localhost:3001'
    const groupUrl  = process.env.GROUP_SERVICE_URL  || 'http://localhost:3002'
    const ticketUrl = process.env.TICKET_SERVICE_URL || 'http://localhost:3003'

    // Rutas de auth → user-service
    app.register(httpProxy, {
        upstream: userUrl,
        prefix: '/auth',
        rewritePrefix: '/auth',
    })

    // Rutas de usuarios → user-service
    app.register(httpProxy, {
        upstream: userUrl,
        prefix: '/users',
        rewritePrefix: '/users',
    })

    // Rutas de grupos → group-service
    app.register(httpProxy, {
        upstream: groupUrl,
        prefix: '/groups',
        rewritePrefix: '/groups',
    })

    // Rutas de tickets → ticket-service
    app.register(httpProxy, {
        upstream: ticketUrl,
        prefix: '/tickets',
        rewritePrefix: '/tickets',
    })

    return app
}

module.exports = buildApp
```

---

### Task 3: Verificar Gateway

- [ ] **Step 1: Arrancar user-service (terminal 1)**

```bash
cd C:/Users/dg660/Documents/Clases/pagina/backend/user-service
npm start
```

- [ ] **Step 2: Arrancar gateway (terminal 2)**

```bash
cd C:/Users/dg660/Documents/Clases/pagina/backend/gateway
npm start
```

Salida esperada:
```
API Gateway corriendo en http://localhost:3000
```

- [ ] **Step 3: Probar login a través del gateway**

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"admin@miapp.com\",\"password\":\"Admin@12345\"}"
```

Salida esperada: `{ "success": true, "data": { "token": "...", "user": {...} } }`

- [ ] **Step 4: Probar ruta protegida sin token**

```bash
curl http://localhost:3000/users
```

Salida esperada: `{ "success": false, "data": null, "error": "Token inválido o ausente" }`

- [ ] **Step 5: Probar ruta protegida con token**

```bash
# Guarda el token del Step 3 y úsalo aquí
curl http://localhost:3000/users \
  -H "Authorization: Bearer TU_TOKEN_AQUI"
```

Salida esperada: `{ "success": true, "data": [...] }`

---

## Siguiente paso

Con Gateway + User Service funcionando, continuar con **Plan 4 — Group Service** (puerto 3002).
