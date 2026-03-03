import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { AvatarModule } from 'primeng/avatar';
import { InputTextModule } from 'primeng/inputtext';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MessageService, ConfirmationService } from 'primeng/api';
import { AuthService } from '../../services/auth.service';

@Component({
    selector: 'app-perfil',
    standalone: true,
    providers: [MessageService, ConfirmationService],
    imports: [CommonModule, FormsModule, ButtonModule, CardModule, AvatarModule, InputTextModule, ToastModule, ConfirmDialogModule],
    templateUrl: './perfil.component.html',
    styleUrl: './perfil.component.css',
})
export class PerfilComponent implements OnInit {
    isLoggedIn = false;
    currentUser = '';
    editMode = false;

    profileName = 'Juan Developer';
    profileRole = 'Senior Developer';

    // Copias de edición
    editName = '';
    editRole = '';

    constructor(
        private authService: AuthService,
        private messageService: MessageService,
        private confirmationService: ConfirmationService,
        private router: Router
    ) {}

    ngOnInit(): void {
        this.isLoggedIn = this.authService.isLoggedIn();
        this.currentUser = this.authService.getCurrentUser();
    }

    startEdit(): void {
        this.editName = this.profileName;
        this.editRole = this.profileRole;
        this.editMode = true;
    }

    saveProfile(): void {
        if (!this.editName.trim() || !this.editRole.trim()) {
            this.messageService.add({
                severity: 'warn',
                summary: 'Campos vacíos',
                detail: 'El nombre y el rol no pueden estar vacíos.',
            });
            return;
        }

        try {
            this.profileName = this.editName.trim();
            this.profileRole = this.editRole.trim();
            this.editMode = false;
            this.messageService.add({
                severity: 'success',
                summary: 'Perfil actualizado',
                detail: 'Tus datos se guardaron correctamente.',
            });
        } catch {
            this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'No se pudo guardar el perfil. Intenta de nuevo.',
            });
        }
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
