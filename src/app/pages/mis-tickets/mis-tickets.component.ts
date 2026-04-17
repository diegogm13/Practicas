import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { CardModule } from 'primeng/card';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { SelectButtonModule } from 'primeng/selectbutton';
import { TooltipModule } from 'primeng/tooltip';
import { FormsModule } from '@angular/forms';
import { TicketService, Ticket, GroupInfo, EstadoTicket, PrioridadTicket } from '../../services/ticket.service';
import { AuthService } from '../../services/auth.service';

interface TicketConGrupo extends Ticket {
    grupoNombre: string;
}

@Component({
    selector: 'app-mis-tickets',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        ButtonModule,
        TableModule,
        TagModule,
        CardModule,
        ProgressSpinnerModule,
        SelectButtonModule,
        TooltipModule,
    ],
    templateUrl: './mis-tickets.component.html',
    styleUrl: './mis-tickets.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MisTicketsComponent implements OnInit {
    loading = true;
    tickets: TicketConGrupo[] = [];
    grupos: GroupInfo[] = [];

    readonly estados: EstadoTicket[] = ['Pendiente', 'En Progreso', 'Revisión', 'Finalizado'];

    viewOptions = [
        { label: 'Kanban', value: 'kanban', icon: 'pi pi-th-large' },
        { label: 'Lista',  value: 'lista',  icon: 'pi pi-list'    },
    ];
    selectedView = 'kanban';

    constructor(
        private ticketService: TicketService,
        private authService: AuthService,
        private router: Router,
        private cdr: ChangeDetectorRef,
    ) {}

    ngOnInit(): void {
        this.ticketService.getGroups().subscribe((grupos) => {
            this.grupos = grupos;
            const grupoMap: Record<number, string> = {};
            grupos.forEach((g) => (grupoMap[g.id] = g.nombre));

            this.ticketService.getMyTickets().subscribe({
                next: (tickets) => {
                    this.tickets = tickets.map((t) => ({
                        ...t,
                        grupoNombre: grupoMap[t.grupoId] ?? `Grupo ${t.grupoId}`,
                    }));
                    this.loading = false;
                    this.cdr.markForCheck();
                },
                error: () => { this.loading = false; this.cdr.markForCheck(); },
            });
        });
    }

    ticketsByEstado(estado: EstadoTicket): TicketConGrupo[] {
        return this.tickets.filter((t) => t.estado === estado);
    }

    irAlGrupo(ticket: TicketConGrupo): void {
        this.router.navigate(['/dashboard/tickets', ticket.grupoId]);
    }

    getPrioridadSeverity(p: PrioridadTicket): 'danger' | 'warn' | 'info' | 'secondary' {
        const m: Record<PrioridadTicket, 'danger' | 'warn' | 'info' | 'secondary'> = {
            'Crítica': 'danger', 'Alta': 'warn', 'Media': 'info', 'Baja': 'secondary',
        };
        return m[p];
    }

    getEstadoSeverity(e: EstadoTicket): 'warn' | 'info' | 'secondary' | 'success' {
        const m: Record<EstadoTicket, 'warn' | 'info' | 'secondary' | 'success'> = {
            'Pendiente': 'warn', 'En Progreso': 'info', 'Revisión': 'secondary', 'Finalizado': 'success',
        };
        return m[e];
    }

    getEstadoClass(e: EstadoTicket): string {
        const m: Record<EstadoTicket, string> = {
            'Pendiente': 'col-pendiente', 'En Progreso': 'col-progreso',
            'Revisión': 'col-revision', 'Finalizado': 'col-finalizado',
        };
        return m[e];
    }
}
