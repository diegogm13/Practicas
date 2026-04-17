# User/Group/Permissions Feature Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Agregar creación de usuarios (POST /users), formulario de grupos con autor+miembros, control de visibilidad por permisos en dashboard y sidebar con "Mis Grupos" + "Mis Tickets".

**Architecture:** Opción A — `POST /users` en user-service existente. El frontend une nombre+apellido en full_name. Los miembros del grupo se gestionan con los endpoints `/groups/:id/members` ya existentes.

**Tech Stack:** Fastify + Supabase (backend), Angular 17 + PrimeNG (frontend)

---

## Archivos a modificar

**Backend:**
- `backend/shared/schemas/user.schemas.js` — añadir `createUserBody`
- `backend/shared/schemas/group.schemas.js` — añadir `autor_email` opcional a `createGroupBody`
- `backend/user-service/src/routes/users.routes.js` — añadir `POST /`
- `backend/group-service/src/routes/groups.routes.js` — manejar `autor_email` en POST

**Frontend:**
- `erp-dgm/src/app/services/auth.service.ts` — añadir `createUser()`
- `erp-dgm/src/app/services/ticket.service.ts` — añadir `addMember()`, `removeMember()`
- `erp-dgm/src/app/pages/usuarios/usuarios.component.ts` — modo crear + form con nombre/apellido/correo/grupo/estado
- `erp-dgm/src/app/pages/usuarios/usuarios.component.html` — botón Nuevo + form actualizado
- `erp-dgm/src/app/pages/grupos/grupos.component.ts` — autor auto-fill + miembros MultiSelect
- `erp-dgm/src/app/pages/grupos/grupos.component.html` — campos autor + miembros
- `erp-dgm/src/app/pages/dashboard/dashboard.component.html` — gates por permiso
- `erp-dgm/src/app/pages/dashboard/dashboard.component.ts` — exponer hasPermission
- `erp-dgm/src/app/layout/main-layout/main-layout.component.ts` — cargar grupos del usuario, añadir Mis Tickets
- `erp-dgm/src/app/layout/main-layout/main-layout.component.html` — sección Mis Grupos + btn Mis Tickets

---

### Task 1: Backend — createUserBody schema

**Files:** Modify `backend/shared/schemas/user.schemas.js`

- [ ] Añadir `createUserBody` al final del archivo y exportarlo

```js
const createUserBody = {
    $schema: 'http://json-schema.org/draft-07/schema#',
    title: 'CreateUserBody',
    type: 'object',
    required: ['nombre', 'apellido', 'email'],
    properties: {
        nombre:   { type: 'string', minLength: 2, maxLength: 80 },
        apellido: { type: 'string', minLength: 2, maxLength: 80 },
        email:    { type: 'string', format: 'email' },
        activo:   { type: 'boolean' },
        grupo_id: { type: 'integer' },
    },
    additionalProperties: false,
}
// en module.exports: añadir createUserBody
```

---

### Task 2: Backend — POST /users endpoint

**Files:** Modify `backend/user-service/src/routes/users.routes.js`

- [ ] Importar `createUserBody` en el require de schemas
- [ ] Añadir ruta `POST /` con permiso `user:add`

```js
fastify.post('/', {
    schema: { body: createUserBody },
}, async (request, reply) => {
    if (!request.user.permissions.includes('user:add')) {
        return reply.code(403).send(fail('Sin permiso', 'US', 403))
    }
    const bcrypt = require('bcryptjs')
    const { nombre, apellido, email, activo = true, grupo_id } = request.body
    const full_name = `${nombre} ${apellido}`

    const { data: exists } = await supabase.from('usuarios').select('id').eq('email', email).maybeSingle()
    if (exists) return reply.code(409).send(fail('Email ya registrado', 'US', 409))

    // Auto-generate unique usuario from email prefix
    const base = email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '_')
    let usuario = base, suffix = 1
    while (true) {
        const { data: taken } = await supabase.from('usuarios').select('id').eq('usuario', usuario).maybeSingle()
        if (!taken) break
        usuario = `${base}${suffix++}`
    }

    const password_hash = await bcrypt.hash('Temp@12345', 10)
    const { data: newUser, error } = await supabase
        .from('usuarios')
        .insert({ usuario, email, password_hash, full_name, activo })
        .select('id, usuario, email, full_name, activo')
        .single()
    if (error) return reply.code(500).send(fail('Error al crear usuario', 'US', 500))

    const { data: defaultPerms } = await supabase.from('permisos').select('id').in('clave', ['group:view', 'ticket:view'])
    if (defaultPerms?.length > 0) {
        await supabase.from('usuario_permisos').insert(
            defaultPerms.map((p) => ({ usuario_id: newUser.id, permiso_id: p.id }))
        )
    }

    if (grupo_id) {
        await supabase.from('grupo_miembros').insert({ grupo_id: Number(grupo_id), usuario_id: newUser.id })
    }

    return reply.code(201).send(ok(
        { ...newUser },
        'US', 201,
        'Usuario creado. Contraseña temporal: Temp@12345'
    ))
})
```

