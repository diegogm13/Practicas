# Backend Plan 1 — User Service

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Crear el servicio Node.js/Fastify que maneja autenticación, usuarios y permisos conectado a MongoDB.

**Architecture:** Fastify en puerto 3001, Mongoose para MongoDB (`erp_users`), bcryptjs para passwords, @fastify/jwt para generar tokens JWT que el Gateway validará después. El servicio expone rutas de auth y CRUD de usuarios/permisos.

**Tech Stack:** Node.js, Fastify, Mongoose, bcryptjs, @fastify/jwt, dotenv, node:test (tests built-in)

---

## Estructura de archivos

```
backend/user-service/
├── .env                          ← variables de entorno (no commitear)
├── .env.example                  ← plantilla pública
├── package.json
├── index.js                      ← entry point (arranca servidor)
├── src/
│   ├── app.js                    ← instancia Fastify + plugins + rutas
│   ├── db.js                     ← conexión Mongoose
│   ├── seed.js                   ← script seed (ejecutar una sola vez)
│   ├── models/
│   │   ├── usuario.model.js      ← colección 'usuarios'
│   │   └── permiso.model.js      ← colecciones 'permisos' y 'usuariopermisos'
│   └── routes/
│       ├── auth.routes.js        ← POST /auth/login, POST /auth/register
│       └── users.routes.js       ← GET/PUT/DELETE /users, /users/:id/permissions
└── test/
    ├── auth.test.js
    └── users.test.js
```

---

### Task 1: Inicializar el proyecto

**Files:**
- Create: `backend/user-service/package.json`
- Create: `backend/user-service/.env.example`
- Create: `backend/user-service/index.js`

- [ ] **Step 1: Crear carpeta e inicializar package.json**

```bash
mkdir -p backend/user-service/src/models backend/user-service/src/routes backend/user-service/test
cd backend/user-service
npm init -y
```

- [ ] **Step 2: Instalar dependencias**

```bash
npm install fastify @fastify/jwt mongoose bcryptjs dotenv
```

- [ ] **Step 3: Crear `.env.example`**

Crear `backend/user-service/.env.example`:
```
PORT=3001
MONGODB_URI=mongodb://localhost:27017/erp_users
JWT_SECRET=cambia_esto_por_un_secreto_seguro
```

- [ ] **Step 4: Crear `.env`** (copiar y rellenar)

```bash
cp .env.example .env
```

Editar `.env` con valores reales. Para desarrollo local:
```
PORT=3001
MONGODB_URI=mongodb://localhost:27017/erp_users
JWT_SECRET=dev_secret_12345
```

- [ ] **Step 5: Crear `index.js`**

```js
require('dotenv').config()
const { connectDB } = require('./src/db')
const buildApp = require('./src/app')

const start = async () => {
    await connectDB()
    const app = buildApp()
    await app.listen({ port: Number(process.env.PORT) || 3001, host: '0.0.0.0' })
}

start().catch((err) => {
    console.error(err)
    process.exit(1)
})
```

- [ ] **Step 6: Agregar scripts a `package.json`**

Editar `backend/user-service/package.json` y reemplazar el campo `"scripts"`:
```json
"scripts": {
    "start": "node index.js",
    "test": "node --test test/*.test.js"
}
```

- [ ] **Step 7: Commit**

```bash
cd ../..
git add backend/user-service/
git commit -m "feat(user-service): initialize project structure"
```

---

### Task 2: Conexión a MongoDB y modelos

**Files:**
- Create: `backend/user-service/src/db.js`
- Create: `backend/user-service/src/models/usuario.model.js`
- Create: `backend/user-service/src/models/permiso.model.js`

- [ ] **Step 1: Crear `src/db.js`**

```js
const mongoose = require('mongoose')

async function connectDB(uri) {
    const connStr = uri || process.env.MONGODB_URI
    await mongoose.connect(connStr)
    console.log(`MongoDB conectado: ${connStr}`)
}

module.exports = { connectDB }
```

