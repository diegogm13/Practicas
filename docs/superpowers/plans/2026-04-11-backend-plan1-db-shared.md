# Backend Plan 1 — Database (Supabase) + Shared Code

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Crear el schema SQL en Supabase con todos los datos semilla del proyecto Angular, y el módulo `shared/` con el envelope de respuesta y los JSON Schemas de Fastify reutilizables por todos los servicios.

**Architecture:** Dos archivos SQL ejecutables en el SQL Editor de Supabase (schema + seed). El módulo `shared/` vive en `C:\Users\dg660\Documents\Clases\pagina\backend\shared\` y es importado por los demás servicios con rutas relativas (`require('../shared/response')`).

**Tech Stack:** PostgreSQL (Supabase), @supabase/supabase-js, bcryptjs (para generar hashes del seed), Node.js

---

## Estructura de archivos

```
C:\Users\dg660\Documents\Clases\pagina\backend\
└── shared/
    ├── response.js                  ← helpers ok() / fail()
    └── schemas/
        ├── auth.schemas.js          ← loginBody, registerBody, tokenResponse
        ├── user.schemas.js          ← userResponse, updateUserBody, permissionsBody
        ├── group.schemas.js         ← groupResponse, createGroupBody, memberBody
        └── ticket.schemas.js        ← ticketResponse, createTicketBody, updateTicketBody, estadoBody

