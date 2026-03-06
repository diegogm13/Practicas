import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { AvatarModule } from 'primeng/avatar';
import { TagModule } from 'primeng/tag';
import { ChartModule } from 'primeng/chart';
import { AuthService } from '../../services/auth.service';
import { TicketService } from '../../services/ticket.service';

@Component({
    selector: 'app-dashboard',
    standalone: true,
    imports: [CommonModule, RouterModule, ButtonModule, CardModule, AvatarModule, TagModule, ChartModule],
    templateUrl: './dashboard.component.html',
    styleUrl: './dashboard.component.css',
})
export class DashboardComponent implements OnInit {
    isLoggedIn = false;
    currentUser = '';

    chartData: any;
    chartOptions: any;

    stats = { total: 0, pendiente: 0, enProgreso: 0, revision: 0, finalizado: 0 };

    constructor(
        private authService: AuthService,
        private ticketService: TicketService,
    ) {}

    ngOnInit(): void {
        this.isLoggedIn = this.authService.isLoggedIn();
        this.currentUser = this.authService.getCurrentUser();
        this.loadStats();
    }

    loadStats(): void {
        const s = this.ticketService.getStatsGlobal();
        this.stats = {
            total: s['Pendiente'] + s['En Progreso'] + s['Revisión'] + s['Finalizado'],
            pendiente: s['Pendiente'],
            enProgreso: s['En Progreso'],
            revision: s['Revisión'],
            finalizado: s['Finalizado'],
        };

        this.chartData = {
            labels: ['Pendiente', 'En Progreso', 'Revisión', 'Finalizado'],
            datasets: [
                {
                    data: [s['Pendiente'], s['En Progreso'], s['Revisión'], s['Finalizado']],
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
}