---

### Task 3: Backend — autor_email en createGroupBody

**Files:** Modify `backend/shared/schemas/group.schemas.js`

- [ ] Añadir `autor_email` como propiedad opcional en `createGroupBody`

```js
const createGroupBody = {
    ...existing,
    properties: {
        nombre:      { type: 'string', minLength: 2, maxLength: 100 },
        categoria:   { type: 'string', enum: ['Tecnología', 'Marketing', 'Ventas', 'Operaciones'] },
        nivel:       { type: 'string', enum: ['Básico', 'Intermedio', 'Avanzado'] },
        autor_email: { type: 'string', format: 'email' },
    },
    // additionalProperties: false se mantiene
}
```

---

### Task 4: Backend — grupos.routes.js maneja autor_email

**Files:** Modify `backend/group-service/src/routes/groups.routes.js`

- [ ] En `POST /` y `PUT /:id`, extraer `autor_email` del body y resolver UUID si el usuario tiene `users:view`

POST:
```js
const { nombre, categoria, nivel, autor_email } = request.body
let autor_id = request.user.userId
if (autor_email && request.user.permissions.includes('users:view')) {
    const { data: u } = await supabase.from('usuarios').select('id').eq('email', autor_email).maybeSingle()
    if (u) autor_id = u.id
}
// usar autor_id en el insert
```

---

### Task 5: Frontend — AuthService.createUser()

**Files:** Modify `erp-dgm/src/app/services/auth.service.ts`

- [ ] Añadir método `createUser()` junto a los otros métodos HTTP

```typescript
createUser(data: {
    nombre: string;
    apellido: string;
    email: string;
    activo: boolean;
    grupo_id?: number | null;
}): Observable<{ success: boolean; message: string; id?: string }> {
    const body: any = {
        nombre: data.nombre,
        apellido: data.apellido,
        email: data.email,
        activo: data.activo,
    };
    if (data.grupo_id) body.grupo_id = data.grupo_id;
    return this.http.post<any>(`${API}/users`, body, this.authHeaders()).pipe(
        map((res) => ({ success: true, message: res.message ?? 'Usuario creado', id: res.data?.id })),
        catchError((err) => of({ success: false, message: err.error?.message ?? 'Error al crear usuario.' }))
    );
}
```

---

### Task 6: Frontend — TicketService addMember/removeMember

**Files:** Modify `erp-dgm/src/app/services/ticket.service.ts`

- [ ] Añadir `addMember()` y `removeMember()` antes del bloque de Stats

```typescript
addMember(grupoId: number, usuarioId: string): Observable<boolean> {
    return this.http
        .post<any>(`${API}/groups/${grupoId}/members`, { usuario_id: usuarioId }, this.options())
        .pipe(map(() => true), catchError(() => of(false)));
}

removeMember(grupoId: number, usuarioId: string): Observable<boolean> {
    return this.http
        .delete(`${API}/groups/${grupoId}/members/${usuarioId}`, this.options())
        .pipe(map(() => true), catchError(() => of(false)));
}
```

---

### Task 7: Frontend — UsuariosComponent (crear usuario)

**Files:** Modify `erp-dgm/src/app/pages/usuarios/usuarios.component.ts` y `.html`

- [ ] Añadir `SelectModule`, `MultiSelectModule` a imports del componente
- [ ] Añadir propiedad `grupos: GroupInfo[]` y `createForm: FormGroup`
- [ ] En `ngOnInit`, cargar grupos con `ticketService.getGroups()`
- [ ] `openNew()` reinicia `createForm` y abre dialog en modo crear
- [ ] `saveUsuario()` bifurca: si modo crear llama `authService.createUser()`, si editar como ahora
- [ ] Inyectar `TicketService`

