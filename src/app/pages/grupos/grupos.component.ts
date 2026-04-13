'use strict';
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { ToastModule } from 'primeng/toast';
import { ToolbarModule } from 'primeng/toolbar';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TooltipModule } from 'primeng/tooltip';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { MessageService, ConfirmationService } from 'primeng/api';
import { HasPermissionDirective } from '../../directives/has-permission.directive';
import { AuthService } from '../../services/auth.service';
import { TicketService, GroupInfo } from '../../services/ticket.service';

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
        SelectModule,
        ConfirmDialogModule,
        TooltipModule,
        ProgressSpinnerModule,
        HasPermissionDirective,
    ],
    providers: [MessageService, ConfirmationService],
    templateUrl: './grupos.component.html',
    styleUrl: './grupos.component.css',
})
export class GruposComponent implements OnInit {
    groups: GroupInfo[] = [];
    ticketCounts: Partial<Record<number, number>> = {};
    groupForm!: FormGroup;
    dialogVisible = false;
    isEditMode = false;
    editingId: number | null = null;
    loading = true;

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
        private ticketService: TicketService,
        private cdr: ChangeDetectorRef,
    ) {}

    verTickets(group: GroupInfo): void {
        this.router.navigate(['/dashboard/tickets', group.id]);
    }

    ngOnInit(): void {
        this.buildForm();
        this.loadGroups();
    }

    loadGroups(): void {
        this.loading = true;
        this.ticketService.getGroups().subscribe({
            next: (groups) => {
                this.groups = groups;
                this.loadTicketCounts();
            },
            error: () => {
                this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar los grupos.' });
                this.loading = false;
                this.cdr.detectChanges();
            },
        });
    }

    private loadTicketCounts(): void {
        this.ticketService.getAllTickets().subscribe({
            next: (tickets) => {
                this.ticketCounts = {};
                for (const t of tickets) {
                    this.ticketCounts[t.grupoId] = (this.ticketCounts[t.grupoId] ?? 0) + 1;
                }
                this.loading = false;
                this.cdr.detectChanges();
            },
            error: () => {
                this.loading = false;
                this.cdr.detectChanges();
            },
        });
    }

    buildForm(): void {
        this.groupForm = this.fb.group({
            nombre:    ['', [Validators.required, Validators.minLength(3)]],
            categoria: ['', Validators.required],
            nivel:     ['', Validators.required],
        });
    }

    openNew(): void {
        this.isEditMode = false;
        this.editingId = null;
        this.groupForm.reset();
        this.dialogVisible = true;
    }

    editGroup(group: GroupInfo): void {
        this.isEditMode = true;
        this.editingId = group.id;
        this.groupForm.patchValue({
            nombre:    group.nombre,
            categoria: group.categoria,
            nivel:     group.nivel,
        });
        this.dialogVisible = true;
    }

    saveGroup(): void {
        if (this.groupForm.invalid) {
            this.groupForm.markAllAsTouched();
            this.messageService.add({ severity: 'warn', summary: 'Formulario inválido', detail: 'Completa todos los campos requeridos.' });
            return;
        }

        const payload = this.groupForm.value as { nombre: string; categoria: string; nivel: string };

        if (this.isEditMode && this.editingId !== null) {
            this.ticketService.updateGroup(this.editingId, payload).subscribe({
                next: (updated) => {
                    const idx = this.groups.findIndex((g) => g.id === this.editingId);
                    if (idx !== -1) this.groups[idx] = updated;
                    this.groups = [...this.groups];
                    this.messageService.add({ severity: 'success', summary: 'Grupo actualizado', detail: `"${updated.nombre}" se actualizó.` });
                    this.dialogVisible = false;
                    this.cdr.detectChanges();
                },
                error: () => this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo actualizar el grupo.' }),
            });
        } else {
            this.ticketService.createGroup(payload).subscribe({
                next: (created) => {
                    this.groups = [...this.groups, created];
                    this.messageService.add({ severity: 'success', summary: 'Grupo creado', detail: `"${created.nombre}" se creó.` });
                    this.dialogVisible = false;
                    this.cdr.detectChanges();
                },
                error: () => this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo crear el grupo.' }),
            });
        }
    }

    deleteGroup(group: GroupInfo): void {
        this.confirmationService.confirm({
            message: `¿Estás seguro de eliminar el grupo "<b>${group.nombre}</b>"?`,
            header: 'Confirmar eliminación',
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: 'Sí, eliminar',
            rejectLabel: 'Cancelar',
            acceptButtonStyleClass: 'p-button-danger',
            accept: () => {
                this.ticketService.deleteGroup(group.id).subscribe({
                    next: () => {
                        this.groups = this.groups.filter((g) => g.id !== group.id);
                        this.messageService.add({ severity: 'success', summary: 'Grupo eliminado', detail: `"${group.nombre}" fue eliminado.` });
                        this.cdr.detectChanges();
                    },
                    error: () => this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo eliminar el grupo.' }),
                });
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
