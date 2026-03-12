import { Injectable } from '@angular/core';

export interface RegisteredUser {
    usuario: string;
    email: string;
    password: string;
    fullName: string;
    address: string;
    phone: string;
    birthDate: string;
}

export type Permission =
    | 'group:view' | 'group:edit' | 'group:add' | 'group:delete'
    | 'ticket:view' | 'ticket:edit' | 'ticket:add' | 'ticket:delete' | 'ticket:edit_state'
    | 'user:view' | 'users:view' | 'user:add' | 'user:edit' | 'user:delete';

const ALL_PERMISSIONS: Permission[] = [
    'group:view', 'group:edit', 'group:add', 'group:delete',
    'ticket:view', 'ticket:edit', 'ticket:add', 'ticket:delete', 'ticket:edit_state',
    'user:view', 'users:view', 'user:add', 'user:edit', 'user:delete',
];

@Injectable({
    providedIn: 'root',
})
export class AuthService {
    private readonly HARDCODED_CREDENTIALS = [
        { email: 'admin@miapp.com', password: 'Admin@12345' },
        { email: 'usuario@miapp.com', password: 'User@12345!' },
        { email: 'test@miapp.com', password: 'Test#12345' },
    ];

    private registeredUsers: RegisteredUser[] = [];
    private isAuthenticated = false;
    private currentUser: string = '';

    /** Mapa mutable email → Lista de permisos granulares */
    private userPermissions: Record<string, Permission[]> = {
        'admin@miapp.com': [...ALL_PERMISSIONS],
        'usuario@miapp.com': ['group:view', 'ticket:view', 'ticket:edit_state'],
        'test@miapp.com': ['group:view', 'ticket:view'],
    };

    login(email: string, password: string): { success: boolean; message: string } {
        const hardcodedMatch = this.HARDCODED_CREDENTIALS.find(
            (cred) => cred.email === email && cred.password === password
        );

        if (hardcodedMatch) {
            this.isAuthenticated = true;
            this.currentUser = hardcodedMatch.email;
            return { success: true, message: '¡Inicio de sesión exitoso!' };
        }

        const registeredMatch = this.registeredUsers.find(
            (user) => user.email === email && user.password === password
        );

        if (registeredMatch) {
            this.isAuthenticated = true;
            this.currentUser = registeredMatch.email;
            return { success: true, message: '¡Inicio de sesión exitoso!' };
        }

        return { success: false, message: 'Credenciales inválidas. Verifica tu correo y contraseña.' };
    }

    register(user: RegisteredUser): { success: boolean; message: string } {
        const emailExists =
            this.HARDCODED_CREDENTIALS.some((cred) => cred.email === user.email) ||
            this.registeredUsers.some((u) => u.email === user.email);

        if (emailExists) {
            return { success: false, message: 'Este correo electrónico ya está registrado.' };
        }

        const userExists = this.registeredUsers.some((u) => u.usuario === user.usuario);
        if (userExists) {
            return { success: false, message: 'Este nombre de usuario ya está en uso.' };
        }

        this.registeredUsers.push(user);
        // Por defecto, un nuevo usuario solo puede ver
        this.userPermissions[user.email] = ['group:view', 'ticket:view'];
        return { success: true, message: '¡Cuenta creada exitosamente!' };
    }

    logout(): void {
        this.isAuthenticated = false;
        this.currentUser = '';
    }

    isLoggedIn(): boolean {
        return this.isAuthenticated;
    }

    getCurrentUser(): string {
        return this.currentUser;
    }

    getHardcodedCredentials(): { email: string; password: string }[] {
        return [...this.HARDCODED_CREDENTIALS];
    }

    hasPermission(permission: string): boolean {
        const perms = this.userPermissions[this.currentUser] ?? [];
        return perms.includes(permission as Permission);
    }

    /**
     * Gestión granular de permisos
     */
    getUserPermissions(email: string): Permission[] {
        return this.userPermissions[email] ?? [];
    }

    setUserPermissions(email: string, permissions: Permission[]): void {
        this.userPermissions[email] = [...permissions];
    }
    
    getAllAvailablePermissions(): Permission[] {
        return [...ALL_PERMISSIONS];
    }
}