C:\Users\dg660\Documents\Clases\pagina\erp-dgm\supabase\migrations\
├── 001_schema.sql                   ← DDL completo
└── 002_seed.sql                     ← INSERT con bcrypt hashes
```

---

### Task 1: Schema SQL en Supabase

**Files:**
- Create: `supabase/migrations/001_schema.sql` (dentro de `erp-dgm/`)

- [ ] **Step 1: Crear el archivo `supabase/migrations/001_schema.sql`**

```sql
-- ============================================================
-- ERP-DGM Schema — ejecutar en Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS usuarios (
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

CREATE TABLE IF NOT EXISTS permisos (
    id          SERIAL PRIMARY KEY,
    clave       VARCHAR(50) NOT NULL UNIQUE,
    descripcion TEXT
);

CREATE TABLE IF NOT EXISTS usuario_permisos (
    usuario_id UUID    NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    permiso_id INTEGER NOT NULL REFERENCES permisos(id) ON DELETE CASCADE,
    PRIMARY KEY (usuario_id, permiso_id)
);

CREATE TABLE IF NOT EXISTS grupos (
    id         SERIAL PRIMARY KEY,
    nombre     VARCHAR(100) NOT NULL,
    categoria  VARCHAR(50)  NOT NULL,
    nivel      VARCHAR(20)  NOT NULL,
    autor_id   UUID         NOT NULL REFERENCES usuarios(id),
    created_at TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS grupo_miembros (
    id         SERIAL PRIMARY KEY,
    grupo_id   INTEGER NOT NULL REFERENCES grupos(id) ON DELETE CASCADE,
    usuario_id UUID    NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    UNIQUE (grupo_id, usuario_id)
);

CREATE TABLE IF NOT EXISTS ticket_estados (
    id     SERIAL PRIMARY KEY,
    nombre VARCHAR(30) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS tickets (
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

CREATE TABLE IF NOT EXISTS ticket_comentarios (
    id        SERIAL PRIMARY KEY,
    ticket_id INTEGER     NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    autor_id  UUID        NOT NULL REFERENCES usuarios(id),
    texto     TEXT        NOT NULL,
    fecha     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ticket_historial (
    id        SERIAL PRIMARY KEY,
    ticket_id INTEGER     NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    autor_id  UUID        NOT NULL REFERENCES usuarios(id),
    cambio    TEXT        NOT NULL,
    fecha     TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

- [ ] **Step 2: Ejecutar en Supabase**

1. Abre tu proyecto en [supabase.com](https://supabase.com)
2. Ve a **SQL Editor** → **New query**
3. Pega el contenido de `001_schema.sql` → clic en **Run**
4. Verifica que aparecen las 8 tablas en **Table Editor**: `usuarios`, `permisos`, `usuario_permisos`, `grupos`, `grupo_miembros`, `ticket_estados`, `tickets`, `ticket_comentarios`, `ticket_historial`

- [ ] **Step 3: Commit**

```bash
cd C:/Users/dg660/Documents/Clases/pagina/erp-dgm
git add supabase/migrations/001_schema.sql
git commit -m "feat(db): add supabase schema with ticket_estados table"
```

---

### Task 2: Seed SQL en Supabase

**Files:**
- Create: `supabase/migrations/002_seed.sql` (dentro de `erp-dgm/`)

Los hashes bcrypt (costo 10) para las contraseñas son:
- `Admin@12345` → `$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi` *(hash de ejemplo — genera el tuyo con el script del Step 1)*
- `User@12345!` → hash bcrypt
- `Test#12345` → hash bcrypt

- [ ] **Step 1: Generar los hashes bcrypt reales**

Ejecuta este script de Node.js en cualquier carpeta para obtener los hashes:

```bash
node -e "
const bcrypt = require('bcryptjs');
(async () => {
  const passwords = ['Admin@12345', 'User@12345!', 'Test#12345'];
  for (const p of passwords) {
    const hash = await bcrypt.hash(p, 10);
    console.log(p + ' => ' + hash);
  }
})();
"
```

Si `bcryptjs` no está instalado globalmente, instálalo temporalmente:
```bash
npm install -g bcryptjs
```

Copia los 3 hashes generados — los necesitas en el Step 2.

- [ ] **Step 2: Crear `supabase/migrations/002_seed.sql`**

Reemplaza `HASH_ADMIN`, `HASH_USUARIO`, `HASH_TEST` con los hashes reales del Step 1:

```sql
-- ============================================================
-- ERP-DGM Seed — ejecutar DESPUÉS de 001_schema.sql
-- ============================================================

-- Estados de ticket
INSERT INTO ticket_estados (nombre) VALUES
    ('Pendiente'),
    ('En Progreso'),
    ('Revisión'),
    ('Finalizado')
ON CONFLICT (nombre) DO NOTHING;

-- Usuarios
INSERT INTO usuarios (usuario, email, password_hash, full_name, activo) VALUES
    ('admin',   'admin@miapp.com',   'HASH_ADMIN',   'Carlos Ramírez', true),
    ('usuario', 'usuario@miapp.com', 'HASH_USUARIO', 'Laura Mendoza',  true),
    ('test',    'test@miapp.com',    'HASH_TEST',    'Pedro Soto',     false)
ON CONFLICT (email) DO NOTHING;

-- Permisos (14)
INSERT INTO permisos (clave, descripcion) VALUES
    ('group:view',        'Ver grupos'),
    ('group:edit',        'Editar grupos'),
    ('group:add',         'Crear grupos'),
    ('group:delete',      'Eliminar grupos'),
    ('ticket:view',       'Ver tickets'),
    ('ticket:edit',       'Editar tickets'),
    ('ticket:add',        'Crear tickets'),
    ('ticket:delete',     'Eliminar tickets'),
    ('ticket:edit_state', 'Cambiar estado de tickets'),
    ('user:view',         'Ver perfil propio'),
    ('users:view',        'Ver todos los usuarios'),
    ('user:add',          'Crear usuarios'),
    ('user:edit',         'Editar usuarios'),
    ('user:delete',       'Eliminar usuarios')
ON CONFLICT (clave) DO NOTHING;

-- Permisos de admin (todos)
INSERT INTO usuario_permisos (usuario_id, permiso_id)
SELECT u.id, p.id
FROM usuarios u, permisos p
WHERE u.email = 'admin@miapp.com'
ON CONFLICT DO NOTHING;

-- Permisos de usuario
INSERT INTO usuario_permisos (usuario_id, permiso_id)
SELECT u.id, p.id
FROM usuarios u, permisos p
WHERE u.email = 'usuario@miapp.com'
  AND p.clave IN ('group:view', 'ticket:view', 'ticket:edit_state')
ON CONFLICT DO NOTHING;

-- Permisos de test
INSERT INTO usuario_permisos (usuario_id, permiso_id)
SELECT u.id, p.id
FROM usuarios u, permisos p
WHERE u.email = 'test@miapp.com'
  AND p.clave IN ('group:view', 'ticket:view')
ON CONFLICT DO NOTHING;

-- Grupos
INSERT INTO grupos (nombre, categoria, nivel, autor_id)
SELECT 'Grupo Alpha', 'Tecnología', 'Avanzado', id FROM usuarios WHERE email = 'admin@miapp.com';

INSERT INTO grupos (nombre, categoria, nivel, autor_id)
SELECT 'Grupo Beta', 'Marketing', 'Intermedio', id FROM usuarios WHERE email = 'usuario@miapp.com';

INSERT INTO grupos (nombre, categoria, nivel, autor_id)
SELECT 'Grupo Gamma', 'Ventas', 'Básico', id FROM usuarios WHERE email = 'test@miapp.com';

-- Miembros de Grupo Alpha (id=1): admin, usuario, test
INSERT INTO grupo_miembros (grupo_id, usuario_id)
SELECT 1, id FROM usuarios WHERE email IN ('admin@miapp.com', 'usuario@miapp.com', 'test@miapp.com')
ON CONFLICT DO NOTHING;

-- Miembros de Grupo Beta (id=2): usuario, test
INSERT INTO grupo_miembros (grupo_id, usuario_id)
SELECT 2, id FROM usuarios WHERE email IN ('usuario@miapp.com', 'test@miapp.com')
ON CONFLICT DO NOTHING;

-- Miembros de Grupo Gamma (id=3): test, admin, usuario
INSERT INTO grupo_miembros (grupo_id, usuario_id)
SELECT 3, id FROM usuarios WHERE email IN ('test@miapp.com', 'admin@miapp.com', 'usuario@miapp.com')
ON CONFLICT DO NOTHING;

-- Tickets (todos en Grupo Alpha, id=1)
INSERT INTO tickets (titulo, descripcion, estado_id, prioridad, asignado_a, creador_id, fecha_creacion, fecha_limite, grupo_id)
SELECT
    'Configurar entorno de staging',
    'Levantar entorno de staging con Docker Compose para pruebas de integración.',
    (SELECT id FROM ticket_estados WHERE nombre = 'En Progreso'),
    'Alta',
    (SELECT id FROM usuarios WHERE email = 'admin@miapp.com'),
    (SELECT id FROM usuarios WHERE email = 'admin@miapp.com'),
    '2026-02-10',
    '2026-03-15',
    1;

INSERT INTO tickets (titulo, descripcion, estado_id, prioridad, asignado_a, creador_id, fecha_creacion, fecha_limite, grupo_id)
SELECT
    'Revisar vulnerabilidades de seguridad',
    'Ejecutar OWASP ZAP y corregir hallazgos críticos.',
    (SELECT id FROM ticket_estados WHERE nombre = 'Pendiente'),
    'Crítica',
    (SELECT id FROM usuarios WHERE email = 'usuario@miapp.com'),
    (SELECT id FROM usuarios WHERE email = 'admin@miapp.com'),
    '2026-02-15',
    '2026-03-10',
    1;

INSERT INTO tickets (titulo, descripcion, estado_id, prioridad, asignado_a, creador_id, fecha_creacion, fecha_limite, grupo_id)
SELECT
    'Optimizar consultas SQL del módulo de reportes',
    'Varias consultas superan los 3 segundos en producción.',
    (SELECT id FROM ticket_estados WHERE nombre = 'Revisión'),
    'Media',
    (SELECT id FROM usuarios WHERE email = 'test@miapp.com'),
    (SELECT id FROM usuarios WHERE email = 'usuario@miapp.com'),
    '2026-02-18',
    '2026-03-20',
    1;

INSERT INTO tickets (titulo, descripcion, estado_id, prioridad, asignado_a, creador_id, fecha_creacion, fecha_limite, grupo_id)
SELECT
    'Actualizar dependencias de Node.js',
    'Migrar a Node 22 LTS y actualizar paquetes desactualizados.',
    (SELECT id FROM ticket_estados WHERE nombre = 'Finalizado'),
    'Baja',
    (SELECT id FROM usuarios WHERE email = 'admin@miapp.com'),
    (SELECT id FROM usuarios WHERE email = 'test@miapp.com'),
    '2026-01-20',
    '2026-02-28',
    1;

-- Comentario del ticket 1
INSERT INTO ticket_comentarios (ticket_id, autor_id, texto, fecha)
SELECT
    1,
    (SELECT id FROM usuarios WHERE email = 'admin@miapp.com'),
    'Iniciando configuración de Docker.',
    '2026-02-11';

-- Historial del ticket 1
INSERT INTO ticket_historial (ticket_id, autor_id, cambio, fecha)
SELECT
    1,
    (SELECT id FROM usuarios WHERE email = 'admin@miapp.com'),
    'Estado cambiado a En Progreso',
    '2026-02-12';
```

- [ ] **Step 3: Ejecutar en Supabase**

1. Abre **SQL Editor** → **New query**
2. Pega el contenido de `002_seed.sql` → clic en **Run**
3. Verifica en **Table Editor**:
   - `usuarios`: 3 filas
   - `permisos`: 14 filas
   - `usuario_permisos`: 14 + 3 + 2 = 19 filas
   - `grupos`: 3 filas
   - `grupo_miembros`: 8 filas
   - `ticket_estados`: 4 filas
   - `tickets`: 4 filas
   - `ticket_comentarios`: 1 fila
   - `ticket_historial`: 1 fila

- [ ] **Step 4: Commit**

```bash
cd C:/Users/dg660/Documents/Clases/pagina/erp-dgm
git add supabase/migrations/002_seed.sql
git commit -m "feat(db): add supabase seed data (3 users, 14 permissions, 3 groups, 4 tickets)"
```

---

### Task 3: Módulo shared — response.js

**Files:**
- Create: `C:\Users\dg660\Documents\Clases\pagina\backend\shared\response.js`

- [ ] **Step 1: Inicializar git repo en `backend/`**

```bash
cd C:/Users/dg660/Documents/Clases/pagina/backend
git init
echo "node_modules/" > .gitignore
echo ".env" >> .gitignore
git add .gitignore
git commit -m "chore: initialize backend repo"
```

- [ ] **Step 2: Crear `shared/response.js`**

```js
'use strict'

/**
 * Envelope estándar para todas las respuestas de los servicios ERP-DGM.
 *
 * Éxito:  { success: true,  data: <payload>, message: <string> }
 * Error:  { success: false, data: null,       error:   <string> }
 */

function ok(data, message = 'Ok') {
    return { success: true, data, message }
}

function fail(error) {
    return { success: false, data: null, error }
}

module.exports = { ok, fail }
```

- [ ] **Step 3: Verificar que funciona**

```bash
cd C:/Users/dg660/Documents/Clases/pagina/backend
node -e "
const { ok, fail } = require('./shared/response');
console.log(JSON.stringify(ok({ id: 1 })));
console.log(JSON.stringify(fail('No encontrado')));
"
```

Salida esperada:
```
{"success":true,"data":{"id":1},"message":"Ok"}
{"success":false,"data":null,"error":"No encontrado"}
```

- [ ] **Step 4: Commit**

```bash
cd C:/Users/dg660/Documents/Clases/pagina/backend
git add shared/response.js
git commit -m "feat(shared): add response envelope helpers ok/fail"
```

---

### Task 4: Schemas compartidos — auth

**Files:**
- Create: `C:\Users\dg660\Documents\Clases\pagina\backend\shared\schemas\auth.schemas.js`

- [ ] **Step 1: Crear `shared/schemas/auth.schemas.js`**

```js
'use strict'

const loginBody = {
    $schema: 'http://json-schema.org/draft-07/schema#',
    title: 'LoginBody',
    type: 'object',
    required: ['email', 'password'],
    properties: {
        email:    { type: 'string', format: 'email' },
        password: { type: 'string', minLength: 6 },
    },
    additionalProperties: false,
}

const registerBody = {
    $schema: 'http://json-schema.org/draft-07/schema#',
    title: 'RegisterBody',
    type: 'object',
    required: ['usuario', 'email', 'password', 'full_name'],
    properties: {
        usuario:    { type: 'string', minLength: 3, maxLength: 50 },
        email:      { type: 'string', format: 'email' },
        password:   { type: 'string', minLength: 6 },
        full_name:  { type: 'string', minLength: 2, maxLength: 150 },
        address:    { type: 'string' },
        phone:      { type: 'string', maxLength: 20 },
        birth_date: { type: 'string', format: 'date' },
    },
    additionalProperties: false,
}

const tokenResponse = {
    $schema: 'http://json-schema.org/draft-07/schema#',
    title: 'TokenResponse',
    type: 'object',
    properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        data: {
            type: 'object',
            properties: {
                token: { type: 'string' },
                user: {
                    type: 'object',
                    properties: {
                        id:          { type: 'string' },
                        email:       { type: 'string' },
                        full_name:   { type: 'string' },
                        permissions: { type: 'array', items: { type: 'string' } },
                    },
                },
            },
        },
    },
}

module.exports = { loginBody, registerBody, tokenResponse }
```

- [ ] **Step 2: Verificar sintaxis**

```bash
cd C:/Users/dg660/Documents/Clases/pagina/backend
node -e "const s = require('./shared/schemas/auth.schemas'); console.log(Object.keys(s));"
```

Salida esperada:
```
[ 'loginBody', 'registerBody', 'tokenResponse' ]
```

- [ ] **Step 3: Commit**

```bash
cd C:/Users/dg660/Documents/Clases/pagina/backend
git add shared/schemas/auth.schemas.js
git commit -m "feat(shared): add auth JSON schemas (loginBody, registerBody, tokenResponse)"
```

---

### Task 5: Schemas compartidos — usuarios

**Files:**
- Create: `C:\Users\dg660\Documents\Clases\pagina\backend\shared\schemas\user.schemas.js`

- [ ] **Step 1: Crear `shared/schemas/user.schemas.js`**

```js
'use strict'

const userResponse = {
    $schema: 'http://json-schema.org/draft-07/schema#',
    title: 'UserResponse',
    type: 'object',
    properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        data: {
            type: 'object',
            properties: {
                id:         { type: 'string' },
                usuario:    { type: 'string' },
                email:      { type: 'string' },
                full_name:  { type: 'string' },
                address:    { type: 'string' },
                phone:      { type: 'string' },
                birth_date: { type: 'string' },
                activo:     { type: 'boolean' },
                created_at: { type: 'string' },
            },
        },
    },
}

const updateUserBody = {
    $schema: 'http://json-schema.org/draft-07/schema#',
    title: 'UpdateUserBody',
    type: 'object',
    properties: {
        full_name:  { type: 'string', minLength: 2, maxLength: 150 },
        address:    { type: 'string' },
        phone:      { type: 'string', maxLength: 20 },
        birth_date: { type: 'string', format: 'date' },
        activo:     { type: 'boolean' },
    },
    additionalProperties: false,
}

const permissionsBody = {
    $schema: 'http://json-schema.org/draft-07/schema#',
    title: 'PermissionsBody',
    type: 'object',
    required: ['permissions'],
    properties: {
        permissions: {
            type: 'array',
            items: { type: 'string' },
            uniqueItems: true,
        },
    },
    additionalProperties: false,
}

module.exports = { userResponse, updateUserBody, permissionsBody }
```

- [ ] **Step 2: Verificar sintaxis**

```bash
cd C:/Users/dg660/Documents/Clases/pagina/backend
node -e "const s = require('./shared/schemas/user.schemas'); console.log(Object.keys(s));"
```

Salida esperada:
```
[ 'userResponse', 'updateUserBody', 'permissionsBody' ]
```

- [ ] **Step 3: Commit**

```bash
cd C:/Users/dg660/Documents/Clases/pagina/backend
git add shared/schemas/user.schemas.js
git commit -m "feat(shared): add user JSON schemas"
```

---

### Task 6: Schemas compartidos — grupos

**Files:**
- Create: `C:\Users\dg660\Documents\Clases\pagina\backend\shared\schemas\group.schemas.js`

- [ ] **Step 1: Crear `shared/schemas/group.schemas.js`**

```js
'use strict'

const groupResponse = {
    $schema: 'http://json-schema.org/draft-07/schema#',
    title: 'GroupResponse',
    type: 'object',
    properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        data: {
            type: 'object',
            properties: {
                id:         { type: 'integer' },
                nombre:     { type: 'string' },
                categoria:  { type: 'string' },
                nivel:      { type: 'string' },
                autor_id:   { type: 'string' },
                created_at: { type: 'string' },
            },
        },
    },
}

const createGroupBody = {
    $schema: 'http://json-schema.org/draft-07/schema#',
    title: 'CreateGroupBody',
    type: 'object',
    required: ['nombre', 'categoria', 'nivel'],
    properties: {
        nombre:    { type: 'string', minLength: 2, maxLength: 100 },
        categoria: { type: 'string', enum: ['Tecnología', 'Marketing', 'Ventas', 'Operaciones'] },
        nivel:     { type: 'string', enum: ['Básico', 'Intermedio', 'Avanzado'] },
    },
    additionalProperties: false,
}

const memberBody = {
    $schema: 'http://json-schema.org/draft-07/schema#',
    title: 'MemberBody',
    type: 'object',
    required: ['usuario_id'],
    properties: {
        usuario_id: { type: 'string', format: 'uuid' },
    },
    additionalProperties: false,
}

module.exports = { groupResponse, createGroupBody, memberBody }
```

- [ ] **Step 2: Verificar sintaxis**

```bash
cd C:/Users/dg660/Documents/Clases/pagina/backend
node -e "const s = require('./shared/schemas/group.schemas'); console.log(Object.keys(s));"
```

Salida esperada:
```
[ 'groupResponse', 'createGroupBody', 'memberBody' ]
```

- [ ] **Step 3: Commit**

```bash
cd C:/Users/dg660/Documents/Clases/pagina/backend
git add shared/schemas/group.schemas.js
git commit -m "feat(shared): add group JSON schemas"
```

---

### Task 7: Schemas compartidos — tickets

**Files:**
- Create: `C:\Users\dg660\Documents\Clases\pagina\backend\shared\schemas\ticket.schemas.js`

- [ ] **Step 1: Crear `shared/schemas/ticket.schemas.js`**

```js
'use strict'

const ticketResponse = {
    $schema: 'http://json-schema.org/draft-07/schema#',
    title: 'TicketResponse',
    type: 'object',
    properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        data: {
            type: 'object',
            properties: {
                id:             { type: 'integer' },
                titulo:         { type: 'string' },
                descripcion:    { type: 'string' },
                estado_id:      { type: 'integer' },
                prioridad:      { type: 'string' },
                asignado_a:     { type: 'string' },
                creador_id:     { type: 'string' },
                fecha_creacion: { type: 'string' },
                fecha_limite:   { type: 'string' },
                grupo_id:       { type: 'integer' },
            },
        },
    },
}

const createTicketBody = {
    $schema: 'http://json-schema.org/draft-07/schema#',
    title: 'CreateTicketBody',
    type: 'object',
    required: ['titulo', 'descripcion', 'fecha_limite', 'grupo_id'],
    properties: {
        titulo:       { type: 'string', minLength: 3, maxLength: 200 },
        descripcion:  { type: 'string', minLength: 5 },
        prioridad:    { type: 'string', enum: ['Baja', 'Media', 'Alta', 'Crítica'] },
        asignado_a:   { type: 'string', format: 'uuid' },
        fecha_limite: { type: 'string', format: 'date' },
        grupo_id:     { type: 'integer' },
    },
    additionalProperties: false,
}

const updateTicketBody = {
    $schema: 'http://json-schema.org/draft-07/schema#',
    title: 'UpdateTicketBody',
    type: 'object',
    properties: {
        titulo:       { type: 'string', minLength: 3, maxLength: 200 },
        descripcion:  { type: 'string', minLength: 5 },
        prioridad:    { type: 'string', enum: ['Baja', 'Media', 'Alta', 'Crítica'] },
        asignado_a:   { type: 'string', format: 'uuid' },
        fecha_limite: { type: 'string', format: 'date' },
    },
    additionalProperties: false,
}

const estadoBody = {
    $schema: 'http://json-schema.org/draft-07/schema#',
    title: 'EstadoBody',
    type: 'object',
    required: ['estado_id'],
    properties: {
        estado_id: { type: 'integer', minimum: 1 },
    },
    additionalProperties: false,
}

const comentarioBody = {
    $schema: 'http://json-schema.org/draft-07/schema#',
    title: 'ComentarioBody',
    type: 'object',
    required: ['texto'],
    properties: {
        texto: { type: 'string', minLength: 1 },
    },
    additionalProperties: false,
}

module.exports = { ticketResponse, createTicketBody, updateTicketBody, estadoBody, comentarioBody }
```

- [ ] **Step 2: Verificar sintaxis**

```bash
cd C:/Users/dg660/Documents/Clases/pagina/backend
node -e "const s = require('./shared/schemas/ticket.schemas'); console.log(Object.keys(s));"
```

Salida esperada:
```
[ 'ticketResponse', 'createTicketBody', 'updateTicketBody', 'estadoBody', 'comentarioBody' ]
```

- [ ] **Step 3: Commit final del Plan 1**

```bash
cd C:/Users/dg660/Documents/Clases/pagina/backend
git add shared/schemas/ticket.schemas.js
git commit -m "feat(shared): add ticket JSON schemas — Plan 1 complete"
```

---

## Siguiente paso

Con la BD en Supabase y el módulo `shared/` listos, continuar con **Plan 2 — User Service** que implementa auth (login/register/logout) y el CRUD de usuarios/permisos conectado a Supabase.