- [ ] **Step 2: Crear `src/models/usuario.model.js`**

```js
const mongoose = require('mongoose')

const usuarioSchema = new mongoose.Schema(
    {
        usuario:      { type: String, required: true, unique: true, trim: true },
        email:        { type: String, required: true, unique: true, lowercase: true, trim: true },
        passwordHash: { type: String, required: true },
        fullName:     { type: String, required: true, trim: true },
        address:      { type: String },
        phone:        { type: String },
        birthDate:    { type: Date },
    },
    { timestamps: true }
)

module.exports = mongoose.model('Usuario', usuarioSchema)
```

- [ ] **Step 3: Crear `src/models/permiso.model.js`**

```js
const mongoose = require('mongoose')

const permisoSchema = new mongoose.Schema({
    clave:       { type: String, required: true, unique: true },
    descripcion: { type: String },
})

const usuarioPermisoSchema = new mongoose.Schema({
    usuarioId: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true },
    permisoId: { type: mongoose.Schema.Types.ObjectId, ref: 'Permiso', required: true },
})
usuarioPermisoSchema.index({ usuarioId: 1, permisoId: 1 }, { unique: true })

const Permiso = mongoose.model('Permiso', permisoSchema)
const UsuarioPermiso = mongoose.model('UsuarioPermiso', usuarioPermisoSchema)

module.exports = { Permiso, UsuarioPermiso }
```

- [ ] **Step 4: Commit**

```bash
git add backend/user-service/src/
git commit -m "feat(user-service): add MongoDB connection and models"
```

---

### Task 3: Script seed

**Files:**
- Create: `backend/user-service/src/seed.js`

- [ ] **Step 1: Crear `src/seed.js`**

```js
require('dotenv').config()
const bcrypt = require('bcryptjs')
const { connectDB } = require('./db')
const Usuario = require('./models/usuario.model')
const { Permiso, UsuarioPermiso } = require('./models/permiso.model')

const PERMISOS = [
    { clave: 'group:view',        descripcion: 'Ver grupos' },
    { clave: 'group:edit',        descripcion: 'Editar grupos' },
    { clave: 'group:add',         descripcion: 'Crear grupos' },
    { clave: 'group:delete',      descripcion: 'Eliminar grupos' },
    { clave: 'ticket:view',       descripcion: 'Ver tickets' },
    { clave: 'ticket:edit',       descripcion: 'Editar tickets' },
    { clave: 'ticket:add',        descripcion: 'Crear tickets' },
    { clave: 'ticket:delete',     descripcion: 'Eliminar tickets' },
    { clave: 'ticket:edit_state', descripcion: 'Cambiar estado de tickets' },
    { clave: 'user:view',         descripcion: 'Ver perfil propio' },
    { clave: 'users:view',        descripcion: 'Ver todos los usuarios' },
    { clave: 'user:add',          descripcion: 'Crear usuarios' },
    { clave: 'user:edit',         descripcion: 'Editar usuarios' },
    { clave: 'user:delete',       descripcion: 'Eliminar usuarios' },
]

const USUARIOS = [
    { usuario: 'admin',   email: 'admin@miapp.com',   password: 'Admin@12345', fullName: 'Admin Principal',   address: 'Calle Principal 1',   phone: '555-0001', birthDate: '1990-01-01' },
    { usuario: 'usuario', email: 'usuario@miapp.com', password: 'User@12345!', fullName: 'Usuario Estándar',  address: 'Calle Secundaria 2',  phone: '555-0002', birthDate: '1995-05-15' },
    { usuario: 'test',    email: 'test@miapp.com',    password: 'Test#12345',  fullName: 'Test User',         address: 'Calle de Pruebas 3',  phone: '555-0003', birthDate: '2000-12-31' },
]

// qué permisos tiene cada usuario
const ASIGNACIONES = {
    'admin@miapp.com':   'all',
    'usuario@miapp.com': ['group:view', 'ticket:view', 'ticket:edit_state'],
    'test@miapp.com':    ['group:view', 'ticket:view'],
}

async function seed() {
    await connectDB()

    // Insertar permisos
    for (const p of PERMISOS) {
        await Permiso.updateOne({ clave: p.clave }, p, { upsert: true })
    }
    console.log('✓ Permisos insertados')

    const todosPermisos = await Permiso.find()

    // Insertar usuarios y asignar permisos
    for (const u of USUARIOS) {
        const passwordHash = await bcrypt.hash(u.password, 10)
        const usuario = await Usuario.findOneAndUpdate(
            { email: u.email },
            { usuario: u.usuario, email: u.email, passwordHash, fullName: u.fullName, address: u.address, phone: u.phone, birthDate: u.birthDate },
            { upsert: true, new: true }
        )

        const claves = ASIGNACIONES[u.email] === 'all'
            ? todosPermisos.map(p => p.clave)
            : ASIGNACIONES[u.email]

        const permisosAsignar = todosPermisos.filter(p => claves.includes(p.clave))

        for (const permiso of permisosAsignar) {
            await UsuarioPermiso.updateOne(
                { usuarioId: usuario._id, permisoId: permiso._id },
                { usuarioId: usuario._id, permisoId: permiso._id },
                { upsert: true }
            )
        }
        console.log(`✓ Usuario ${u.email} insertado con ${permisosAsignar.length} permisos`)
    }

    console.log('Seed completado.')
    process.exit(0)
}

seed().catch((err) => { console.error(err); process.exit(1) })
```