TS key additions:
```typescript
import { TicketService, GroupInfo } from '../../services/ticket.service';

// properties
createForm!: FormGroup;
grupos: { label: string; value: number }[] = [];

// in constructor add: private ticketService: TicketService

// in ngOnInit add:
this.ticketService.getGroups().subscribe(gs => {
    this.grupos = gs.map(g => ({ label: g.nombre, value: g.id }));
});
this.buildCreateForm();

buildCreateForm(): void {
    this.createForm = this.fb.group({
        nombre:   ['', [Validators.required, Validators.minLength(2)]],
        apellido: ['', [Validators.required, Validators.minLength(2)]],
        email:    ['', [Validators.required, Validators.email]],
        activo:   [true],
        grupo_id: [null],
    });
}

openNew(): void {
    this.isEditMode = false;
    this.editingUser = null;
    this.createForm.reset({ activo: true });
    this.dialogVisible = true;
}

// saveUsuario() bifurcado:
saveUsuario(): void {
    if (!this.isEditMode) {
        if (this.createForm.invalid) { this.createForm.markAllAsTouched(); return; }
        const v = this.createForm.value;
        this.authService.createUser(v).subscribe({
            next: (res) => {
                if (res.success) {
                    this.messageService.add({ severity: 'success', summary: 'Usuario creado', detail: res.message });
                    this.dialogVisible = false;
                    this.loadUsuarios();
                } else {
                    this.messageService.add({ severity: 'error', summary: 'Error', detail: res.message });
                }
            },
        });
        return;
    }
    // modo editar (código existente)
    ...
}
```

---

### Task 8: Frontend — UsuariosComponent HTML (toolbar + crear form)

**Files:** Modify `erp-dgm/src/app/pages/usuarios/usuarios.component.html`

- [ ] Añadir botón "Nuevo Usuario" en toolbar con `*hasPermission="'user:add'"`
- [ ] El dialog existente (editar/permisos) se mantiene para `isEditMode = true`
- [ ] Añadir un segundo dialog para crear (o usar el mismo con `@if (!isEditMode)`)

En toolbar:
```html
<ng-template pTemplate="start">
    <p-button
        *hasPermission="'user:add'"
        label="Nuevo Usuario"
        icon="pi pi-user-plus"
        (onClick)="openNew()"
    ></p-button>
</ng-template>
```

En dialog, usar `@if (!isEditMode)` para el form de crear y `@if (isEditMode)` para el de editar/permisos.

---

### Task 9: Frontend — GruposComponent (autor + miembros)

**Files:** Modify `erp-dgm/src/app/pages/grupos/grupos.component.ts`

- [ ] Añadir `MultiSelectModule` a imports
- [ ] Añadir propiedades: `autorEmail: string`, `availableUsers: { label: string; value: string }[]`, `selectedMembers: string[]`, `currentMemberIds: string[]`
- [ ] En `buildForm()` añadir control `autor_email` y `miembros` (array)
- [ ] En `openNew()` pre-llenar `autor_email` con email del usuario actual; limpiar `selectedMembers`
- [ ] En `editGroup()` cargar miembros actuales del grupo vía `ticketService.getMembersByGroup()`
- [ ] En `ngOnInit` cargar lista de usuarios con `authService.getUsers()`
- [ ] En `saveGroup()`: enviar `autor_email`, luego sincronizar miembros (add/remove diff)

Key additions:
```typescript
import { MultiSelectModule } from 'primeng/multiselect';

availableUsers: { label: string; value: string }[] = [];
selectedMembers: string[] = [];
currentMemberIds: string[] = [];

// ngOnInit
this.authService.getUsers().subscribe(users => {
    this.availableUsers = users.map(u => ({ label: `${u.fullName} (${u.email})`, value: u.id }));
});

// buildForm()
this.groupForm = this.fb.group({
    nombre:      ['', [Validators.required, Validators.minLength(3)]],
    categoria:   ['', Validators.required],
    nivel:       ['', Validators.required],
    autor_email: ['', [Validators.required, Validators.email]],
});

// openNew()
this.selectedMembers = [];
this.currentMemberIds = [];
this.groupForm.patchValue({ autor_email: this.authService.getCurrentUser() });

// editGroup()
this.ticketService.getMembersByGroup(group.id).subscribe(members => {
    this.currentMemberIds = members.map(m => m.id.toString()); // need userId
    this.selectedMembers = [...this.currentMemberIds];
    this.cdr.detectChanges();
});

// saveGroup() - sync members after create/update
private syncMembers(grupoId: number, newIds: string[]): void {
    const toAdd = newIds.filter(id => !this.currentMemberIds.includes(id));
    const toRemove = this.currentMemberIds.filter(id => !newIds.includes(id));
    toAdd.forEach(id => this.ticketService.addMember(grupoId, id).subscribe());
    toRemove.forEach(id => this.ticketService.removeMember(grupoId, id).subscribe());
}
```

Note: `GroupMember` tiene campo `id` que es el id de la relación. Necesito el `usuario_id`. Voy a actualizar `getMembersByGroup` adapter para exponer `userId`.

---

### Task 10: Frontend — GruposComponent HTML (autor + miembros)

**Files:** Modify `erp-dgm/src/app/pages/grupos/grupos.component.html`

- [ ] Añadir campo Autor después de Nivel
- [ ] Añadir campo Miembros con `p-multiselect`

