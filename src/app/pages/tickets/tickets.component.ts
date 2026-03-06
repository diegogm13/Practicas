import { Component, OnInit } from '@angular/core';
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
import { MessageService } from 'primeng/api';
import { TicketService, Ticket, GroupMember, EstadoTicket, PrioridadTicket } from '../../services/ticket.service';
import { AuthService } from '../../services/auth.service';

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
    ],
    providers: [MessageService],
    templateUrl: './tickets.component.html',
    styleUrl: './tickets.component.css',
})
export class TicketsComponent implements OnInit {
    grupoId = 0;
    grupoNombre = '';
    currentUser = '';

    tickets: Ticket[] = [];
    members: GroupMember[] = [];

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

    // Members dialog
    membersDialogVisible = false;
    newMemberEmail = '';
    newMemberName = '';

    // Table filters
    filterEstado: string | null = null;
    filterPrioridad: string | null = null;

    constructor(
        private route: ActivatedRoute,
        private ticketService: TicketService,
        private authService: AuthService,
        private fb: FormBuilder,
        private messageService: MessageService,
    ) {}

    ngOnInit(): void {
        this.grupoId = Number(this.route.snapshot.paramMap.get('grupoId') ?? 1);
        this.currentUser = this.authService.getCurrentUser();
        this.loadData();
        this.buildForm();

        const grupoNames: Record<number, string> = { 1: 'Grupo Alpha', 2: 'Grupo Beta', 3: 'Grupo Gamma' };
        this.grupoNombre = grupoNames[this.grupoId] ?? `Grupo ${this.grupoId}`;
    }

    loadData(): void {
        this.tickets = this.ticketService.getTicketsByGroup(this.grupoId);
        this.members = this.ticketService.getMembersByGroup(this.grupoId);
    }

    buildForm(): void {
        this.ticketForm = this.fb.group({
            titulo: ['', [Validators.required, Validators.minLength(3)]],
            descripcion: ['', Validators.required],
            estado: ['Pendiente', Validators.required],
            prioridad: ['Media', Validators.required],
            asignadoA: ['', [Validators.required, Validators.email]],
            fechaLimite: [null, Validators.required],
        });
    }

    ticketsByEstado(estado: EstadoTicket): Ticket[] {
        return this.tickets.filter((t) => t.estado === estado);
    }

    get filteredTickets(): Ticket[] {
        return this.tickets.filter((t) => {
            if (this.filterEstado && t.estado !== this.filterEstado) return false;
            if (this.filterPrioridad && t.prioridad !== this.filterPrioridad) return false;
            return true;
        });
    }

    openNew(): void {
        this.isEditMode = false;
        this.selectedTicket = null;
        this.ticketForm.reset({ estado: 'Pendiente', prioridad: 'Media' });
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
            asignadoA: ticket.asignadoA,
            fechaLimite: new Date(ticket.fechaLimite),
        });
        this.ticketDialogVisible = true;
    }

    openDetail(ticket: Ticket): void {
        this.selectedTicket = this.ticketService.getTicketById(ticket.id) ?? ticket;
        this.newComment = '';
        this.detailDialogVisible = true;
    }

    saveTicket(): void {
        if (this.ticketForm.invalid) {
            this.ticketForm.markAllAsTouched();
            this.messageService.add({ severity: 'warn', summary: 'Formulario inválido', detail: 'Completa todos los campos requeridos.' });
            return;
        }

        const v = this.ticketForm.value;

        if (this.isEditMode && this.selectedTicket) {
            this.ticketService.updateTicket(this.selectedTicket.id, {
                titulo: v.titulo,
                descripcion: v.descripcion,
                estado: v.estado,
                prioridad: v.prioridad,
                asignadoA: v.asignadoA,
                fechaLimite: v.fechaLimite,
            }, this.currentUser);
            this.messageService.add({ severity: 'success', summary: 'Ticket actualizado', detail: `"${v.titulo}" actualizado correctamente.` });
        } else {
            this.ticketService.createTicket({
                titulo: v.titulo,
                descripcion: v.descripcion,
                estado: v.estado,
                prioridad: v.prioridad,
                asignadoA: v.asignadoA,
                fechaCreacion: new Date(),
                fechaLimite: v.fechaLimite,
                grupoId: this.grupoId,
            });
            this.messageService.add({ severity: 'success', summary: 'Ticket creado', detail: `"${v.titulo}" creado correctamente.` });
        }

        this.loadData();
        this.ticketDialogVisible = false;
    }

    deleteTicket(ticket: Ticket): void {
        this.ticketService.deleteTicket(ticket.id);
        this.loadData();
        this.messageService.add({ severity: 'success', summary: 'Ticket eliminado', detail: `"${ticket.titulo}" eliminado.` });
    }

    addComment(): void {
        if (!this.newComment.trim() || !this.selectedTicket) return;
        this.ticketService.addComment(this.selectedTicket.id, this.newComment.trim(), this.currentUser);
        this.selectedTicket = this.ticketService.getTicketById(this.selectedTicket.id) ?? this.selectedTicket;
        this.newComment = '';
        this.loadData();
    }

    openMembers(): void {
        this.newMemberEmail = '';
        this.newMemberName = '';
        this.membersDialogVisible = true;
    }

    addMember(): void {
        if (!this.newMemberEmail.trim()) return;
        const result = this.ticketService.addMember(this.grupoId, this.newMemberEmail.trim(), this.newMemberName.trim() || this.newMemberEmail.trim());
        this.messageService.add({
            severity: result.success ? 'success' : 'warn',
            summary: result.success ? 'Miembro añadido' : 'Advertencia',
            detail: result.message,
        });
        if (result.success) {
            this.newMemberEmail = '';
            this.newMemberName = '';
            this.members = this.ticketService.getMembersByGroup(this.grupoId);
        }
    }

    removeMember(member: GroupMember): void {
        this.ticketService.removeMember(member.id);
        this.members = this.ticketService.getMembersByGroup(this.grupoId);
        this.messageService.add({ severity: 'success', summary: 'Miembro eliminado', detail: `"${member.email}" fue eliminado del grupo.` });
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
