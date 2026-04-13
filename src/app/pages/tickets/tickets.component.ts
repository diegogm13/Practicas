import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { ToastModule } from 'primeng/toast';
import { ToolbarModule } from 'primeng/toolbar';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { SelectModule } from 'primeng/select';
import { SelectButtonModule } from 'primeng/selectbutton';
import { DatePickerModule } from 'primeng/datepicker';
import { TagModule } from 'primeng/tag';
import { CardModule } from 'primeng/card';
import { TooltipModule } from 'primeng/tooltip';
import { TabsModule } from 'primeng/tabs';
import { DragDropModule } from 'primeng/dragdrop';
import { MessageService } from 'primeng/api';
import { TicketService, Ticket, EstadoTicket, PrioridadTicket } from '../../services/ticket.service';
import { AuthService } from '../../services/auth.service';
import { HasPermissionDirective } from '../../directives/has-permission.directive';

@Component({
    selector: 'app-tickets',
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
        TextareaModule,
        SelectModule,
        SelectButtonModule,
        DatePickerModule,
        TagModule,
        CardModule,
        TooltipModule,
        TabsModule,
        DragDropModule,
        HasPermissionDirective,
    ],
    providers: [MessageService],
    templateUrl: './tickets.component.html',
    styleUrl: './tickets.component.css',
})
export class TicketsComponent implements OnInit {
    grupoId = 0;
    grupoNombre = '';
    /** Email del usuario actual (para mostrar en UI) */
    currentUser = '';
    /** UUID del usuario actual (para comparar con datos del backend) */
    currentUserId = '';

    tickets: Ticket[] = [];

    // View toggle
    viewOptions = [
        { label: 'Kanban', value: 'kanban', icon: 'pi pi-th-large' },
        { label: 'Lista', value: 'lista', icon: 'pi pi-list' },
    ];
    selectedView = 'kanban';

    readonly estados: EstadoTicket[] = ['Pendiente', 'En Progreso', 'Revisión', 'Finalizado'];

    estadoOptions = [
        { label: 'Pendiente', value: 'Pendiente' },
        { label: 'En Progreso', value: 'En Progreso' },
        { label: 'Revisión', value: 'Revisión' },
        { label: 'Finalizado', value: 'Finalizado' },
    ];

    prioridadOptions = [
        { label: 'Baja', value: 'Baja' },
        { label: 'Media', value: 'Media' },
        { label: 'Alta', value: 'Alta' },
        { label: 'Crítica', value: 'Crítica' },
    ];

    // Ticket dialog
    ticketDialogVisible = false;
    detailDialogVisible = false;
    isEditMode = false;
    selectedTicket: Ticket | null = null;
    ticketForm!: FormGroup;
    newComment = '';

    // Quick filters — admin ve todos; usuario normal solo los suyos
    quickFilter: 'todos' | 'mis-tickets' | 'sin-asignar' | 'prioridad-alta' = 'mis-tickets';

    // Drag and drop tracking
    draggedTicket: Ticket | null = null;

    constructor(
        private route: ActivatedRoute,
        private ticketService: TicketService,
        private authService: AuthService,
        private fb: FormBuilder,
        private messageService: MessageService,
        private cdr: ChangeDetectorRef,
    ) {}

    ngOnInit(): void {
        this.grupoId = Number(this.route.snapshot.paramMap.get('grupoId') ?? 1);
        this.currentUser = this.authService.getCurrentUser();
        this.currentUserId = this.authService.getCurrentUserId();
        // Admin ve todos; usuario normal solo sus tickets
        this.quickFilter = this.authService.hasPermission('users:view') ? 'todos' : 'mis-tickets';
        this.loadData();
        this.buildForm();

        // Nombre del grupo se obtendrá del backend en loadData; fallback mientras tanto
        this.grupoNombre = `Grupo ${this.grupoId}`;
        this.ticketService.getGroups().subscribe((groups) => {
            const g = groups.find((x) => x.id === this.grupoId);
            if (g) this.grupoNombre = g.nombre;
        });
    }

    loadData(): void {
        this.ticketService.getTicketsByGroup(this.grupoId).subscribe((tickets) => {
            this.tickets = tickets;
            this.cdr.detectChanges();
        });
    }

    buildForm(): void {
        this.ticketForm = this.fb.group({
            titulo: ['', [Validators.required, Validators.minLength(3)]],
            descripcion: ['', Validators.required],
            estado: ['Pendiente', Validators.required],
            prioridad: ['Media', Validators.required],
            fechaLimite: [null, Validators.required],
        });
    }

    canEditAllFields(ticket: Ticket | null): boolean {
        if (!ticket) return true;
        return ticket.creador === this.currentUserId || this.authService.hasPermission('ticket:delete');
    }

    canChangeStatus(ticket: Ticket | null): boolean {
        if (!ticket) return true;
        return (
            ticket.asignadoA === this.currentUserId ||
            ticket.creador === this.currentUserId ||
            this.authService.hasPermission('ticket:edit_state')
        );
    }

    ticketsByEstado(estado: EstadoTicket): Ticket[] {
        return this.filteredTickets.filter((t) => t.estado === estado);
    }

    get filteredTickets(): Ticket[] {
        return this.tickets.filter((t) => {
            if (this.quickFilter === 'mis-tickets') return t.asignadoA === this.currentUserId;
            if (this.quickFilter === 'sin-asignar') return !t.asignadoA;
            if (this.quickFilter === 'prioridad-alta') return t.prioridad === 'Alta' || t.prioridad === 'Crítica';
            return true;
        });
    }

