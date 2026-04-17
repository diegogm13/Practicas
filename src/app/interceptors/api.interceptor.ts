import { HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { tap } from 'rxjs/operators';

/**
 * Puerto por prefijo de ruta.
 * gateway :3000 → cada microservicio en su propio puerto.
 */
const SERVICE_PORTS: { prefix: string; port: number }[] = [
    { prefix: '/auth',    port: 3001 },
    { prefix: '/users',   port: 3001 },
    { prefix: '/groups',  port: 3002 },
    { prefix: '/tickets', port: 3003 },
];

const GATEWAY = 'http://localhost:3000';

function resolveUrl(original: string): string {
    if (!original.startsWith(GATEWAY)) return original;
    const path = original.slice(GATEWAY.length); // e.g. '/tickets?mine=true'
    const match = SERVICE_PORTS.find((s) => path.startsWith(s.prefix));
    if (!match) return original;
    return `http://localhost:${match.port}${path}`;
}

export const apiInterceptor: HttpInterceptorFn = (req, next) => {
    const resolvedUrl = resolveUrl(req.url);
    const cloned = resolvedUrl !== req.url ? req.clone({ url: resolvedUrl }) : req;

    const start = performance.now();
    console.log(`%c[API] ▶ ${cloned.method} ${cloned.url}`, 'color:#6366f1;font-weight:bold');

    return next(cloned).pipe(
        tap({
            next: (event) => {
                if (event instanceof HttpResponse) {
                    const ms = Math.round(performance.now() - start);
                    const color = event.status < 400 ? '#22c55e' : '#ef4444';
                    console.log(
                        `%c[API] ◀ ${event.status} ${cloned.method} ${cloned.url} — ${ms}ms`,
                        `color:${color};font-weight:bold`,
                        event.body,
                    );
                }
            },
            error: (err) => {
                const ms = Math.round(performance.now() - start);
                console.error(
                    `[API] ✖ ${err.status ?? '0'} ${cloned.method} ${cloned.url} — ${ms}ms`,
                    err.message,
                );
            },
        }),
    );
};