- [ ] **Step 2: Agregar script seed a `package.json`**

En `backend/user-service/package.json` actualizar `"scripts"`:
```json
"scripts": {
    "start": "node index.js",
    "seed": "node src/seed.js",
    "test": "node --test test/*.test.js"
}
```

- [ ] **Step 3: Ejecutar seed**

```bash
cd backend/user-service
npm run seed
```

Salida esperada:
```
MongoDB conectado: mongodb://localhost:27017/erp_users
✓ Permisos insertados
✓ Usuario admin@miapp.com insertado con 14 permisos
✓ Usuario usuario@miapp.com insertado con 3 permisos
✓ Usuario test@miapp.com insertado con 2 permisos
Seed completado.
```

- [ ] **Step 4: Commit**

```bash
cd ../..
git add backend/user-service/src/seed.js backend/user-service/package.json
git commit -m "feat(user-service): add seed script with 3 users and 14 permissions"
```

---

### Task 4: App Fastify + ruta de auth (login y register)

**Files:**
- Create: `backend/user-service/src/app.js`
- Create: `backend/user-service/src/routes/auth.routes.js`

- [ ] **Step 1: Escribir test fallido para login**

Crear `backend/user-service/test/auth.test.js`:
```js
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')
const buildApp = require('../src/app')
const { connectDB } = require('../src/db')
const Usuario = require('../src/models/usuario.model')
const { Permiso, UsuarioPermiso } = require('../src/models/permiso.model')

const TEST_DB = 'mongodb://localhost:27017/erp_users_test'
let app

before(async () => {
    await connectDB(TEST_DB)
    await mongoose.connection.dropDatabase()

    // Insertar permiso y usuario de prueba
    const permiso = await Permiso.create({ clave: 'group:view', descripcion: 'Ver grupos' })
    const passwordHash = await bcrypt.hash('Admin@12345', 10)
    const usuario = await Usuario.create({
        usuario: 'admin', email: 'admin@miapp.com',
        passwordHash, fullName: 'Admin Test',
    })
    await UsuarioPermiso.create({ usuarioId: usuario._id, permisoId: permiso._id })

    app = buildApp()
    await app.ready()
})

after(async () => {
    await mongoose.connection.dropDatabase()
    await mongoose.disconnect()
    await app.close()
})

test('POST /auth/login - credenciales válidas retorna token', async () => {
    const res = await app.inject({
        method: 'POST',
        url: '/auth/login',
        payload: { email: 'admin@miapp.com', password: 'Admin@12345' },
    })
    assert.equal(res.statusCode, 200)
    const body = JSON.parse(res.body)
    assert.ok(body.token, 'debe incluir token')
    assert.equal(body.user.email, 'admin@miapp.com')
    assert.ok(Array.isArray(body.user.permissions))
    assert.ok(body.user.permissions.includes('group:view'))
})

test('POST /auth/login - password incorrecto retorna 401', async () => {
    const res = await app.inject({
        method: 'POST',
        url: '/auth/login',
        payload: { email: 'admin@miapp.com', password: 'wrongpass' },
    })
    assert.equal(res.statusCode, 401)
})

test('POST /auth/login - email inexistente retorna 401', async () => {
    const res = await app.inject({
        method: 'POST',
        url: '/auth/login',
        payload: { email: 'noexiste@miapp.com', password: 'Admin@12345' },
    })
    assert.equal(res.statusCode, 401)
})

test('POST /auth/register - usuario nuevo creado correctamente', async () => {
    const res = await app.inject({
        method: 'POST',
        url: '/auth/register',
        payload: {
            usuario: 'nuevo',
            email: 'nuevo@miapp.com',
            password: 'Nuevo@12345',
            fullName: 'Nuevo Usuario',
        },
    })
    assert.equal(res.statusCode, 201)
    const body = JSON.parse(res.body)
    assert.ok(body.id)
})

test('POST /auth/register - email duplicado retorna 409', async () => {
    const res = await app.inject({
        method: 'POST',
        url: '/auth/register',
        payload: {
            usuario: 'admin2',
            email: 'admin@miapp.com',
            password: 'Admin@12345',
            fullName: 'Admin Duplicado',
        },
    })
    assert.equal(res.statusCode, 409)
})
```

