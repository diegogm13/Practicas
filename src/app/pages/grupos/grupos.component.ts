import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { ToastModule } from 'primeng/toast';
import { ToolbarModule } from 'primeng/toolbar';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService, ConfirmationService } from 'primeng/api';
import { HasPermissionDirective } from '../../directives/has-permission.directive';
import { AuthService } from '../../services/auth.service';

export interface Group {
    id: number;
    nombre: string;
    categoria: string;
    nivel: string;
    autor: string;
    miembros: number;
    tickets: number;
}

@Component({
    selector: 'app-grupos',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        ButtonModule,
        TableModule,
        DialogModule,
        ToastModule,
        ToolbarModule,
        InputTextModule,
        InputNumberModule,
        SelectModule,
        ConfirmDialogModule,
        TooltipModule,
        HasPermissionDirective,
    ],
    providers: [MessageService, ConfirmationService],
    templateUrl: './grupos.component.html',
    styleUrl: './grupos.component.css',
})
export class GruposComponent implements OnInit {
    groups: Group[] = [];
    groupForm!: FormGroup;
    dialogVisible = false;
    isEditMode = false;
    editingId: number | null = null;
    private nextId = 4;

    categorias = [
        { label: 'Tecnología', value: 'Tecnología' },
        { label: 'Marketing', value: 'Marketing' },
        { label: 'Ventas', value: 'Ventas' },
        { label: 'Operaciones', value: 'Operaciones' },
    ];

    niveles = [
        { label: 'Básico', value: 'Básico' },
        { label: 'Intermedio', value: 'Intermedio' },
        { label: 'Avanzado', value: 'Avanzado' },
    ];

    constructor(
        private fb: FormBuilder,
        private messageService: MessageService,
        private confirmationService: ConfirmationService,
        private router: Router,
        private authService: AuthService,
    ) {}

    verTickets(group: Group): void {
        this.router.navigate(['/dashboard/tickets', group.id]);
    }

    ngOnInit(): void {
        const allGroups: Group[] = [
            {
                id: 1,
                nombre: 'Grupo Alpha',
                categoria: 'Tecnología',
                nivel: 'Avanzado',
                autor: 'admin@miapp.com',
                miembros: 12,
                tickets: 5,
            },
            {
                id: 2,
                nombre: 'Grupo Beta',
                categoria: 'Marketing',
                nivel: 'Intermedio',
                autor: 'usuario@miapp.com',
                miembros: 8,
                tickets: 2,
            },
            {
                id: 3,
                nombre: 'Grupo Gamma',
                categoria: 'Ventas',
                nivel: 'Básico',
                autor: 'test@miapp.com',
                miembros: 15,
                tickets: 7,
            },
        ];

        // Los gestores de usuarios (SuperAdmins) ven todos los grupos; los demás solo ven los suyos
        const currentUser = this.authService.getCurrentUser();
        const canViewAll = this.authService.hasPermission('users:view');
        
        this.groups = canViewAll
            ? allGroups
            : allGroups.filter((g) => g.autor === currentUser);

        this.buildForm();
    }

    buildForm(): void {
        this.groupForm = this.fb.group({
            nombre: ['', [Validators.required, Validators.minLength(3)]],
            categoria: ['', Validators.required],
            nivel: ['', Validators.required],
            autor: ['', [Validators.required, Validators.email]],
            miembros: [null, [Validators.required, Validators.min(1)]],
            tickets: [null, [Validators.required, Validators.min(0)]],
        });
    }

    openNew(): void {
        this.isEditMode = false;
        this.editingId = null;
        this.groupForm.reset();
        this.dialogVisible = true;
    }

    editGroup(group: Group): void {
        this.isEditMode = true;
        this.editingId = group.id;
        this.groupForm.patchValue({
            nombre: group.nombre,
            categoria: group.categoria,
            nivel: group.nivel,
            autor: group.autor,
            miembros: group.miembros,
            tickets: group.tickets,
        });
        this.dialogVisible = true;
    }

    saveGroup(): void {
        if (this.groupForm.invalid) {
            this.groupForm.markAllAsTouched();
            this.messageService.add({
                severity: 'warn',
                summary: 'Formulario inválido',
                detail: 'Completa todos los campos requeridos correctamente.',
            });
            return;
        }

        try {
            const formValue = this.groupForm.value;

            if (this.isEditMode && this.editingId !== null) {
                const idx = this.groups.findIndex((g) => g.id === this.editingId);
                if (idx !== -1) {
                    this.groups[idx] = { id: this.editingId, ...formValue };
                    this.groups = [...this.groups];
                }
                this.messageService.add({
                    severity: 'success',
                    summary: 'Grupo actualizado',
                    detail: `"${formValue.nombre}" se actualizó correctamente.`,
                });
            } else {
                const newGroup: Group = { id: this.nextId++, ...formValue };
                this.groups = [...this.groups, newGroup];
                this.messageService.add({
                    severity: 'success',
                    summary: 'Grupo creado',
                    detail: `"${formValue.nombre}" se creó correctamente.`,
                });
            }

            this.dialogVisible = false;
        } catch {
            this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'No se pudo guardar el grupo. Intenta de nuevo.',
            });
        }
    }

    deleteGroup(group: Group): void {
        this.confirmationService.confirm({
            message: `¿Estás seguro de eliminar el grupo "<b>${group.nombre}</b>"?`,
            header: 'Confirmar eliminación',
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: 'Sí, eliminar',
            rejectLabel: 'Cancelar',
            acceptButtonStyleClass: 'p-button-danger',
            accept: () => {
                try {
                    this.groups = this.groups.filter((g) => g.id !== group.id);
                    this.messageService.add({
                        severity: 'success',
                        summary: 'Grupo eliminado',
                        detail: `"${group.nombre}" fue eliminado correctamente.`,
                    });
                } catch {
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: 'No se pudo eliminar el grupo.',
                    });
                }
            },
        });
    }

    closeDialog(): void {
        this.dialogVisible = false;
    }

    isInvalid(field: string): boolean {
        const ctrl = this.groupForm.get(field);
        return !!(ctrl && ctrl.invalid && ctrl.touched);
    }
}
