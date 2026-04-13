-- =============================================================
-- ERP-DGM — Esquema inicial
-- Ejecutar en Supabase SQL Editor
-- =============================================================

-- -------------------------
-- 1. USUARIOS
-- -------------------------
CREATE TABLE IF NOT EXISTS usuarios (
    id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
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

-- -------------------------
-- 2. PERMISOS (catálogo)
-- -------------------------
CREATE TABLE IF NOT EXISTS permisos (
    id          SERIAL      PRIMARY KEY,
    clave       VARCHAR(50) NOT NULL UNIQUE,
    descripcion TEXT
);

-- -------------------------
-- 3. USUARIO_PERMISOS (M:N)
-- -------------------------
CREATE TABLE IF NOT EXISTS usuario_permisos (
    usuario_id UUID    NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    permiso_id INTEGER NOT NULL REFERENCES permisos(id) ON DELETE CASCADE,
    PRIMARY KEY (usuario_id, permiso_id)
);

-- -------------------------
-- 4. GRUPOS
-- -------------------------
CREATE TABLE IF NOT EXISTS grupos (
    id         SERIAL       PRIMARY KEY,
    nombre     VARCHAR(100) NOT NULL,
    categoria  VARCHAR(50)  NOT NULL,  -- Tecnología | Marketing | Ventas | Operaciones
    nivel      VARCHAR(20)  NOT NULL,  -- Básico | Intermedio | Avanzado
    autor_id   UUID         NOT NULL REFERENCES usuarios(id),
    created_at TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- -------------------------
-- 5. GRUPO_MIEMBROS
-- -------------------------
CREATE TABLE IF NOT EXISTS grupo_miembros (
    id         SERIAL  PRIMARY KEY,
    grupo_id   INTEGER NOT NULL REFERENCES grupos(id) ON DELETE CASCADE,
    usuario_id UUID    NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    UNIQUE (grupo_id, usuario_id)
);

-- -------------------------
-- 6. TICKET_ESTADOS (catálogo)
-- -------------------------
CREATE TABLE IF NOT EXISTS ticket_estados (
    id     SERIAL      PRIMARY KEY,
    nombre VARCHAR(30) NOT NULL UNIQUE
);

-- -------------------------
-- 7. TICKETS
-- -------------------------
CREATE TABLE IF NOT EXISTS tickets (
    id             SERIAL       PRIMARY KEY,
    titulo         VARCHAR(200) NOT NULL,
    descripcion    TEXT         NOT NULL,
    estado_id      INTEGER      NOT NULL REFERENCES ticket_estados(id) DEFAULT 1,
    prioridad      VARCHAR(10)  NOT NULL DEFAULT 'Media',  -- Baja | Media | Alta | Crítica
    asignado_a     UUID         REFERENCES usuarios(id),
    creador_id     UUID         NOT NULL REFERENCES usuarios(id),
    fecha_creacion TIMESTAMPTZ  NOT NULL DEFAULT now(),
    fecha_limite   DATE         NOT NULL,
    grupo_id       INTEGER      NOT NULL REFERENCES grupos(id) ON DELETE CASCADE
);

-- -------------------------
-- 8. TICKET_COMENTARIOS
-- -------------------------
CREATE TABLE IF NOT EXISTS ticket_comentarios (
    id        SERIAL      PRIMARY KEY,
    ticket_id INTEGER     NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    autor_id  UUID        NOT NULL REFERENCES usuarios(id),
    texto     TEXT        NOT NULL,
    fecha     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -------------------------
-- 9. TICKET_HISTORIAL
-- -------------------------
CREATE TABLE IF NOT EXISTS ticket_historial (
    id        SERIAL      PRIMARY KEY,
    ticket_id INTEGER     NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    autor_id  UUID        NOT NULL REFERENCES usuarios(id),
    cambio    TEXT        NOT NULL,
    fecha     TIMESTAMPTZ NOT NULL DEFAULT now()
);
