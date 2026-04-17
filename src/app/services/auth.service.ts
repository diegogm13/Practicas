'use strict';
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';

export type Permission =
    | 'group:view' | 'group:edit' | 'group:add' | 'group:delete'
    | 'ticket:view' | 'ticket:edit' | 'ticket:add' | 'ticket:delete' | 'ticket:edit_state'
    | 'user:view' | 'users:view' | 'user:add' | 'user:edit' | 'user:delete';

const ALL_PERMISSIONS: Permission[] = [
    'group:view', 'group:edit', 'group:add', 'group:delete',
    'ticket:view', 'ticket:edit', 'ticket:add', 'ticket:delete', 'ticket:edit_state',
    'user:view', 'users:view', 'user:add', 'user:edit', 'user:delete',
];

interface StoredUser {
    userId: string;
    email: string;
    permissions: Permission[];
}

const API = 'http://localhost:3000';
const TOKEN_KEY = 'erp_token';
const USER_KEY = 'erp_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
    /** In-memory permissions map for UsuariosComponent (local, not backend-synced) */
    private userPermissionsMap: Record<string, Permission[]> = {
        'admin@miapp.com': [...ALL_PERMISSIONS],
        'usuario@miapp.com': ['group:view', 'ticket:view', 'ticket:edit_state'],
        'test@miapp.com': ['group:view', 'ticket:view'],
    };

    constructor(private http: HttpClient) {}

    login(email: string, password: string): Observable<{ success: boolean; message: string }> {
        return this.http
            .post<{
                statusCode: number;
                intOpCode: string;
                data: { token: string; user: { id: string; email: string; permissions: string[]; groupPermissions: Record<string, string[]> } };
                message: string;
            }>(`${API}/auth/login`, { email, password })
            .pipe(
                tap((res) => {
                    if (res.statusCode === 200 && res.data) {
                        this.setCookie(TOKEN_KEY, res.data.token, 1);
                        const stored: StoredUser = {
                            userId: res.data.user.id,
                            email: res.data.user.email,
                            permissions: res.data.user.permissions as Permission[],
                        };
                        localStorage.setItem(USER_KEY, JSON.stringify(stored));
                    }
                }),
                map(() => ({ success: true, message: '¡Inicio de sesión exitoso!' })),
                catchError((err) => {
                    const msg = err.error?.error ?? 'Credenciales inválidas o error de conexión.';
                    return of({ success: false, message: msg });
                })
            );
    }

    register(user: {
        usuario: string;
        email: string;
        password: string;
        fullName: string;
        address: string;
        phone: string;
        birthDate: string;
    }): Observable<{ success: boolean; message: string }> {
        return this.http
            .post<{ statusCode: number; intOpCode: string; data: any; message: string }>(`${API}/auth/register`, {
                usuario: user.usuario,
                email: user.email,
                password: user.password,
                full_name: user.fullName,
                address: user.address,
                phone: user.phone,
                birth_date: user.birthDate ? user.birthDate.split('T')[0] : undefined,
            })
            .pipe(
                map((res) => ({ success: res.statusCode < 300, message: res.message ?? '¡Cuenta creada exitosamente!' })),
                catchError((err) => {
                    const msg = err.error?.error ?? 'Error al registrar. Intenta de nuevo.';
                    return of({ success: false, message: msg });
                })
            );
    }

    logout(): void {
        this.deleteCookie(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
    }

    isLoggedIn(): boolean {
        return !!this.getCookie(TOKEN_KEY);
    }

    getToken(): string | null {
        return this.getCookie(TOKEN_KEY);
    }

    // ── Cookie helpers ───────────────────────────────────────────────────────

    private setCookie(name: string, value: string, days: number): void {
        const expires = new Date(Date.now() + days * 86400000).toUTCString();
        document.cookie = `${name}=${encodeURIComponent(value)};expires=${expires};path=/;SameSite=Strict`;
    }

    private getCookie(name: string): string | null {
        const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
        return match ? decodeURIComponent(match[2]) : null;
    }

    private deleteCookie(name: string): void {
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
    }

    getCurrentUser(): string {
        return this.getStoredUser()?.email ?? '';
    }

    getCurrentUserId(): string {
        return this.getStoredUser()?.userId ?? '';
    }

    hasPermission(permission: string): boolean {
        const stored = this.getStoredUser();
        return stored?.permissions.includes(permission as Permission) ?? false;
    }

    /** Returns demo credentials shown in the login helper */
    getHardcodedCredentials(): { email: string; password: string }[] {
        return [
            { email: 'admin@miapp.com', password: 'Admin@12345' },
            { email: 'usuario@miapp.com', password: 'User@12345!' },
            { email: 'test@miapp.com', password: 'Test#12345' },
        ];
    }

    /** In-memory helpers (solo para UsuariosComponent legacy) */
    getUserPermissions(email: string): Permission[] {
        return this.userPermissionsMap[email] ?? [];
    }

    setUserPermissions(email: string, permissions: Permission[]): void {
        this.userPermissionsMap[email] = [...permissions];
    }

    getAllAvailablePermissions(): Permission[] {
        return [...ALL_PERMISSIONS];
    }

    getPermissionCatalog(): Observable<{ clave: string; descripcion: string }[]> {
        return this.http
            .get<{ data: { clave: string; descripcion: string }[] }>(`${API}/users/permissions`, this.authHeaders())
            .pipe(map(res => res.data ?? []), catchError(() => of([])));
    }

    // ── User management HTTP API ─────────────────────────────────────────────

    private authHeaders() {
        return { headers: new HttpHeaders({ Authorization: `Bearer ${this.getToken() ?? ''}` }) };
    }

    createUser(data: {
        nombre: string;
        apellido: string;
        email: string;
        activo: boolean;
        grupo_id?: number | null;
    }): Observable<{ success: boolean; message: string; id?: string }> {
        const body: any = {
            nombre: data.nombre,
            apellido: data.apellido,
            email: data.email,
            activo: data.activo,
        };
        if (data.grupo_id) body.grupo_id = data.grupo_id;
        return this.http
            .post<any>(`${API}/users`, body, this.authHeaders())
            .pipe(
                map((res) => ({ success: true, message: res.message ?? 'Usuario creado', id: res.data?.id })),
                catchError((err) => of({ success: false, message: err.error?.message ?? 'Error al crear usuario.' }))
            );
    }

    getUsers(): Observable<BackendUser[]> {
        return this.http
            .get<{ statusCode: number; intOpCode: string; data: any[] }>(`${API}/users`, this.authHeaders())
            .pipe(
                map((res) => (res.data ?? []).map(adaptUser)),
                catchError(() => of([]))
            );
    }

    getUserPermissionsFromBackend(userId: string): Observable<Permission[]> {
        return this.http
            .get<{ statusCode: number; intOpCode: string; data: string[] }>(`${API}/users/${userId}/permissions`, this.authHeaders())
            .pipe(
                map((res) => (res.data ?? []) as Permission[]),
                catchError(() => of([]))
            );
    }

    /**
     * Actualiza permisos en el backend. Si el userId coincide con el usuario
     * actualmente logueado, actualiza también su localStorage para que la
     * directiva hasPermission refleje el cambio de inmediato.
     */
    saveUserPermissions(userId: string, permissions: Permission[]): Observable<void> {
        return this.http
            .put<any>(`${API}/users/${userId}/permissions`, { permissions }, this.authHeaders())
            .pipe(
                tap(() => {
                    const stored = this.getStoredUser();
                    if (stored && stored.userId === userId) {
                        stored.permissions = permissions;
                        localStorage.setItem(USER_KEY, JSON.stringify(stored));
                    }
                }),
                map(() => undefined),
                catchError(() => of(undefined))
            );
    }

    updateUser(userId: string, data: { full_name?: string; activo?: boolean }): Observable<void> {
        return this.http
            .put<any>(`${API}/users/${userId}`, data, this.authHeaders())
            .pipe(map(() => undefined), catchError(() => of(undefined)));
    }

    deleteUser(userId: string): Observable<void> {
        return this.http
            .delete(`${API}/users/${userId}`, this.authHeaders())
            .pipe(map(() => undefined));
    }

    private getStoredUser(): StoredUser | null {
        const raw = localStorage.getItem(USER_KEY);
        if (!raw) return null;
        try {
            return JSON.parse(raw);
        } catch {
            return null;
        }
    }
}

// ── Backend user shape ───────────────────────────────────────────────────────
export interface BackendUser {
    id: string;
    usuario: string;
    email: string;
    fullName: string;
    activo: boolean;
}

function adaptUser(u: any): BackendUser {
    return {
        id: u.id,
        usuario: u.usuario ?? '',
        email: u.email,
        fullName: u.full_name ?? u.email,
        activo: u.activo ?? true,
    };
}
