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
