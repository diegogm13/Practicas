import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of, forkJoin } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { AuthService } from './auth.service';

export interface Comentario {
    autor: string;
    texto: string;
    fecha: Date;
}

export interface HistorialEntry {
    cambio: string;
    fecha: Date;
    autor: string;
}

export type EstadoTicket = 'Pendiente' | 'En Progreso' | 'Revisión' | 'Finalizado';
export type PrioridadTicket = 'Baja' | 'Media' | 'Alta' | 'Crítica';

export interface Ticket {
    id: number;
    titulo: string;
    descripcion: string;
    estado: EstadoTicket;
    /** UUID del usuario asignado (del backend) */
    asignadoA: string;
    /** UUID del creador (del backend) */
    creador: string;
    prioridad: PrioridadTicket;
    fechaCreacion: Date;
    fechaLimite: Date;
    comentarios: Comentario[];
    historial: HistorialEntry[];
    grupoId: number;
}

export interface GroupMember {
    id: number;
    userId: string;
    email: string;
    nombre: string;
    grupoId: number;
}

export interface GroupInfo {
    id: number;
    nombre: string;
    categoria: string;
    nivel: string;
    autorId: string;
}

const API = 'http://localhost:3000';

const ESTADO_IDS: Record<EstadoTicket, number> = {
    'Pendiente': 1,
    'En Progreso': 2,
    'Revisión': 3,
    'Finalizado': 4,
};

@Injectable({ providedIn: 'root' })
export class TicketService {
    constructor(
        private http: HttpClient,
        private authService: AuthService,
    ) {}

    private options() {
        const token = this.authService.getToken();
        return { headers: new HttpHeaders({ Authorization: `Bearer ${token ?? ''}` }) };
    }

    private adaptTicket(t: any): Ticket {
        return {
            id: t.id,
            titulo: t.titulo,
            descripcion: t.descripcion ?? '',
            estado: (t.ticket_estados?.nombre ?? 'Pendiente') as EstadoTicket,
            prioridad: (t.prioridad ?? 'Media') as PrioridadTicket,
            asignadoA: t.asignado_a ?? '',
            creador: t.creador_id ?? '',
            fechaCreacion: new Date(t.fecha_creacion),
            fechaLimite: new Date(t.fecha_limite),
            grupoId: t.grupo_id,
            comentarios: [],
            historial: [],
        };
    }

    private toDateStr(d: Date | string | null | undefined): string {
        if (!d) return '';
        const date = d instanceof Date ? d : new Date(d);
        return date.toISOString().split('T')[0];
    }

    // ── Tickets ──────────────────────────────────────────────────────────────

    getTicketsByGroup(grupoId: number): Observable<Ticket[]> {
        return this.http
            .get<{ statusCode: number; intOpCode: string; data: any[] }>(`${API}/tickets?grupoId=${grupoId}`, this.options())
            .pipe(
                map((res) => (res.data ?? []).map((t) => this.adaptTicket(t))),
                catchError(() => of([]))
            );
    }

    getAllTickets(): Observable<Ticket[]> {
        return this.http
            .get<{ statusCode: number; intOpCode: string; data: any[] }>(`${API}/tickets`, this.options())
            .pipe(
                map((res) => (res.data ?? []).map((t) => this.adaptTicket(t))),
                catchError(() => of([]))
            );
    }

    /** Devuelve solo los tickets asignados al usuario actual (filtrado en el backend) */
    getMyTickets(): Observable<Ticket[]> {
        return this.http
            .get<{ statusCode: number; intOpCode: string; data: any[] }>(`${API}/tickets?mine=true`, this.options())
            .pipe(
                map((res) => (res.data ?? []).map((t) => this.adaptTicket(t))),
                catchError(() => of([]))
            );
    }

    createTicket(payload: {
        titulo: string;
        descripcion: string;
        prioridad?: string;
        fecha_limite: string;
        grupo_id: number;
        asignado_a?: string | null;
    }): Observable<Ticket> {
        return this.http
            .post<{ statusCode: number; intOpCode: string; data: any }>(`${API}/tickets`, payload, this.options())
            .pipe(map((res) => this.adaptTicket(res.data)));
    }

    updateTicket(id: number, changes: Partial<Ticket>): Observable<void> {
        const ops: Observable<any>[] = [];

        const putBody: any = {};
        if (changes.titulo !== undefined) putBody.titulo = changes.titulo;
        if (changes.descripcion !== undefined) putBody.descripcion = changes.descripcion;
        if (changes.prioridad !== undefined) putBody.prioridad = changes.prioridad;
        if (changes.fechaLimite !== undefined) putBody.fecha_limite = this.toDateStr(changes.fechaLimite);
        if (changes.asignadoA !== undefined) putBody.asignado_a = changes.asignadoA || null;

        if (Object.keys(putBody).length > 0) {
            ops.push(this.http.put(`${API}/tickets/${id}`, putBody, this.options()));
        }

        if (changes.estado !== undefined) {
            const estado_id = ESTADO_IDS[changes.estado] ?? 1;
            ops.push(this.http.patch(`${API}/tickets/${id}/estado`, { estado_id }, this.options()));
        }

        if (ops.length === 0) return of(undefined);
        return forkJoin(ops).pipe(map(() => undefined));
    }

