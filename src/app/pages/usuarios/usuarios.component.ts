import { Component, OnInit } from '@angular/core';
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
import { MessageService, ConfirmationService } from 'primeng/api';
import { HasPermissionDirective } from '../../directives/has-permission.directive';
import { AuthService, Permission } from '../../services/auth.service';

export interface Usuario {
    id: number;
    nombre: string;
    apellido: string;
    correo: string;
    activo: boolean;
}

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
        HasPermissionDirective,
    ],
    providers: [MessageService, ConfirmationService],
    templateUrl: './usuarios.component.html',
    styleUrl: './usuarios.component.css',
})
export class UsuariosComponent implements OnInit {
    usuarios: Usuario[] = [];
    usuarioForm!: FormGroup;
    dialogVisible = false;
    isEditMode = false;
    editingId: number | null = null;
    private nextId = 5;

    allPermissions: Permission[] = [];
    selectedPermissions: Permission[] = [];

    constructor(
        private fb: FormBuilder,
        private messageService: MessageService,
        private confirmationService: ConfirmationService,
        private authService: AuthService,
    ) {}

    ngOnInit(): void {
        this.allPermissions = this.authService.getAllAvailablePermissions();
        this.usuarios = [
            { id: 1, nombre: 'Carlos', apellido: 'Ramírez', correo: 'admin@miapp.com', activo: true },
            { id: 2, nombre: 'Laura', apellido: 'Mendoza', correo: 'usuario@miapp.com', activo: true },
            { id: 3, nombre: 'Pedro', apellido: 'Soto', correo: 'test@miapp.com', activo: false },
        ];
        this.buildForm();
    }

    buildForm(): void {
        this.usuarioForm = this.fb.group({
            nombre: ['', [Validators.required, Validators.minLength(2)]],
            apellido: ['', [Validators.required, Validators.minLength(2)]],
            correo: ['', [Validators.required, Validators.email]],
            activo: [true],
        });
    }

    openNew(): void {
        this.isEditMode = false;
        this.editingId = null;
        this.selectedPermissions = [];
        this.usuarioForm.reset({ activo: true });
        this.dialogVisible = true;
    }

    editUsuario(usuario: Usuario): void {
        this.isEditMode = true;
        this.editingId = usuario.id;
        this.selectedPermissions = this.authService.getUserPermissions(usuario.correo);
        this.usuarioForm.patchValue({
            nombre: usuario.nombre,
            apellido: usuario.apellido,
            correo: usuario.correo,
            activo: usuario.activo,
        });
        this.dialogVisible = true;
    }

    saveUsuario(): void {
        if (this.usuarioForm.invalid) {
            this.usuarioForm.markAllAsTouched();
            return;
        }

        const formValue = this.usuarioForm.value;
        const email = formValue.correo;

        if (this.isEditMode && this.editingId !== null) {
            const idx = this.usuarios.findIndex((u) => u.id === this.editingId);
            if (idx !== -1) {
                this.usuarios[idx] = { id: this.editingId, ...formValue };
                this.usuarios = [...this.usuarios];
            }
        } else {
            const newUsuario: Usuario = { id: this.nextId++, ...formValue };
            this.usuarios = [...this.usuarios, newUsuario];
        }

        this.authService.setUserPermissions(email, this.selectedPermissions);
        this.messageService.add({
            severity: 'success',
            summary: this.isEditMode ? 'Usuario actualizado' : 'Usuario creado',
            detail: 'Los permisos granulares han sido aplicados correctamente.',
        });
        this.dialogVisible = false;
    }

    deleteUsuario(usuario: Usuario): void {
        this.confirmationService.confirm({
            message: `¿Estás seguro de eliminar al usuario "<b>${usuario.nombre} ${usuario.apellido}</b>"?`,
            header: 'Confirmar eliminación',
            icon: 'pi pi-exclamation-triangle',
            accept: () => {
                this.usuarios = this.usuarios.filter((u) => u.id !== usuario.id);
                this.messageService.add({ severity: 'success', summary: 'Usuario eliminado' });
            },
        });
    }

    getPermissionsDescription(email: string): string {
        const perms = this.authService.getUserPermissions(email);
        if (perms.length === 0) return 'Sin permisos';
        if (perms.length === this.allPermissions.length) return 'SuperAdmin (Todos)';
        return `${perms.length} permisos asignados`;
    }

    closeDialog(): void {
        this.dialogVisible = false;
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

    isInvalid(field: string): boolean {
        const ctrl = this.usuarioForm.get(field);
        return !!(ctrl && ctrl.invalid && ctrl.touched);
    }
}
