import { Injectable } from '@angular/core';

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
    asignadoA: string;
    prioridad: PrioridadTicket;
    fechaCreacion: Date;
    fechaLimite: Date;
    comentarios: Comentario[];
    historial: HistorialEntry[];
    grupoId: number;
}

export interface GroupMember {
    id: number;
    email: string;
    nombre: string;
    rol: 'Admin' | 'Miembro';
    grupoId: number;
}

@Injectable({ providedIn: 'root' })
export class TicketService {
    private nextTicketId = 10;
    private nextMemberId = 10;

    private tickets: Ticket[] = [
        {
            id: 1, grupoId: 1,
            titulo: 'Configurar entorno de staging',
            descripcion: 'Levantar entorno de staging con Docker Compose para pruebas de integración.',
            estado: 'En Progreso', prioridad: 'Alta',
            asignadoA: 'admin@miapp.com',
            fechaCreacion: new Date('2026-02-10'), fechaLimite: new Date('2026-03-15'),
            comentarios: [{ autor: 'admin@miapp.com', texto: 'Iniciando configuración de Docker.', fecha: new Date('2026-02-11') }],
            historial: [{ cambio: 'Estado cambiado a En Progreso', fecha: new Date('2026-02-12'), autor: 'admin@miapp.com' }],
        },
        {
            id: 2, grupoId: 1,
            titulo: 'Revisar vulnerabilidades de seguridad',
            descripcion: 'Ejecutar OWASP ZAP y corregir hallazgos críticos.',
            estado: 'Pendiente', prioridad: 'Crítica',
            asignadoA: 'usuario@miapp.com',
            fechaCreacion: new Date('2026-02-15'), fechaLimite: new Date('2026-03-10'),
            comentarios: [], historial: [],
        },
        {
            id: 3, grupoId: 1,
            titulo: 'Optimizar consultas SQL del módulo de reportes',
            descripcion: 'Varias consultas superan los 3 segundos en producción.',
            estado: 'Revisión', prioridad: 'Media',
            asignadoA: 'test@miapp.com',
            fechaCreacion: new Date('2026-02-18'), fechaLimite: new Date('2026-03-20'),
            comentarios: [], historial: [],
        },
        {
            id: 4, grupoId: 1,
            titulo: 'Actualizar dependencias de Node.js',
            descripcion: 'Migrar a Node 22 LTS y actualizar paquetes desactualizados.',
            estado: 'Finalizado', prioridad: 'Baja',
            asignadoA: 'admin@miapp.com',
            fechaCreacion: new Date('2026-01-20'), fechaLimite: new Date('2026-02-28'),
            comentarios: [], historial: [],
        },
        {
            id: 5, grupoId: 2,
            titulo: 'Diseñar campaña de email marketing Q2',
            descripcion: 'Crear plantillas y segmentar audiencias para el segundo trimestre.',
            estado: 'Pendiente', prioridad: 'Media',
            asignadoA: 'usuario@miapp.com',
            fechaCreacion: new Date('2026-02-20'), fechaLimite: new Date('2026-04-01'),
            comentarios: [], historial: [],
        },
        {
            id: 6, grupoId: 2,
            titulo: 'Análisis de competencia SEO',
            descripcion: 'Identificar palabras clave y estrategia de contenido.',
            estado: 'En Progreso', prioridad: 'Alta',
            asignadoA: 'test@miapp.com',
            fechaCreacion: new Date('2026-02-22'), fechaLimite: new Date('2026-03-25'),
            comentarios: [], historial: [],
        },
        {
            id: 7, grupoId: 3,
            titulo: 'Capacitación equipo ventas CRM nuevo',
            descripcion: 'Preparar material y sesiones de entrenamiento para el nuevo CRM.',
            estado: 'Pendiente', prioridad: 'Alta',
            asignadoA: 'admin@miapp.com',
            fechaCreacion: new Date('2026-03-01'), fechaLimite: new Date('2026-03-30'),
            comentarios: [], historial: [],
        },
        {
            id: 8, grupoId: 3,
            titulo: 'Reporte trimestral de ventas Q1',
            descripcion: 'Consolidar datos de ventas y preparar presentación para directivos.',
            estado: 'Revisión', prioridad: 'Crítica',
            asignadoA: 'usuario@miapp.com',
            fechaCreacion: new Date('2026-03-02'), fechaLimite: new Date('2026-03-08'),
            comentarios: [], historial: [],
        },
        {
            id: 9, grupoId: 3,
            titulo: 'Actualizar precios catálogo 2026',
            descripcion: 'Ajustar precios según inflación y nuevos costos de producción.',
            estado: 'Finalizado', prioridad: 'Media',
            asignadoA: 'test@miapp.com',
            fechaCreacion: new Date('2026-01-10'), fechaLimite: new Date('2026-02-15'),
            comentarios: [], historial: [],
        },
    ];

