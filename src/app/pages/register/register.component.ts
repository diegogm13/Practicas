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
import { DatePickerModule } from 'primeng/datepicker';
import { InputMaskModule } from 'primeng/inputmask';
import { TextareaModule } from 'primeng/textarea';
import { MessageService } from 'primeng/api';
import { AuthService } from '../../services/auth.service';

interface FieldError {
  [key: string]: string;
}

@Component({
  selector: 'app-register',
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
    DatePickerModule,
    InputMaskModule,
    TextareaModule,
  ],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css'
})
export class RegisterComponent {
  usuario: string = '';
  email: string = '';
  password: string = '';
  confirmPassword: string = '';
  fullName: string = '';
  address: string = '';
  phone: string = '';
  birthDate: Date | null = null;
  acceptTerms: boolean = false;
  loading: boolean = false;
  fieldErrors: FieldError = {};

  // Para mostrar los requisitos de contraseña
  showPasswordReqs: boolean = false;

  // Símbolos especiales permitidos
  readonly SPECIAL_CHARS = '!@#$%^&*()_+-=[]{}|;:,.<>?';

  // Edad máxima para el datepicker
  maxDate: Date = new Date();

  constructor(
    private router: Router,
    private authService: AuthService,
    private messageService: MessageService
  ) {
    // Calcular la fecha máxima (hoy menos 18 años)
    this.maxDate = new Date();
    this.maxDate.setFullYear(this.maxDate.getFullYear() - 18);
  }

  /**
   * Valida todos los campos del formulario.
   * Retorna true si todo está válido.
   */
  validateForm(): boolean {
    this.fieldErrors = {};
    let isValid = true;

    // USUARIO
    if (!this.usuario || this.usuario.trim() === '') {
      this.fieldErrors['usuario'] = 'El nombre de usuario es obligatorio.';
      isValid = false;
    } else if (this.usuario.trim().length < 3) {
      this.fieldErrors['usuario'] = 'El usuario debe tener al menos 3 caracteres.';
      isValid = false;
    }

    // EMAIL
    if (!this.email || this.email.trim() === '') {
      this.fieldErrors['email'] = 'El correo electrónico es obligatorio.';
      isValid = false;
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(this.email)) {
        this.fieldErrors['email'] = 'Ingresa un correo electrónico válido.';
        isValid = false;
      }
    }

    // NOMBRE COMPLETO
    if (!this.fullName || this.fullName.trim() === '') {
      this.fieldErrors['fullName'] = 'El nombre completo es obligatorio.';
      isValid = false;
    } else if (this.fullName.trim().length < 3) {
      this.fieldErrors['fullName'] = 'El nombre debe tener al menos 3 caracteres.';
      isValid = false;
    }
    // TELÉFONO - solo números
    if (!this.phone || this.phone.trim() === '') {
      this.fieldErrors['phone'] = 'El número de teléfono es obligatorio.';
      isValid = false;
    } else {
      const phoneClean = this.phone.replace(/[\s\-\(\)]/g, '');
      
      if (!/^\d+$/.test(phoneClean)) {
        this.fieldErrors['phone'] = 'El teléfono solo debe contener números.';
        isValid = false;
      } else if (phoneClean.length < 10) {
        this.fieldErrors['phone'] = 'El teléfono debe tener al menos 10 dígitos.';
        isValid = false;
      } else if (phoneClean.length > 15) {
        this.fieldErrors['phone'] = 'El teléfono no puede tener más de 15 dígitos.';
        isValid = false;
      }
    }

    // DIRECCIÓN
    if (!this.address || this.address.trim() === '') {
      this.fieldErrors['address'] = 'La dirección es obligatoria.';
      isValid = false;
    }