    changeEstado(id: number, estado: EstadoTicket): Observable<void> {
        const estado_id = ESTADO_IDS[estado] ?? 1;
        return this.http
            .patch(`${API}/tickets/${id}/estado`, { estado_id }, this.options())
            .pipe(map(() => undefined));
    }

    deleteTicket(id: number): Observable<void> {
        return this.http
            .delete(`${API}/tickets/${id}`, this.options())
            .pipe(map(() => undefined));
    }

    addComment(ticketId: number, texto: string): Observable<any> {
        return this.http.post(
            `${API}/tickets/${ticketId}/comments`,
            { texto },
            this.options()
        );
    }

    // ── Groups ───────────────────────────────────────────────────────────────

    getGroups(): Observable<GroupInfo[]> {
        return this.http
            .get<{ statusCode: number; intOpCode: string; data: any[] }>(`${API}/groups`, this.options())
            .pipe(
                map((res) =>
                    (res.data ?? []).map((g) => ({
                        id: g.id,
                        nombre: g.nombre,
                        categoria: g.categoria,
                        nivel: g.nivel ?? '',
                        autorId: g.autor_id ?? '',
                    }))
                ),
                catchError(() => of([]))
            );
    }

    createGroup(payload: { nombre: string; categoria: string; nivel: string; autor_email?: string }): Observable<GroupInfo> {
        return this.http
            .post<{ statusCode: number; intOpCode: string; data: any }>(`${API}/groups`, payload, this.options())
            .pipe(
                map((res) => ({
                    id: res.data.id,
                    nombre: res.data.nombre,
                    categoria: res.data.categoria,
                    nivel: res.data.nivel ?? '',
                    autorId: res.data.autor_id ?? '',
                }))
            );
    }

    updateGroup(id: number, payload: { nombre: string; categoria: string; nivel: string; autor_email?: string }): Observable<GroupInfo> {
        return this.http
            .put<{ statusCode: number; intOpCode: string; data: any }>(`${API}/groups/${id}`, payload, this.options())
            .pipe(
                map((res) => ({
                    id: res.data.id,
                    nombre: res.data.nombre,
                    categoria: res.data.categoria,
                    nivel: res.data.nivel ?? '',
                    autorId: res.data.autor_id ?? '',
                }))
            );
    }

    deleteGroup(id: number): Observable<void> {
        return this.http
            .delete(`${API}/groups/${id}`, this.options())
            .pipe(map(() => undefined));
    }

    getMembersByGroup(grupoId: number): Observable<GroupMember[]> {
        return this.http
            .get<{ statusCode: number; intOpCode: string; data: any[] }>(`${API}/groups/${grupoId}/members`, this.options())
            .pipe(
                map((res) =>
                    (res.data ?? []).map((m) => ({
                        id: m.id,
                        userId: m.usuario_id ?? '',
                        grupoId,
                        email: m.usuarios?.email ?? '',
                        nombre: m.usuarios?.full_name ?? m.usuarios?.email ?? '',
                    }))
                ),
                catchError(() => of([]))
            );
    }

    addMember(grupoId: number, usuarioId: string): Observable<boolean> {
        return this.http
            .post<any>(`${API}/groups/${grupoId}/members`, { usuario_id: usuarioId }, this.options())
            .pipe(map(() => true), catchError(() => of(false)));
    }

    removeMember(grupoId: number, usuarioId: string): Observable<boolean> {
        return this.http
            .delete(`${API}/groups/${grupoId}/members/${usuarioId}`, this.options())
            .pipe(map(() => true), catchError(() => of(false)));
    }

    getMemberPermissions(grupoId: number, usuarioId: string): Observable<string[]> {
        return this.http
            .get<{ statusCode: number; intOpCode: string; data: string[] }>(`${API}/groups/${grupoId}/member-permissions/${usuarioId}`, this.options())
            .pipe(map(res => res.data ?? []), catchError(() => of([])));
    }

    saveMemberPermissions(grupoId: number, usuarioId: string, permissions: string[]): Observable<boolean> {
        return this.http
            .put<any>(`${API}/groups/${grupoId}/member-permissions/${usuarioId}`, { permissions }, this.options())
            .pipe(map(() => true), catchError(() => of(false)));
    }

    // ── Stats (computed client-side from all tickets) ─────────────────────────

    getStatsGlobal(): Observable<Record<EstadoTicket, number>> {
        return this.getAllTickets().pipe(
            map((tickets) => ({
                'Pendiente': tickets.filter((t) => t.estado === 'Pendiente').length,
                'En Progreso': tickets.filter((t) => t.estado === 'En Progreso').length,
                'Revisión': tickets.filter((t) => t.estado === 'Revisión').length,
                'Finalizado': tickets.filter((t) => t.estado === 'Finalizado').length,
            }))
        );
    }
}
