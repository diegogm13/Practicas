# Diseño de Base de Datos — ERP-DGM en Supabase

**Fecha:** 2026-03-30
**Estado:** Aprobado

## Contexto

El proyecto ERP-DGM actualmente tiene toda la lógica de usuarios, permisos, grupos y tickets en memoria (servicios Angular con datos hardcodeados). El objetivo es migrar toda esa información a una base de datos Supabase (PostgreSQL), dejando el esquema listo para que un backend Node.js lo consuma en el futuro.

No se usa Supabase Auth. El manejo de contraseñas se hace con bcrypt a nivel de aplicación.

---

## Esquema de Tablas

### `usuarios`
Equivale al `RegisteredUser` + credenciales hardcodeadas de `auth.service.ts`.

```sql
CREATE TABLE usuarios (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario     VARCHAR(50)  NOT NULL UNIQUE,
    email       VARCHAR(150) NOT NULL UNIQUE,
    password_hash TEXT        NOT NULL,
    full_name   VARCHAR(150) NOT NULL,
    address     TEXT,
    phone       VARCHAR(20),
    birth_date  DATE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);
```

### `permisos`
Catálogo de todos los permisos disponibles en el sistema.

```sql
CREATE TABLE permisos (
    id          SERIAL PRIMARY KEY,
    clave       VARCHAR(50) NOT NULL UNIQUE,
    descripcion TEXT
);
```

Permisos semilla (los 14 actuales):
| clave | descripcion |
|---|---|
| group:view | Ver grupos |
| group:edit | Editar grupos |
| group:add | Crear grupos |
| group:delete | Eliminar grupos |
| ticket:view | Ver tickets |
| ticket:edit | Editar tickets |
| ticket:add | Crear tickets |
| ticket:delete | Eliminar tickets |
| ticket:edit_state | Cambiar estado de tickets |
| user:view | Ver perfil propio |
| users:view | Ver todos los usuarios |
| user:add | Crear usuarios |
| user:edit | Editar usuarios |
| user:delete | Eliminar usuarios |

### `usuario_permisos`
Relación M:N entre usuarios y permisos.

```sql
CREATE TABLE usuario_permisos (
    usuario_id UUID    NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    permiso_id INTEGER NOT NULL REFERENCES permisos(id) ON DELETE CASCADE,
    PRIMARY KEY (usuario_id, permiso_id)
);
```

### `grupos`
Equivale a la interfaz `Group` de `grupos.component.ts`.

```sql
CREATE TABLE grupos (
    id         SERIAL PRIMARY KEY,
    nombre     VARCHAR(100) NOT NULL,
    categoria  VARCHAR(50)  NOT NULL, -- Tecnología | Marketing | Ventas | Operaciones
    nivel      VARCHAR(20)  NOT NULL, -- Básico | Intermedio | Avanzado
    autor_id   UUID         NOT NULL REFERENCES usuarios(id),
    created_at TIMESTAMPTZ  NOT NULL DEFAULT now()
);
```

> Nota: los campos `miembros` y `tickets` del componente actual son contadores derivados — se calculan con COUNT() en las queries, no se almacenan.

### `grupo_miembros`
Equivale a `GroupMember` de `ticket.service.ts`.

```sql
CREATE TABLE grupo_miembros (
    id         SERIAL PRIMARY KEY,
    grupo_id   INTEGER NOT NULL REFERENCES grupos(id) ON DELETE CASCADE,
    usuario_id UUID    NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    UNIQUE (grupo_id, usuario_id)
);
```

### `tickets`
Equivale a la interfaz `Ticket` de `ticket.service.ts`.

```sql
CREATE TABLE tickets (
    id              SERIAL PRIMARY KEY,
    titulo          VARCHAR(200) NOT NULL,
    descripcion     TEXT         NOT NULL,
    estado          VARCHAR(20)  NOT NULL DEFAULT 'Pendiente',
        -- Pendiente | En Progreso | Revisión | Finalizado
    prioridad       VARCHAR(10)  NOT NULL DEFAULT 'Media',
        -- Baja | Media | Alta | Crítica
    asignado_a      UUID REFERENCES usuarios(id),
    creador_id      UUID         NOT NULL REFERENCES usuarios(id),
    fecha_creacion  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    fecha_limite    DATE         NOT NULL,
    grupo_id        INTEGER      NOT NULL REFERENCES grupos(id) ON DELETE CASCADE
);
```

### `ticket_comentarios`
Equivale al array `comentarios` dentro de `Ticket`.

```sql
CREATE TABLE ticket_comentarios (
    id         SERIAL PRIMARY KEY,
    ticket_id  INTEGER     NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    autor_id   UUID        NOT NULL REFERENCES usuarios(id),
    texto      TEXT        NOT NULL,
    fecha      TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### `ticket_historial`
Equivale al array `historial` dentro de `Ticket`.

```sql
CREATE TABLE ticket_historial (
    id         SERIAL PRIMARY KEY,
    ticket_id  INTEGER     NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    autor_id   UUID        NOT NULL REFERENCES usuarios(id),
    cambio     TEXT        NOT NULL,
    fecha      TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

## Datos Semilla (Seed)

### Usuarios (3 hardcodeados actuales)
| usuario | email | permisos |
|---|---|---|
| admin | admin@miapp.com | todos (14) |
| usuario | usuario@miapp.com | group:view, ticket:view, ticket:edit_state |
| test | test@miapp.com | group:view, ticket:view |

Las contraseñas se insertan como hash bcrypt de: `Admin@12345`, `User@12345!`, `Test#12345`.

### Grupos (3 actuales)
| nombre | categoria | nivel | autor |
|---|---|---|---|
| Grupo Alpha | Tecnología | Avanzado | admin@miapp.com |
| Grupo Beta | Marketing | Intermedio | usuario@miapp.com |
| Grupo Gamma | Ventas | Básico | test@miapp.com |

### Miembros por grupo
- Grupo Alpha: admin, usuario, test
- Grupo Beta: usuario, test
- Grupo Gamma: test, admin, usuario

### Tickets (4 actuales de Grupo Alpha)
| titulo | estado | prioridad | asignado_a | creador |
|---|---|---|---|---|
| Configurar entorno de staging | En Progreso | Alta | admin | admin |
| Revisar vulnerabilidades de seguridad | Pendiente | Crítica | usuario | admin |
| Optimizar consultas SQL | Revisión | Media | test | usuario |
| Actualizar dependencias de Node.js | Finalizado | Baja | admin | test |

---

## Diagrama de relaciones

```
usuarios ──< usuario_permisos >── permisos
usuarios ──< grupo_miembros >── grupos
usuarios ──< tickets (asignado_a)
usuarios ──< tickets (creador_id)
grupos ──< tickets
tickets ──< ticket_comentarios
tickets ──< ticket_historial
```

---

## Notas de implementación

- El SQL de creación de tablas y seed se entregará como un único archivo `supabase/migrations/001_initial_schema.sql` ejecutable directamente en el SQL Editor de Supabase.
- Los passwords del seed se generarán con bcrypt (costo 10) antes de insertarlos.
- No se activa Row Level Security (RLS) por ahora — será responsabilidad del backend Node.js controlar el acceso.
