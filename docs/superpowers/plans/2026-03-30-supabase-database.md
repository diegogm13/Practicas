# Supabase Database Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Crear el esquema completo de la BD ERP-DGM en Supabase con todos los datos semilla del proyecto actual.

**Architecture:** Dos archivos SQL ejecutables en el SQL Editor de Supabase — uno para el esquema (tablas + FK) y otro para el seed (datos iniciales con bcrypt). Sin Supabase Auth, sin RLS.

**Tech Stack:** PostgreSQL (Supabase), bcryptjs para hashes de contraseñas.

---

### Task 1: Esquema de tablas

**Files:**
- Create: `supabase/migrations/001_schema.sql`

- [ ] Crear el archivo con el DDL completo

- [ ] Verificar en Supabase: pegar en SQL Editor → Run → sin errores

- [ ] Commit
```bash
git add supabase/migrations/001_schema.sql
git commit -m "feat: add supabase initial schema"
```

---

### Task 2: Datos semilla

**Files:**
- Create: `supabase/migrations/002_seed.sql`

- [ ] Crear el archivo con todos los INSERT (usuarios, permisos, grupos, miembros, tickets, comentarios, historial)

- [ ] Verificar en Supabase: pegar en SQL Editor → Run → sin errores

- [ ] Commit
```bash
git add supabase/migrations/002_seed.sql
git commit -m "feat: add supabase seed data"
```
