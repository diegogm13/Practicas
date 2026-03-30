-- =============================================================
-- ERP-DGM — Datos semilla
-- Ejecutar DESPUÉS de 001_schema.sql
-- =============================================================

-- -------------------------
-- 1. PERMISOS (14 permisos)
-- -------------------------
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

-- -------------------------
-- 2. USUARIOS
-- Passwords (bcrypt costo 10):
--   admin@miapp.com   → Admin@12345
--   usuario@miapp.com → User@12345!
--   test@miapp.com    → Test#12345
-- -------------------------
INSERT INTO usuarios (id, usuario, email, password_hash, full_name, address, phone, birth_date) VALUES
    (
        'a0000000-0000-0000-0000-000000000001',
        'admin',
        'admin@miapp.com',
        '$2b$10$wGMyK5yGAfa1ebH9n.hsCu5lAIWj2gtavT/jO20J9GHKMOGhWN/Ra',
        'Admin Principal',
        'Calle Principal 1',
        '555-0001',
        '1990-01-01'
    ),
    (
        'a0000000-0000-0000-0000-000000000002',
        'usuario',
        'usuario@miapp.com',
        '$2b$10$jhj2sf.aTmR.ns.EJMElHOZASbot3H/8FnMd9SfWcNHclYY6UlREK',
        'Usuario Estándar',
        'Calle Secundaria 2',
        '555-0002',
        '1995-05-15'
    ),
    (
        'a0000000-0000-0000-0000-000000000003',
        'test',
        'test@miapp.com',
        '$2b$10$26ZS4LgEkgnKXT/4I0KhjOmyf/B4GVkwfeSQdHSsVR82Hmc/5mVze',
        'Test User',
        'Calle de Pruebas 3',
        '555-0003',
        '2000-12-31'
    )
ON CONFLICT (email) DO NOTHING;

-- -------------------------
-- 3. USUARIO_PERMISOS
-- admin → todos (14)
-- usuario → group:view, ticket:view, ticket:edit_state
-- test → group:view, ticket:view
-- -------------------------

-- Admin: todos los permisos
INSERT INTO usuario_permisos (usuario_id, permiso_id)
SELECT 'a0000000-0000-0000-0000-000000000001', id FROM permisos
ON CONFLICT DO NOTHING;

-- Usuario estándar
INSERT INTO usuario_permisos (usuario_id, permiso_id)
SELECT 'a0000000-0000-0000-0000-000000000002', id FROM permisos
WHERE clave IN ('group:view', 'ticket:view', 'ticket:edit_state')
ON CONFLICT DO NOTHING;

-- Test user
INSERT INTO usuario_permisos (usuario_id, permiso_id)
SELECT 'a0000000-0000-0000-0000-000000000003', id FROM permisos
WHERE clave IN ('group:view', 'ticket:view')
ON CONFLICT DO NOTHING;

-- -------------------------
-- 4. GRUPOS
-- -------------------------
INSERT INTO grupos (id, nombre, categoria, nivel, autor_id) VALUES
    (1, 'Grupo Alpha', 'Tecnología', 'Avanzado',   'a0000000-0000-0000-0000-000000000001'),
    (2, 'Grupo Beta',  'Marketing',  'Intermedio',  'a0000000-0000-0000-0000-000000000002'),
    (3, 'Grupo Gamma', 'Ventas',     'Básico',      'a0000000-0000-0000-0000-000000000003')
ON CONFLICT (id) DO NOTHING;

-- Reiniciar secuencia para que los próximos grupos no colisionen
SELECT setval('grupos_id_seq', 3);

-- -------------------------
-- 5. GRUPO_MIEMBROS
-- Alpha: admin, usuario, test
-- Beta: usuario, test
-- Gamma: test, admin, usuario
-- -------------------------
INSERT INTO grupo_miembros (grupo_id, usuario_id) VALUES
    -- Grupo Alpha
    (1, 'a0000000-0000-0000-0000-000000000001'),
    (1, 'a0000000-0000-0000-0000-000000000002'),
    (1, 'a0000000-0000-0000-0000-000000000003'),
    -- Grupo Beta
    (2, 'a0000000-0000-0000-0000-000000000002'),
    (2, 'a0000000-0000-0000-0000-000000000003'),
    -- Grupo Gamma
    (3, 'a0000000-0000-0000-0000-000000000003'),
    (3, 'a0000000-0000-0000-0000-000000000001'),
    (3, 'a0000000-0000-0000-0000-000000000002')
ON CONFLICT DO NOTHING;

-- -------------------------
-- 6. TICKETS (4 del Grupo Alpha)
-- -------------------------
INSERT INTO tickets (id, titulo, descripcion, estado, prioridad, asignado_a, creador_id, fecha_creacion, fecha_limite, grupo_id) VALUES
    (
        1,
        'Configurar entorno de staging',
        'Levantar entorno de staging con Docker Compose para pruebas de integración.',
        'En Progreso', 'Alta',
        'a0000000-0000-0000-0000-000000000001',
        'a0000000-0000-0000-0000-000000000001',
        '2026-02-10', '2026-03-15', 1
    ),
    (
        2,
        'Revisar vulnerabilidades de seguridad',
        'Ejecutar OWASP ZAP y corregir hallazgos críticos.',
        'Pendiente', 'Crítica',
        'a0000000-0000-0000-0000-000000000002',
        'a0000000-0000-0000-0000-000000000001',
        '2026-02-15', '2026-03-10', 1
    ),
    (
        3,
        'Optimizar consultas SQL del módulo de reportes',
        'Varias consultas superan los 3 segundos en producción.',
        'Revisión', 'Media',
        'a0000000-0000-0000-0000-000000000003',
        'a0000000-0000-0000-0000-000000000002',
        '2026-02-18', '2026-03-20', 1
    ),
    (
        4,
        'Actualizar dependencias de Node.js',
        'Migrar a Node 22 LTS y actualizar paquetes desactualizados.',
        'Finalizado', 'Baja',
        'a0000000-0000-0000-0000-000000000001',
        'a0000000-0000-0000-0000-000000000003',
        '2026-01-20', '2026-02-28', 1
    )
ON CONFLICT (id) DO NOTHING;

SELECT setval('tickets_id_seq', 4);

-- -------------------------
-- 7. TICKET_COMENTARIOS
-- -------------------------
INSERT INTO ticket_comentarios (ticket_id, autor_id, texto, fecha) VALUES
    (
        1,
        'a0000000-0000-0000-0000-000000000001',
        'Iniciando configuración de Docker.',
        '2026-02-11'
    )
ON CONFLICT DO NOTHING;

-- -------------------------
-- 8. TICKET_HISTORIAL
-- -------------------------
INSERT INTO ticket_historial (ticket_id, autor_id, cambio, fecha) VALUES
    (1, 'a0000000-0000-0000-0000-000000000001', 'Ticket creado',                    '2026-02-10'),
    (1, 'a0000000-0000-0000-0000-000000000001', 'Estado cambiado a En Progreso',    '2026-02-12'),
    (2, 'a0000000-0000-0000-0000-000000000001', 'Ticket creado',                    '2026-02-15'),
    (3, 'a0000000-0000-0000-0000-000000000002', 'Ticket creado',                    '2026-02-18'),
    (4, 'a0000000-0000-0000-0000-000000000003', 'Ticket creado',                    '2026-01-20')
ON CONFLICT DO NOTHING;