```html
<!-- Autor -->
<div class="field">
    <label for="autor_email">Autor <span class="required">*</span></label>
    <input id="autor_email" type="text" pInputText formControlName="autor_email"
           placeholder="correo@ejemplo.com"
           [class.ng-invalid]="isInvalid('autor_email')" />
    @if (isInvalid('autor_email')) {
        <small class="p-error">El correo del autor es requerido.</small>
    }
</div>

<!-- Miembros -->
<div class="field">
    <label>Miembros</label>
    <p-multiselect
        [options]="availableUsers"
        [(ngModel)]="selectedMembers"
        [ngModelOptions]="{standalone: true}"
        placeholder="Selecciona miembros"
        optionLabel="label"
        optionValue="value"
        styleClass="w-full"
        [filter]="true"
        filterPlaceholder="Buscar usuario..."
    ></p-multiselect>
</div>
```

---

### Task 11: Frontend — Dashboard permission gates

**Files:** Modify `erp-dgm/src/app/pages/dashboard/dashboard.component.ts` y `.html`

TS: exponer `hasPermission`:
```typescript
hasPermission(p: string): boolean { return this.authService.hasPermission(p); }
```

HTML — envolver secciones:
- `stats-grid`: `@if (isLoggedIn && !loading && hasPermission('ticket:view'))`
- `chart-card`: `@if (hasPermission('ticket:view'))`
- Card "Grupos" quick access: `@if (hasPermission('group:view'))`
- Card "Usuarios" quick access: `@if (hasPermission('users:view'))`
- Sección "Mis Grupos": `@if (hasPermission('group:view'))`
- Sección "Mis Tickets": `@if (hasPermission('ticket:view'))`

---

### Task 12: Frontend — MainLayout sidebar (Mis Grupos + Mis Tickets)

**Files:** Modify `erp-dgm/src/app/layout/main-layout/main-layout.component.ts`

- [ ] Inyectar `TicketService`
- [ ] Añadir propiedad `userGroups: GroupInfo[] = []`
- [ ] Cargar grupos del usuario en `ngOnInit` y tras cada NavigationEnd cuando `isLoggedIn`
- [ ] Añadir "Mis Tickets" al menu con `visible: hasPermission('ticket:view')`

```typescript
import { TicketService, GroupInfo } from '../../services/ticket.service';

userGroups: GroupInfo[] = [];

// en constructor añadir private ticketService: TicketService

// cargar grupos:
private loadUserGroups(): void {
    if (!this.authService.isLoggedIn()) { this.userGroups = []; return; }
    this.ticketService.getGroups().subscribe(gs => { this.userGroups = gs; });
}

// buildMenu() — añadir item Mis Tickets:
{
    label: 'Mis Tickets',
    icon: 'pi pi-ticket',
    routerLink: '/dashboard',
    fragment: 'mis-tickets',
    styleClass: url === '/dashboard' ? 'menu-active-item' : '',
    visible: this.authService.hasPermission('ticket:view'),
},
```

---

### Task 13: Frontend — MainLayout HTML (sección Mis Grupos sidebar)

**Files:** Modify `erp-dgm/src/app/layout/main-layout/main-layout.component.html`

- [ ] Añadir sección "Mis Grupos" entre `sidebar-menu` y `sidebar-footer`, visible solo si `isLoggedIn` y `authService.hasPermission('group:view')` y `userGroups.length > 0`

```html
@if (isLoggedIn && authService.hasPermission('group:view') && userGroups.length > 0) {
<div class="sidebar-groups">
    <p class="sidebar-groups-title">
        <i class="pi pi-users"></i> Mis Grupos
    </p>
    @for (g of userGroups; track g.id) {
        <a class="sidebar-group-item" [routerLink]="['/dashboard/tickets', g.id]">
            <i class="pi pi-angle-right"></i>
            <span>{{ g.nombre }}</span>
        </a>
    }
</div>
}
```

---

### Task 14: CSS sidebar grupos

**Files:** Modify `erp-dgm/src/app/layout/main-layout/main-layout.component.css`

- [ ] Añadir estilos para `.sidebar-groups`, `.sidebar-groups-title`, `.sidebar-group-item`

```css
.sidebar-groups {
    padding: 0.5rem 1rem;
    border-top: 1px solid var(--p-surface-200, #e5e7eb);
    margin-top: 0.5rem;
}
.sidebar-groups-title {
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--p-text-muted-color, #6b7280);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin: 0.25rem 0 0.5rem;
    display: flex;
    align-items: center;
    gap: 0.4rem;
}
.sidebar-group-item {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.35rem 0.5rem;
    border-radius: 6px;
    color: var(--p-text-color, #374151);
    text-decoration: none;
    font-size: 0.85rem;
    transition: background 0.15s;
    cursor: pointer;
}
.sidebar-group-item:hover {
    background: var(--p-surface-100, #f3f4f6);
}
```