    private members: GroupMember[] = [
        { id: 1, grupoId: 1, email: 'admin@miapp.com', nombre: 'Admin Principal', rol: 'Admin' },
        { id: 2, grupoId: 1, email: 'usuario@miapp.com', nombre: 'Usuario Estándar', rol: 'Miembro' },
        { id: 3, grupoId: 1, email: 'test@miapp.com', nombre: 'Test User', rol: 'Miembro' },
        { id: 4, grupoId: 2, email: 'usuario@miapp.com', nombre: 'Usuario Estándar', rol: 'Admin' },
        { id: 5, grupoId: 2, email: 'test@miapp.com', nombre: 'Test User', rol: 'Miembro' },
        { id: 6, grupoId: 3, email: 'test@miapp.com', nombre: 'Test User', rol: 'Admin' },
        { id: 7, grupoId: 3, email: 'admin@miapp.com', nombre: 'Admin Principal', rol: 'Miembro' },
        { id: 8, grupoId: 3, email: 'usuario@miapp.com', nombre: 'Usuario Estándar', rol: 'Miembro' },
    ];

    getTicketsByGroup(grupoId: number): Ticket[] {
        return this.tickets.filter((t) => t.grupoId === grupoId);
    }

    getAllTickets(): Ticket[] {
        return [...this.tickets];
    }

    getTicketById(id: number): Ticket | undefined {
        return this.tickets.find((t) => t.id === id);
    }

    createTicket(ticket: Omit<Ticket, 'id' | 'comentarios' | 'historial'>): Ticket {
        const newTicket: Ticket = {
            ...ticket,
            id: this.nextTicketId++,
            comentarios: [],
            historial: [{ cambio: 'Ticket creado', fecha: new Date(), autor: ticket.asignadoA }],
        };
        this.tickets = [...this.tickets, newTicket];
        return newTicket;
    }

    updateTicket(id: number, changes: Partial<Ticket>, autor: string): void {
        const idx = this.tickets.findIndex((t) => t.id === id);
        if (idx === -1) return;
        const prev = this.tickets[idx];
        const historialEntry: HistorialEntry = {
            cambio: this.buildChangeLog(prev, changes),
            fecha: new Date(),
            autor,
        };
        this.tickets[idx] = {
            ...prev,
            ...changes,
            historial: [...prev.historial, historialEntry],
        };
        this.tickets = [...this.tickets];
    }

    deleteTicket(id: number): void {
        this.tickets = this.tickets.filter((t) => t.id !== id);
    }

    addComment(ticketId: number, texto: string, autor: string): void {
        const ticket = this.tickets.find((t) => t.id === ticketId);
        if (!ticket) return;
        ticket.comentarios = [...ticket.comentarios, { autor, texto, fecha: new Date() }];
        this.tickets = [...this.tickets];
    }

    getMembersByGroup(grupoId: number): GroupMember[] {
        return this.members.filter((m) => m.grupoId === grupoId);
    }

    addMember(grupoId: number, email: string, nombre: string): { success: boolean; message: string } {
        const exists = this.members.some((m) => m.grupoId === grupoId && m.email === email);
        if (exists) return { success: false, message: 'El usuario ya es miembro del grupo.' };
        this.members = [...this.members, { id: this.nextMemberId++, grupoId, email, nombre, rol: 'Miembro' }];
        return { success: true, message: 'Miembro añadido correctamente.' };
    }

    removeMember(id: number): void {
        this.members = this.members.filter((m) => m.id !== id);
    }

    getStatsGlobal(): Record<EstadoTicket, number> {
        return {
            'Pendiente': this.tickets.filter((t) => t.estado === 'Pendiente').length,
            'En Progreso': this.tickets.filter((t) => t.estado === 'En Progreso').length,
            'Revisión': this.tickets.filter((t) => t.estado === 'Revisión').length,
            'Finalizado': this.tickets.filter((t) => t.estado === 'Finalizado').length,
        };
    }

    getStatsByGroup(grupoId: number): Record<EstadoTicket, number> {
        const group = this.tickets.filter((t) => t.grupoId === grupoId);
        return {
            'Pendiente': group.filter((t) => t.estado === 'Pendiente').length,
            'En Progreso': group.filter((t) => t.estado === 'En Progreso').length,
            'Revisión': group.filter((t) => t.estado === 'Revisión').length,
            'Finalizado': group.filter((t) => t.estado === 'Finalizado').length,
        };
    }

    private buildChangeLog(prev: Ticket, changes: Partial<Ticket>): string {
        const parts: string[] = [];
        if (changes.estado && changes.estado !== prev.estado)
            parts.push(`Estado: "${prev.estado}" → "${changes.estado}"`);
        if (changes.prioridad && changes.prioridad !== prev.prioridad)
            parts.push(`Prioridad: "${prev.prioridad}" → "${changes.prioridad}"`);
        if (changes.asignadoA && changes.asignadoA !== prev.asignadoA)
            parts.push(`Asignado: "${prev.asignadoA}" → "${changes.asignadoA}"`);
        if (changes.titulo && changes.titulo !== prev.titulo)
            parts.push(`Título actualizado`);
        return parts.length ? parts.join('; ') : 'Ticket actualizado';
    }
}
