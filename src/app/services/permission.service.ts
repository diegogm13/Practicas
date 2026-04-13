import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';

const API = 'http://localhost:3000';
const USER_KEY = 'erp_user';
const TOKEN_KEY = 'erp_token';

/**
 * Servicio central de permisos.
 * Expone hasPermission() y refreshPermissionsForGroup()
 * para ser usado por la directiva HasPermission y cualquier componente.
 */
@Injectable({ providedIn: 'root' })
export class PermissionService {
    constructor(private http: HttpClient) {}

    /**
     * Verifica si el usuario actual tiene el permiso indicado.
     * Lee del localStorage donde AuthService guarda los datos del usuario.
     */
    hasPermission(permission: string): boolean {
        const stored = this.getStoredUser();
        return stored?.permissions?.includes(permission) ?? false;
    }

    /**
     * Refresca los permisos del usuario para un grupo específico
     * consultando el backend y actualizando el localStorage.
     */
    refreshPermissionsForGroup(groupId: string): void {
        const token = this.getToken();
        if (!token) return;

        this.http
            .get<{ statusCode: number; intOpCode: string; data: string[] }>(
                `${API}/auth/permissions/group/${groupId}`,
                { headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) }
            )
            .subscribe({
                next: (res) => {
                    const stored = this.getStoredUser();
                    if (!stored) return;
                    if (!stored.groupPermissions) stored.groupPermissions = {};
                    stored.groupPermissions[groupId] = res.data ?? [];
                    localStorage.setItem(USER_KEY, JSON.stringify(stored));
                },
                error: () => {},
            });
    }

    // ── helpers privados ────────────────────────────────────────────────────

    private getStoredUser(): any {
        const raw = localStorage.getItem(USER_KEY);
        if (!raw) return null;
        try { return JSON.parse(raw); } catch { return null; }
    }

    /** Lee el token desde la cookie */
    private getToken(): string | null {
        const match = document.cookie.match(new RegExp('(^| )' + TOKEN_KEY + '=([^;]+)'));
        return match ? decodeURIComponent(match[2]) : null;
    }
}