    openNew(): void {
        if (!this.authService.hasPermission('ticket:add')) {
            this.messageService.add({ severity: 'error', summary: 'Acceso denegado', detail: 'No tienes permiso para crear tickets.' });
            return;
        }
        this.isEditMode = false;
        this.selectedTicket = null;
        this.ticketForm.reset({ estado: 'Pendiente', prioridad: 'Media' });
        this.ticketForm.get('titulo')?.enable();
        this.ticketForm.get('descripcion')?.enable();
        this.ticketForm.get('prioridad')?.enable();
        this.ticketForm.get('estado')?.enable();
        this.ticketDialogVisible = true;
    }

    openEdit(ticket: Ticket): void {
        this.isEditMode = true;
        this.selectedTicket = ticket;
        this.ticketForm.patchValue({
            titulo: ticket.titulo,
            descripcion: ticket.descripcion,
            estado: ticket.estado,
            prioridad: ticket.prioridad,
            fechaLimite: new Date(ticket.fechaLimite),
        });

        if (!this.canEditAllFields(ticket)) {
            this.ticketForm.get('titulo')?.disable();
            this.ticketForm.get('descripcion')?.disable();
            this.ticketForm.get('prioridad')?.disable();
        } else {
            this.ticketForm.get('titulo')?.enable();
            this.ticketForm.get('descripcion')?.enable();
            this.ticketForm.get('prioridad')?.enable();
        }

        if (!this.canChangeStatus(ticket)) {
            this.ticketForm.get('estado')?.disable();
        } else {
            this.ticketForm.get('estado')?.enable();
        }

        this.ticketDialogVisible = true;
    }

    openDetail(ticket: Ticket): void {
        this.selectedTicket = { ...ticket };
        this.newComment = '';
        this.detailDialogVisible = true;
    }

    saveTicket(): void {
        if (this.ticketForm.invalid) return;

        const v = this.ticketForm.getRawValue();

        if (this.isEditMode && this.selectedTicket) {
            const changes: Partial<Ticket> = {
                titulo: v.titulo,
                descripcion: v.descripcion,
                prioridad: v.prioridad,
                estado: v.estado,
                fechaLimite: v.fechaLimite,
            };
            this.ticketService.updateTicket(this.selectedTicket.id, changes).subscribe({
                next: () => {
                    this.messageService.add({ severity: 'success', summary: 'Sincronizado', detail: 'Ticket actualizado.' });
                    this.loadData();
                    this.ticketDialogVisible = false;
                },
                error: () => {
                    this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo actualizar el ticket.' });
                },
            });
        } else {
            const fechaLimiteStr = v.fechaLimite
                ? (v.fechaLimite instanceof Date ? v.fechaLimite : new Date(v.fechaLimite)).toISOString().split('T')[0]
                : '';

            this.ticketService.createTicket({
                titulo: v.titulo,
                descripcion: v.descripcion,
                prioridad: v.prioridad,
                fecha_limite: fechaLimiteStr,
                grupo_id: this.grupoId,
            }).subscribe({
                next: () => {
                    this.messageService.add({ severity: 'success', summary: 'Creado', detail: 'Nuevo ticket generado.' });
                    this.loadData();
                    this.ticketDialogVisible = false;
                },
                error: () => {
                    this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo crear el ticket.' });
                },
            });
        }
    }

    deleteTicket(ticket: Ticket): void {
        if (ticket.creador !== this.currentUserId && !this.authService.hasPermission('ticket:delete')) {
            this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Solo el creador puede eliminarlo.' });
            return;
        }
        this.ticketService.deleteTicket(ticket.id).subscribe({
            next: () => {
                this.loadData();
                this.messageService.add({ severity: 'info', summary: 'Eliminado', detail: 'El ticket ha sido removido.' });
            },
            error: () => {
                this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo eliminar el ticket.' });
            },
        });
    }

    addComment(): void {
        if (!this.newComment.trim() || !this.selectedTicket) return;
        const texto = this.newComment.trim();
        this.ticketService.addComment(this.selectedTicket.id, texto).subscribe({
            next: () => {
                this.selectedTicket!.comentarios = [
                    ...this.selectedTicket!.comentarios,
                    { autor: this.currentUser, texto, fecha: new Date() },
                ];
                this.newComment = '';
            },
            error: () => {
                this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo añadir el comentario.' });
            },
        });
    }

    // Drag and Drop Logic
    onDragStart(ticket: Ticket): void {
        if (this.canChangeStatus(ticket)) {
            this.draggedTicket = ticket;
        }
    }

    onDragEnd(): void {
        this.draggedTicket = null;
    }

    onDrop(newEstado: EstadoTicket): void {
        if (this.draggedTicket && this.draggedTicket.estado !== newEstado) {
            this.ticketService.changeEstado(this.draggedTicket.id, newEstado).subscribe({
                next: () => {
                    this.messageService.add({ severity: 'success', summary: 'Movido', detail: `Ticket a ${newEstado}` });
                    this.loadData();
                },
                error: () => {
                    this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo cambiar el estado.' });
                },
            });
        }
    }

    isInvalid(field: string): boolean {
        const ctrl = this.ticketForm.get(field);
        return !!(ctrl && ctrl.invalid && ctrl.touched);
    }

    getPrioridadSeverity(prioridad: PrioridadTicket): 'danger' | 'warn' | 'info' | 'secondary' {
        const map: Record<PrioridadTicket, 'danger' | 'warn' | 'info' | 'secondary'> = {
            'Crítica': 'danger', 'Alta': 'warn', 'Media': 'info', 'Baja': 'secondary',
        };
        return map[prioridad];
    }

    getEstadoClass(estado: EstadoTicket): string {
        const map: Record<EstadoTicket, string> = {
            'Pendiente': 'estado-pendiente',
            'En Progreso': 'estado-en-progreso',
            'Revisión': 'estado-revision',
            'Finalizado': 'estado-finalizado',
        };
        return map[estado];
    }
}