- [ ] **Step 2: Ejecutar test — verificar que falla**

```bash
cd backend/user-service
npm test
```

Salida esperada: `Error: Cannot find module '../src/app'`

- [ ] **Step 3: Crear `src/app.js`**

```js
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

- [ ] **Step 4: Crear `src/routes/auth.routes.js`**

```js
const bcrypt = require('bcryptjs')
const Usuario = require('../models/usuario.model')
const { Permiso, UsuarioPermiso } = require('../models/permiso.model')

async function authRoutes(fastify) {
    fastify.post('/auth/login', {
        schema: {
            body: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                    email:    { type: 'string', format: 'email' },
                    password: { type: 'string' },
                },
            },
        },
    }, async (request, reply) => {
        const { email, password } = request.body

        const usuario = await Usuario.findOne({ email })
        if (!usuario) return reply.code(401).send({ error: 'Credenciales inválidas' })

        const valid = await bcrypt.compare(password, usuario.passwordHash)
        if (!valid) return reply.code(401).send({ error: 'Credenciales inválidas' })

        const userPermisos = await UsuarioPermiso.find({ usuarioId: usuario._id }).populate('permisoId')
        const permissions = userPermisos.map((up) => up.permisoId.clave)

        const token = fastify.jwt.sign(
            { userId: usuario._id, email: usuario.email, permissions },
            { expiresIn: '24h' }
        )

        return { token, user: { id: usuario._id, email: usuario.email, fullName: usuario.fullName, permissions } }
    })

    fastify.post('/auth/register', {
        schema: {
            body: {
                type: 'object',
                required: ['usuario', 'email', 'password', 'fullName'],
                properties: {
                    usuario:   { type: 'string', minLength: 3 },
                    email:     { type: 'string', format: 'email' },
                    password:  { type: 'string', minLength: 6 },
                    fullName:  { type: 'string' },
                    address:   { type: 'string' },
                    phone:     { type: 'string' },
                    birthDate: { type: 'string' },
                },
            },
        },
    }, async (request, reply) => {
        const { usuario, email, password, fullName, address, phone, birthDate } = request.body

        const exists = await Usuario.findOne({ $or: [{ email }, { usuario }] })
        if (exists) return reply.code(409).send({ error: 'Email o usuario ya registrado' })

        const passwordHash = await bcrypt.hash(password, 10)
        const newUser = await Usuario.create({ usuario, email, passwordHash, fullName, address, phone, birthDate })

        // Permisos por defecto: group:view, ticket:view
        const defaultPerms = await Permiso.find({ clave: { $in: ['group:view', 'ticket:view'] } })
        await UsuarioPermiso.insertMany(
            defaultPerms.map((p) => ({ usuarioId: newUser._id, permisoId: p._id }))
        )

        return reply.code(201).send({ message: 'Usuario creado exitosamente', id: newUser._id })
    })
}

