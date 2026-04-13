import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { AvatarModule } from 'primeng/avatar';
import { TagModule } from 'primeng/tag';
import { ChartModule } from 'primeng/chart';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { AuthService } from '../../services/auth.service';
import { TicketService, GroupInfo, Ticket } from '../../services/ticket.service';

@Component({
    selector: 'app-dashboard',
    standalone: true,
    imports: [CommonModule, RouterModule, ButtonModule, CardModule, AvatarModule, TagModule, ChartModule, ProgressSpinnerModule],
    templateUrl: './dashboard.component.html',
    styleUrl: './dashboard.component.css',
})
export class DashboardComponent implements OnInit {
    isLoggedIn = false;
    currentUser = '';

    chartData: any;
    chartOptions: any;

    loading = true;
    stats = { total: 0, pendiente: 0, enProgreso: 0, revision: 0, finalizado: 0 };
    userGroups: GroupInfo[] = [];
    userTickets: Ticket[] = [];

    constructor(
        private authService: AuthService,
        private ticketService: TicketService,
        private cdr: ChangeDetectorRef,
    ) {}

    ngOnInit(): void {
        this.isLoggedIn = this.authService.isLoggedIn();
        this.currentUser = this.authService.getCurrentUser();

        if (this.isLoggedIn) {
            const currentUserId = this.authService.getCurrentUserId();

            this.ticketService.getGroups().subscribe((groups) => {
                this.userGroups = groups;
                this.cdr.detectChanges();
            });

            // Una sola llamada: filtra tickets del usuario Y computa stats/chart
            this.ticketService.getAllTickets().subscribe((tickets) => {
                this.userTickets = tickets.filter(
                    (t) => t.asignadoA === currentUserId || t.creador === currentUserId
                );
                this.computeStats(tickets);
                this.loading = false;
                this.cdr.detectChanges();
            });
        } else {
            this.loading = false;
            this.initEmptyChart();
        }
    }

    ticketStateSeverity(estado: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' {
        const map: Record<string, 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast'> = {
            'Pendiente': 'warn',
            'En Progreso': 'info',
            'Revisión': 'secondary',
            'Finalizado': 'success',
        };
        return map[estado] ?? 'info';
    }

    ticketPrioritySeverity(prioridad: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' {
        const map: Record<string, 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast'> = {
            'Baja': 'secondary',
            'Media': 'info',
            'Alta': 'warn',
            'Crítica': 'danger',
        };
        return map[prioridad] ?? 'info';
    }

    private computeStats(tickets: Ticket[]): void {
        const counts = {
            'Pendiente':   tickets.filter((t) => t.estado === 'Pendiente').length,
            'En Progreso': tickets.filter((t) => t.estado === 'En Progreso').length,
            'Revisión':    tickets.filter((t) => t.estado === 'Revisión').length,
            'Finalizado':  tickets.filter((t) => t.estado === 'Finalizado').length,
        };

        this.stats = {
            total:      tickets.length,
            pendiente:  counts['Pendiente'],
            enProgreso: counts['En Progreso'],
            revision:   counts['Revisión'],
            finalizado: counts['Finalizado'],
        };

        this.chartData = {
            labels: ['Pendiente', 'En Progreso', 'Revisión', 'Finalizado'],
            datasets: [
                {
                    data: [counts['Pendiente'], counts['En Progreso'], counts['Revisión'], counts['Finalizado']],
                    backgroundColor: ['#fbbf24', '#3b82f6', '#a78bfa', '#22c55e'],
                    hoverBackgroundColor: ['#f59e0b', '#2563eb', '#8b5cf6', '#16a34a'],
                    borderWidth: 2,
                    borderColor: '#ffffff',
                },
            ],
        };

        this.chartOptions = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { padding: 16, font: { size: 13 } },
                },
                tooltip: {
                    callbacks: {
                        label: (ctx: any) => ` ${ctx.label}: ${ctx.parsed} tickets`,
                    },
                },
            },
        };
    }

    private initEmptyChart(): void {
        this.chartData = {
            labels: ['Pendiente', 'En Progreso', 'Revisión', 'Finalizado'],
            datasets: [
                {
                    data: [0, 0, 0, 0],
                    backgroundColor: ['#fbbf24', '#3b82f6', '#a78bfa', '#22c55e'],
                    borderWidth: 2,
                    borderColor: '#ffffff',
                },
            ],
        };
        this.chartOptions = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom', labels: { padding: 16, font: { size: 13 } } } },
        };
    }
}
