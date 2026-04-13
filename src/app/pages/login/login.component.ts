import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { CheckboxModule } from 'primeng/checkbox';
import { CardModule } from 'primeng/card';
import { DividerModule } from 'primeng/divider';
import { ToastModule } from 'primeng/toast';
import { FluidModule } from 'primeng/fluid';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { MessageService } from 'primeng/api';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  providers: [MessageService],
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    ButtonModule,
    InputTextModule,
    PasswordModule,
    CheckboxModule,
    CardModule,
    DividerModule,
    ToastModule,
    FluidModule,
    IconFieldModule,
    InputIconModule,
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  email: string = '';
  password: string = '';
  rememberMe: boolean = false;
  loading: boolean = false;

  // Para mostrar las credenciales de prueba
  showCredentials: boolean = false;

  constructor(
    private router: Router,
    private authService: AuthService,
    private messageService: MessageService
  ) { }

  get hardcodedCredentials() {
    return this.authService.getHardcodedCredentials();
  }

  toggleCredentials(): void {
    this.showCredentials = !this.showCredentials;
  }

  fillCredentials(email: string, password: string): void {
    this.email = email;
    this.password = password;
  }

  onLogin(): void {
    if (!this.email || !this.password) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Campos vacíos',
        detail: 'Por favor completa todos los campos.',
      });
      return;
    }

    this.loading = true;

    this.authService.login(this.email, this.password).subscribe((result) => {
      this.loading = false;

      if (result.success) {
        this.messageService.add({
          severity: 'success',
          summary: 'Sesión iniciada',
          detail: result.message + ' Redirigiendo...',
        });
        setTimeout(() => {
          this.router.navigate(['/dashboard']);
        }, 1500);
      } else {
        this.messageService.add({
          severity: 'error',
          summary: 'Error de acceso',
          detail: result.message,
        });
      }
    });
  }

  goToRegister(): void {
    this.router.navigate(['/register']);
  }

  goToHome(): void {
    this.router.navigate(['/']);
  }
}