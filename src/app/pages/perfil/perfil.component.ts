import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { AvatarModule } from 'primeng/avatar';
import { InputTextModule } from 'primeng/inputtext';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TagModule } from 'primeng/tag';
import { MessageService, ConfirmationService } from 'primeng/api';
import { AuthService } from '../../services/auth.service';
import { TicketService, Ticket } from '../../services/ticket.service';

@Component({
    selector: 'app-perfil',
    standalone: true,
    providers: [MessageService, ConfirmationService],
    imports: [
        CommonModule, 
        FormsModule, 
        ButtonModule, 
        CardModule, 
        AvatarModule, 
        InputTextModule, 
        ToastModule, 
        ConfirmDialogModule,
        TagModule
    ],
    templateUrl: './perfil.component.html',
    styleUrl: './perfil.component.css',
})
export class PerfilComponent implements OnInit {
    isLoggedIn = false;
    currentUser = '';
    editMode = false;

    profileName = 'Usuario ERP';
    userTickets: Ticket[] = [];

    // Copias de edición
    editName = '';

    constructor(
        private authService: AuthService,
        private ticketService: TicketService,
        private messageService: MessageService,
        private confirmationService: ConfirmationService,
        private router: Router,
        private cdr: ChangeDetectorRef,
    ) {}

    ngOnInit(): void {
        this.isLoggedIn = this.authService.isLoggedIn();
        this.currentUser = this.authService.getCurrentUser();
        this.loadWorkload();
    }

    loadWorkload(): void {
        const currentUserId = this.authService.getCurrentUserId();
        this.ticketService.getAllTickets().subscribe((tickets) => {
            this.userTickets = tickets.filter((t) => t.asignadoA === currentUserId || t.creador === currentUserId);
            this.cdr.detectChanges();
        });
    }

    get pendingTicketsCount(): number {
        return this.userTickets.filter((t) => t.estado !== 'Finalizado').length;
    }

    startEdit(): void {
        this.editName = this.profileName;
        this.editMode = true;
    }

    saveProfile(): void {
        if (!this.editName.trim()) {
            this.messageService.add({
                severity: 'warn',
                summary: 'Campos vacíos',
                detail: 'El nombre no puede estar vacío.',
            });
            return;
        }

        this.profileName = this.editName.trim();
        this.editMode = false;
        this.messageService.add({
            severity: 'success',
            summary: 'Perfil actualizado',
            detail: 'Tus datos se guardaron correctamente.',
        });
    }

    cancelEdit(): void {
        this.editMode = false;
    }

    confirmDeleteProfile(): void {
        this.confirmationService.confirm({
            message: '¿Estás seguro de que deseas eliminar tu perfil? Esta acción no se puede deshacer.',
            header: 'Eliminar Perfil',
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: 'Sí, eliminar',
            rejectLabel: 'Cancelar',
            acceptButtonStyleClass: 'p-button-danger',
            accept: () => {
                this.authService.logout();
                this.router.navigate(['/']);
            },
        });
    }
}
