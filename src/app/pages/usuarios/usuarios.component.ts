'use strict';
import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { map } from 'rxjs/operators';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { ToastModule } from 'primeng/toast';
import { ToolbarModule } from 'primeng/toolbar';
import { InputTextModule } from 'primeng/inputtext';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { CheckboxModule } from 'primeng/checkbox';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TagModule } from 'primeng/tag';
import { SelectModule } from 'primeng/select';
import { MessageService, ConfirmationService } from 'primeng/api';
import { HasPermissionDirective } from '../../directives/has-permission.directive';
import { AuthService, BackendUser, Permission } from '../../services/auth.service';
import { TicketService, GroupInfo } from '../../services/ticket.service';

@Component({
    selector: 'app-usuarios',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        ButtonModule,
        TableModule,
        DialogModule,
        ToastModule,
        ToolbarModule,
        InputTextModule,
        ToggleSwitchModule,
        ConfirmDialogModule,
        CheckboxModule,
        ProgressSpinnerModule,
        TagModule,
        SelectModule,
        HasPermissionDirective,
    ],
    providers: [MessageService, ConfirmationService],
    templateUrl: './usuarios.component.html',
    styleUrl: './usuarios.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UsuariosComponent implements OnInit {
    usuarios: BackendUser[] = [];
    editForm!: FormGroup;
    createForm!: FormGroup;
    dialogVisible = false;
    isEditMode = false;
    editingUser: BackendUser | null = null;
    loading = true;

    allPermissions: Permission[] = [];
    selectedPermissions: Permission[] = [];
    loadingPermissions = false;

    // Gestión de permisos de grupo
    groupPermsDialogVisible = false;
    selectedGroupPermissions: string[] = [];
    loadingGroupPermissions = false;
    targetUserForGroupPerms: BackendUser | null = null;
    permissionCatalog: { clave: string; descripcion: string }[] = [];
    userGroupsForPerms: { label: string; value: number }[] = [];
    selectedGroupIdForPerms: number | null = null;

    get filteredGroupPermissionCatalog() {
        return this.permissionCatalog.filter(p => p.clave.startsWith('ticket:'));
    }

    grupos: { label: string; value: number }[] = [];

    constructor(
        private fb: FormBuilder,
        private messageService: MessageService,
        private confirmationService: ConfirmationService,
        private authService: AuthService,
        private ticketService: TicketService,
        private cdr: ChangeDetectorRef,
    ) {}

    ngOnInit(): void {
        this.allPermissions = this.authService.getAllAvailablePermissions();
        this.buildForms();
        this.loadUsuarios();
        this.ticketService.getGroups().subscribe((gs) => {
            this.grupos = gs.map((g) => ({ label: g.nombre, value: g.id }));
            this.cdr.markForCheck();
        });
        
        // Cargar catálogo completo desde el backend si está disponible
        this.authService.getPermissionCatalog().subscribe(cat => {
            this.permissionCatalog = cat;
            this.cdr.markForCheck();
        });
    }

    loadUsuarios(): void {
        this.loading = true;
        this.authService.getUsers().subscribe({
            next: (users) => {
                this.usuarios = users;
                this.loading = false;
                this.cdr.markForCheck();
            },
            error: () => {
                this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar los usuarios.' });
                this.loading = false;
                this.cdr.markForCheck();
            },
        });
    }

    buildForms(): void {
        this.createForm = this.fb.group({
            nombre:   ['', [Validators.required, Validators.minLength(2)]],
            apellido: ['', [Validators.required, Validators.minLength(2)]],
            email:    ['', [Validators.required, Validators.email]],
            activo:   [true],
            grupo_id: [null],
        });

        this.editForm = this.fb.group({
            fullName: ['', [Validators.required, Validators.minLength(2)]],
            activo:   [true],
        });
    }

    openNew(): void {
        this.isEditMode = false;
        this.editingUser = null;
        this.selectedPermissions = [];
        this.createForm.reset({ activo: true });
        this.dialogVisible = true;
    }

    editUsuario(usuario: BackendUser): void {
        this.isEditMode = true;
        this.editingUser = usuario;
        this.selectedPermissions = [];
        this.loadingPermissions = true;
        this.editForm.patchValue({ fullName: usuario.fullName, activo: usuario.activo });
        this.dialogVisible = true;

        this.authService.getUserPermissionsFromBackend(usuario.id).subscribe({
            next: (perms) => {
                this.selectedPermissions = perms;
                this.loadingPermissions = false;
                this.cdr.markForCheck();
            },
            error: () => { this.loadingPermissions = false; this.cdr.markForCheck(); },
        });
    }

    saveUsuario(): void {
        if (!this.isEditMode) {
            // Modo crear
            if (this.createForm.invalid) {
                this.createForm.markAllAsTouched();
                this.messageService.add({ severity: 'warn', summary: 'Formulario inválido', detail: 'Completa los campos requeridos.' });
                return;
            }
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
                    this.cdr.markForCheck();
                },
            });
            return;
        }

        // Modo editar
        if (this.editForm.invalid || !this.editingUser) {
            this.editForm.markAllAsTouched();
            return;
        }
        const { fullName, activo } = this.editForm.value;
        const userId = this.editingUser.id;

        this.authService.updateUser(userId, { full_name: fullName, activo }).subscribe();

        this.authService.saveUserPermissions(userId, this.selectedPermissions).subscribe({
            next: () => {
                const idx = this.usuarios.findIndex((u) => u.id === userId);
                if (idx !== -1) {
                    this.usuarios[idx] = { ...this.usuarios[idx], fullName, activo };
                    this.usuarios = [...this.usuarios];
                }
                this.messageService.add({
                    severity: 'success',
                    summary: 'Usuario actualizado',
                    detail: `Permisos globales de "${this.editingUser!.email}" guardados correctamente.`,
                });
                this.dialogVisible = false;
                this.cdr.markForCheck();
            },
            error: () => this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo guardar.' }),
        });
    }

    // ── Gestión de permisos de grupo ─────────────────────────────────────────

    openGroupPermissions(usuario: BackendUser): void {
        // Encontrar a qué grupo pertenece el usuario (esto es simplificado, asumiendo 1 grupo por ahora)
        // O podríamos preguntar al backend a qué grupos pertenece.
        // Para este ERP, el usuario se asigna a un grupo_id en el registro.
        
        this.targetUserForGroupPerms = usuario;
        this.selectedGroupPermissions = [];
        this.loadingGroupPermissions = true;
        this.groupPermsDialogVisible = true;

        // Necesitamos saber qué grupos tiene asignados. Para simplificar, buscamos si tiene un grupoId asociado
        // Nota: El modelo BackendUser actual no tiene grupoId, lo buscaremos en el formulario si es necesario
        // Pero el backend ya tiene los permisos por grupo.
        
        // Vamos a asumir que gestionamos los permisos para el GRUPO PRINCIPAL o que el usuario elige si tiene varios.
        // Pero el requerimiento dice "al grupo que este asignado".
        
        // Para hacerlo bien, primero obtenemos los grupos del usuario actual (el que estamos editando)
        // O simplemente permitimos gestionar para CUALQUIER grupo si el admin quiere, pero lo usual es el suyo.
        
        // Vamos a buscar en los grupos disponibles si el usuario es miembro de alguno.
        // Dado que el componente no tiene los IDs de grupo por usuario cargados, usaremos una estrategia simple:
        // Si el usuario tiene un grupo asignado (lo sabemos por el backend en una consulta extra o si lo añadimos al modelo)
        
        // Realizaremos una consulta para ver en qué grupos está el usuario
        this.ticketService.getGroups().subscribe(allGroups => {
            // Buscamos en qué grupos es miembro este usuario
            const memberShipChecks = allGroups.map(g => 
                this.ticketService.getMembersByGroup(g.id).pipe(
                    map((members: any[]) => ({ groupId: g.id, groupName: g.nombre, isMember: members.some((m: any) => m.userId === usuario.id) }))
                )
            );

            forkJoin(memberShipChecks).subscribe((results: any[]) => {
                this.userGroupsForPerms = results
                    .filter((r: any) => r.isMember)
                    .map((r: any) => ({ label: r.groupName, value: r.groupId }));

                if (this.userGroupsForPerms.length === 0) {
                    this.messageService.add({ severity: 'warn', summary: 'Sin grupo', detail: 'Este usuario no pertenece a ningún grupo.' });
                    this.loadingGroupPermissions = false;
                    this.groupPermsDialogVisible = false;
                } else {
                    // Seleccionar el primero por defecto y cargar sus permisos
                    this.selectedGroupIdForPerms = this.userGroupsForPerms[0].value;
                    this.loadSpecificGroupPermissions();
                }
                this.cdr.markForCheck();
            });
        });
    }

    loadSpecificGroupPermissions(): void {
        if (!this.targetUserForGroupPerms || !this.selectedGroupIdForPerms) return;
        
        this.loadingGroupPermissions = true;
        this.selectedGroupPermissions = [];
        
        this.ticketService.getMemberPermissions(this.selectedGroupIdForPerms, this.targetUserForGroupPerms.id).subscribe(perms => {
            this.selectedGroupPermissions = perms;
            this.loadingGroupPermissions = false;
            this.cdr.markForCheck();
        });
    }

    saveGroupPermissions(): void {
        if (!this.targetUserForGroupPerms || !this.selectedGroupIdForPerms) return;
        
        const userId = this.targetUserForGroupPerms.id;
        const groupId = this.selectedGroupIdForPerms;

        this.ticketService.saveMemberPermissions(groupId, userId, this.selectedGroupPermissions).subscribe(success => {
            if (success) {
                this.messageService.add({ severity: 'success', summary: 'Permisos de Grupo', detail: 'Actualizados correctamente.' });
                this.groupPermsDialogVisible = false; // Cerrar el panel
            } else {
                this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron actualizar.' });
            }
            this.cdr.markForCheck();
        });
    }

    deleteUsuario(usuario: BackendUser): void {
        this.confirmationService.confirm({
            message: `¿Estás seguro de eliminar a "<b>${usuario.fullName}</b>"?`,
            header: 'Confirmar eliminación',
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: 'Sí, eliminar',
            rejectLabel: 'Cancelar',
            acceptButtonStyleClass: 'p-button-danger',
            accept: () => {
                this.authService.deleteUser(usuario.id).subscribe({
                    next: () => {
                        this.usuarios = this.usuarios.filter((u) => u.id !== usuario.id);
                        this.messageService.add({ severity: 'success', summary: 'Usuario eliminado' });
                        this.cdr.markForCheck();
                    },
                    error: () => this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo eliminar.' }),
                });
            },
        });
    }

    permissionLabel(perm: Permission): string {
        const labels: Record<Permission, string> = {
            'group:view':        'Ver grupos',
            'group:edit':        'Editar grupos',
            'group:add':         'Crear grupos',
            'group:delete':      'Eliminar grupos',
            'ticket:view':       'Ver tickets',
            'ticket:edit':       'Editar tickets',
            'ticket:add':        'Crear tickets',
            'ticket:delete':     'Eliminar tickets',
            'ticket:edit_state': 'Cambiar estado de tickets',
            'user:view':         'Ver perfil propio',
            'users:view':        'Ver lista de usuarios',
            'user:add':          'Crear usuarios',
            'user:edit':         'Editar usuarios',
            'user:delete':       'Eliminar usuarios',
        };
        return labels[perm] ?? perm;
    }

    closeDialog(): void {
        this.dialogVisible = false;
    }

    isInvalidCreate(field: string): boolean {
        const ctrl = this.createForm.get(field);
        return !!(ctrl && ctrl.invalid && ctrl.touched);
    }

    isInvalid(field: string): boolean {
        const ctrl = this.editForm.get(field);
        return !!(ctrl && ctrl.invalid && ctrl.touched);
    }
}
