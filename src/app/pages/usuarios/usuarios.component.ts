'use strict';
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
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
import { MessageService, ConfirmationService } from 'primeng/api';
import { HasPermissionDirective } from '../../directives/has-permission.directive';
import { AuthService, BackendUser, Permission } from '../../services/auth.service';

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
        HasPermissionDirective,
    ],
    providers: [MessageService, ConfirmationService],
    templateUrl: './usuarios.component.html',
    styleUrl: './usuarios.component.css',
})
export class UsuariosComponent implements OnInit {
    usuarios: BackendUser[] = [];
    usuarioForm!: FormGroup;
    dialogVisible = false;
    isEditMode = false;
    editingUser: BackendUser | null = null;
    loading = true;

    allPermissions: Permission[] = [];
    selectedPermissions: Permission[] = [];
    loadingPermissions = false;

    constructor(
        private fb: FormBuilder,
        private messageService: MessageService,
        private confirmationService: ConfirmationService,
        private authService: AuthService,
        private cdr: ChangeDetectorRef,
    ) {}

    ngOnInit(): void {
        this.allPermissions = this.authService.getAllAvailablePermissions();
        this.buildForm();
        this.loadUsuarios();
    }

    loadUsuarios(): void {
        this.loading = true;
        this.authService.getUsers().subscribe({
            next: (users) => {
                this.usuarios = users;
                this.loading = false;
                this.cdr.detectChanges();
            },
            error: () => {
                this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar los usuarios.' });
                this.loading = false;
                this.cdr.detectChanges();
            },
        });
    }

    buildForm(): void {
        this.usuarioForm = this.fb.group({
            fullName: ['', [Validators.required, Validators.minLength(2)]],
            activo: [true],
        });
    }

    openNew(): void {
        this.isEditMode = false;
        this.editingUser = null;
        this.selectedPermissions = [];
        this.usuarioForm.reset({ activo: true });
        this.dialogVisible = true;
    }

    editUsuario(usuario: BackendUser): void {
        this.isEditMode = true;
        this.editingUser = usuario;
        this.selectedPermissions = [];
        this.loadingPermissions = true;
        this.usuarioForm.patchValue({ fullName: usuario.fullName, activo: usuario.activo });
        this.dialogVisible = true;

        this.authService.getUserPermissionsFromBackend(usuario.id).subscribe({
            next: (perms) => {
                this.selectedPermissions = perms;
                this.loadingPermissions = false;
                this.cdr.detectChanges();
            },
            error: () => { this.loadingPermissions = false; this.cdr.detectChanges(); },
        });
    }

    saveUsuario(): void {
        if (this.usuarioForm.invalid) {
            this.usuarioForm.markAllAsTouched();
            return;
        }

        if (!this.editingUser) return;

        const { fullName, activo } = this.usuarioForm.value;
        const userId = this.editingUser.id;

        // Actualizar datos del usuario
        this.authService.updateUser(userId, { full_name: fullName, activo }).subscribe();

        // Guardar permisos (también actualiza localStorage si es el usuario actual)
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
                    detail: `Permisos de "${this.editingUser!.email}" guardados correctamente.`,
                });
                this.dialogVisible = false;
                this.cdr.detectChanges();
            },
            error: () => this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo guardar.' }),
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
                        this.cdr.detectChanges();
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

    getPermissionsDescription(usuario: BackendUser): string {
        // Aproximación: se muestra en la tabla pero la fuente real es el backend
        return '—';
    }

    closeDialog(): void {
        this.dialogVisible = false;
    }

    isInvalid(field: string): boolean {
        const ctrl = this.usuarioForm.get(field);
        return !!(ctrl && ctrl.invalid && ctrl.touched);
    }
}