    // FECHA DE NACIMIENTO - mayor de edad
    if (!this.birthDate) {
      this.fieldErrors['birthDate'] = 'La fecha de nacimiento es obligatoria.';
      isValid = false;
    } else {
      const today = new Date();
      const birth = new Date(this.birthDate);
      let age = today.getFullYear() - birth.getFullYear();
      const monthDiff = today.getMonth() - birth.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
      }
      if (age < 18) {
        this.fieldErrors['birthDate'] = 'Debes ser mayor de edad (18 años) para registrarte.';
        isValid = false;
      }
    }

    // CONTRASEÑA - al menos 10 caracteres con símbolos especiales
    if (!this.password || this.password === '') {
      this.fieldErrors['password'] = 'La contraseña es obligatoria.';
      isValid = false;
    } else {
      if (this.password.length < 10) {
        this.fieldErrors['password'] = 'La contraseña debe tener al menos 10 caracteres.';
        isValid = false;
      } else if (!/[A-Z]/.test(this.password)) {
        this.fieldErrors['password'] = 'La contraseña debe contener al menos una letra mayúscula.';
        isValid = false;
      } else if (!/[a-z]/.test(this.password)) {
        this.fieldErrors['password'] = 'La contraseña debe contener al menos una letra minúscula.';
        isValid = false;
      } else if (!/[0-9]/.test(this.password)) {
        this.fieldErrors['password'] = 'La contraseña debe contener al menos un número.';
        isValid = false;
      } else if (!/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(this.password)) {
        this.fieldErrors['password'] =
          'La contraseña debe contener al menos un símbolo especial: ' + this.SPECIAL_CHARS;
        isValid = false;
      }
    }

    // CONFIRMAR CONTRASEÑA
    if (!this.confirmPassword || this.confirmPassword === '') {
      this.fieldErrors['confirmPassword'] = 'Debes confirmar tu contraseña.';
      isValid = false;
    } else if (this.password !== this.confirmPassword) {
      this.fieldErrors['confirmPassword'] = 'Las contraseñas no coinciden.';
      isValid = false;
    }

    // TÉRMINOS
    if (!this.acceptTerms) {
      this.fieldErrors['terms'] = 'Debes aceptar los términos y condiciones.';
      isValid = false;
    }

    return isValid;
  }

  /**
   * Verifica los requisitos de la contraseña en tiempo real
   */
  get passwordChecks() {
    return {
      length: this.password.length >= 10,
      uppercase: /[A-Z]/.test(this.password),
      lowercase: /[a-z]/.test(this.password),
      number: /[0-9]/.test(this.password),
      special: /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(this.password),
    };
  }

  get isFormValid(): boolean {
    return (
      this.usuario.trim() !== '' &&
      this.email.trim() !== '' &&
      this.fullName.trim() !== '' &&
      this.phone.trim() !== '' &&
      this.address.trim() !== '' &&
      this.birthDate !== null &&
      this.password !== '' &&
      this.confirmPassword !== '' &&
      this.acceptTerms
    );
  }

  onPhoneInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    // Solo permitir números
    input.value = input.value.replace(/[^0-9]/g, '');
    this.phone = input.value;
  }

  onRegister(): void {
    if (!this.validateForm()) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Formulario inválido',
        detail: 'Por favor corrige los errores en el formulario.',
      });
      return;
    }

    this.loading = true;

    this.authService.register({
      usuario: this.usuario.trim(),
      email: this.email.trim(),
      password: this.password,
      fullName: this.fullName.trim(),
      address: this.address.trim(),
      phone: this.phone.trim(),
      birthDate: this.birthDate!.toISOString(),
    }).subscribe((result) => {
      this.loading = false;

      if (result.success) {
        this.messageService.add({
          severity: 'success',
          summary: 'Cuenta creada',
          detail: result.message + ' Redirigiendo al login...',
        });
        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 2000);
      } else {
        this.messageService.add({
          severity: 'error',
          summary: 'Error al registrar',
          detail: result.message,
        });
      }
    });
  }

  goToLogin(): void {
    this.router.navigate(['/login']);
  }

  goToHome(): void {
    this.router.navigate(['/']);
  }
}