module.exports = authRoutes
```

- [ ] **Step 5: Crear `src/routes/users.routes.js`** (stub vacío para que `app.js` no falle)

```js
async function usersRoutes(fastify) {
    // implementado en Task 5
}

module.exports = usersRoutes
```

- [ ] **Step 6: Ejecutar tests — deben pasar**

```bash
npm test
```

Salida esperada:
```
✔ POST /auth/login - credenciales válidas retorna token
✔ POST /auth/login - password incorrecto retorna 401
✔ POST /auth/login - email inexistente retorna 401
✔ POST /auth/register - usuario nuevo creado correctamente
✔ POST /auth/register - email duplicado retorna 409
ℹ tests 5, pass 5
```

- [ ] **Step 7: Commit**

```bash
cd ../..
git add backend/user-service/src/ backend/user-service/test/auth.test.js
git commit -m "feat(user-service): add auth routes (login, register) with tests"
```

---

### Task 5: CRUD de usuarios y permisos

**Files:**
- Modify: `backend/user-service/src/routes/users.routes.js`
- Create: `backend/user-service/test/users.test.js`

- [ ] **Step 1: Escribir tests fallidos para usuarios**

Crear `backend/user-service/test/users.test.js`:
```js
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')
const buildApp = require('../src/app')
const { connectDB } = require('../src/db')
const Usuario = require('../src/models/usuario.model')
const { Permiso, UsuarioPermiso } = require('../src/models/permiso.model')

const TEST_DB = 'mongodb://localhost:27017/erp_users_test2'
let app
let adminToken
let adminId

before(async () => {
    await connectDB(TEST_DB)
    await mongoose.connection.dropDatabase()

    // Crear permisos
    await Permiso.insertMany([
        { clave: 'users:view', descripcion: 'Ver usuarios' },
        { clave: 'user:edit',  descripcion: 'Editar usuarios' },
        { clave: 'user:delete',descripcion: 'Eliminar usuarios' },
    ])

    // Crear admin con permisos
    const hash = await bcrypt.hash('Admin@12345', 10)
    const admin = await Usuario.create({ usuario: 'admin', email: 'admin@miapp.com', passwordHash: hash, fullName: 'Admin' })
    adminId = admin._id.toString()
    const permisos = await Permiso.find()
    await UsuarioPermiso.insertMany(permisos.map(p => ({ usuarioId: admin._id, permisoId: p._id })))

    app = buildApp({ logger: false })
    await app.ready()

    // Login para obtener token
    const res = await app.inject({
        method: 'POST', url: '/auth/login',
        payload: { email: 'admin@miapp.com', password: 'Admin@12345' },
    })
    adminToken = JSON.parse(res.body).token
})

after(async () => {
    await mongoose.connection.dropDatabase()
    await mongoose.disconnect()
    await app.close()
})

test('GET /users - lista todos los usuarios', async () => {
    const res = await app.inject({
        method: 'GET', url: '/users',
        headers: { authorization: `Bearer ${adminToken}` },
    })
    assert.equal(res.statusCode, 200)
    const body = JSON.parse(res.body)
    assert.ok(Array.isArray(body))
    assert.ok(body.length >= 1)
})

test('GET /users - sin token retorna 401', async () => {
    const res = await app.inject({ method: 'GET', url: '/users' })
    assert.equal(res.statusCode, 401)
})

test('GET /users/:id - retorna usuario por id', async () => {
    const res = await app.inject({
        method: 'GET', url: `/users/${adminId}`,
        headers: { authorization: `Bearer ${adminToken}` },
    })
    assert.equal(res.statusCode, 200)
    const body = JSON.parse(res.body)
    assert.equal(body.email, 'admin@miapp.com')
    assert.ok(!body.passwordHash, 'no debe exponer el hash')
})

test('PUT /users/:id - actualiza fullName', async () => {
    const res = await app.inject({
        method: 'PUT', url: `/users/${adminId}`,
        headers: { authorization: `Bearer ${adminToken}` },
        payload: { fullName: 'Admin Actualizado' },
    })
    assert.equal(res.statusCode, 200)
    const body = JSON.parse(res.body)
    assert.equal(body.fullName, 'Admin Actualizado')
})

test('GET /users/:id/permissions - lista permisos del usuario', async () => {
    const res = await app.inject({
        method: 'GET', url: `/users/${adminId}/permissions`,
        headers: { authorization: `Bearer ${adminToken}` },
    })
    assert.equal(res.statusCode, 200)
    const body = JSON.parse(res.body)
    assert.ok(Array.isArray(body))
    assert.ok(body.includes('users:view'))
})

test('PUT /users/:id/permissions - asigna permisos', async () => {
    const res = await app.inject({
        method: 'PUT', url: `/users/${adminId}/permissions`,
        headers: { authorization: `Bearer ${adminToken}` },
        payload: { permissions: ['users:view'] },
    })
    assert.equal(res.statusCode, 200)
    const body = JSON.parse(res.body)
    assert.deepEqual(body.permissions, ['users:view'])
})
```

- [ ] **Step 2: Ejecutar tests — verificar que fallan**

```bash
npm test
```

Salida esperada: los 5 tests de users fallan con 404 o errores de ruta.

- [ ] **Step 3: Implementar `src/routes/users.routes.js`**

```js
const Usuario = require('../models/usuario.model')
const { Permiso, UsuarioPermiso } = require('../models/permiso.model')

async function usersRoutes(fastify) {
    // Decorador: verifica JWT en header Authorization
    fastify.addHook('onRequest', async (request, reply) => {
        try {
            await request.jwtVerify()
        } catch {
            reply.code(401).send({ error: 'Token inválido o ausente' })
        }
    })

    // GET /users — lista todos los usuarios (requiere users:view)
    fastify.get('/', async (request, reply) => {
        if (!request.user.permissions.includes('users:view')) {
            return reply.code(403).send({ error: 'Sin permiso' })
        }
        const usuarios = await Usuario.find({}, { passwordHash: 0 })
        return usuarios
    })

    // GET /users/:id
    fastify.get('/:id', async (request, reply) => {
        const usuario = await Usuario.findById(request.params.id, { passwordHash: 0 })
        if (!usuario) return reply.code(404).send({ error: 'Usuario no encontrado' })
        return usuario
    })

    // PUT /users/:id — actualiza datos (no password, no email)
    fastify.put('/:id', {
        schema: {
            body: {
                type: 'object',
                properties: {
                    fullName:  { type: 'string' },
                    address:   { type: 'string' },
                    phone:     { type: 'string' },
                    birthDate: { type: 'string' },
                },
            },
        },
    }, async (request, reply) => {
        const { fullName, address, phone, birthDate } = request.body
        const updated = await Usuario.findByIdAndUpdate(
            request.params.id,
            { fullName, address, phone, birthDate },
            { new: true, fields: { passwordHash: 0 } }
        )
        if (!updated) return reply.code(404).send({ error: 'Usuario no encontrado' })
        return updated
    })

    // DELETE /users/:id — requiere user:delete
    fastify.delete('/:id', async (request, reply) => {
        if (!request.user.permissions.includes('user:delete')) {
            return reply.code(403).send({ error: 'Sin permiso' })
        }
        await Usuario.findByIdAndDelete(request.params.id)
        await UsuarioPermiso.deleteMany({ usuarioId: request.params.id })
        return { message: 'Usuario eliminado' }
    })

    // GET /users/:id/permissions — lista claves de permisos del usuario
    fastify.get('/:id/permissions', async (request, reply) => {
        const asignaciones = await UsuarioPermiso.find({ usuarioId: request.params.id }).populate('permisoId')
        return asignaciones.map((a) => a.permisoId.clave)
    })

    // PUT /users/:id/permissions — reemplaza permisos del usuario
    fastify.put('/:id/permissions', {
        schema: {
            body: {
                type: 'object',
                required: ['permissions'],
                properties: {
                    permissions: { type: 'array', items: { type: 'string' } },
                },
            },
        },
    }, async (request, reply) => {
        if (!request.user.permissions.includes('user:edit')) {
            return reply.code(403).send({ error: 'Sin permiso' })
        }
        const { permissions } = request.body
        const permisos = await Permiso.find({ clave: { $in: permissions } })

        await UsuarioPermiso.deleteMany({ usuarioId: request.params.id })
        await UsuarioPermiso.insertMany(
            permisos.map((p) => ({ usuarioId: request.params.id, permisoId: p._id }))
        )

        return { permissions: permisos.map((p) => p.clave) }
    })
}

module.exports = usersRoutes
```

- [ ] **Step 4: Ejecutar todos los tests — deben pasar**

```bash
npm test
```

Salida esperada:
```
✔ POST /auth/login - credenciales válidas retorna token
✔ POST /auth/login - password incorrecto retorna 401
✔ POST /auth/login - email inexistente retorna 401
✔ POST /auth/register - usuario nuevo creado correctamente
✔ POST /auth/register - email duplicado retorna 409
✔ GET /users - lista todos los usuarios
✔ GET /users - sin token retorna 401
✔ GET /users/:id - retorna usuario por id
✔ PUT /users/:id - actualiza fullName
✔ GET /users/:id/permissions - lista permisos del usuario
✔ PUT /users/:id/permissions - asigna permisos
ℹ tests 11, pass 11
```

- [ ] **Step 5: Commit**

```bash
cd ../..
git add backend/user-service/
git commit -m "feat(user-service): add users CRUD and permissions endpoints with tests"
```

---

### Task 6: Verificar servidor corriendo

- [ ] **Step 1: Asegurarse de que MongoDB está corriendo localmente**

```bash
# Con Docker:
docker run -d -p 27017:27017 --name mongo-erp mongo:7
# O si tienes MongoDB instalado:
mongod --dbpath /data/db
```

- [ ] **Step 2: Ejecutar seed y arrancar el servidor**

```bash
cd backend/user-service
npm run seed
npm start
```

Salida esperada:
```
MongoDB conectado: mongodb://localhost:27017/erp_users
Server listening at http://0.0.0.0:3001
```

- [ ] **Step 3: Probar login con curl**

```bash
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@miapp.com","password":"Admin@12345"}'
```

Salida esperada: JSON con `token` y `user` con 14 permisos.

- [ ] **Step 4: Commit final del plan 1**

```bash
cd ../..
git add .
git commit -m "feat(user-service): user service complete and verified"
```

---

## Siguiente paso

Con el User Service funcionando, continuar con **Plan 2 — API Gateway** que:
- Enruta `/auth/*` y `/users/*` → User Service (puerto 3001)
- Valida JWT con Redis antes de reenviar cada request
- Expone el puerto 3000 al frontend Angular
