import { Routes } from '@angular/router';
import { permissionGuard } from './guards/permission.guard';

export const routes: Routes = [
    {
        path: '',
        loadComponent: () =>
            import('./pages/landing/landing.component').then((m) => m.LandingComponent),
    },
    {
        path: 'login',
        loadComponent: () =>
            import('./pages/login/login.component').then((m) => m.LoginComponent),
    },
    {
        path: 'register',
        loadComponent: () =>
            import('./pages/register/register.component').then((m) => m.RegisterComponent),
    },
    {
        path: 'dashboard',
        loadComponent: () =>
            import('./layout/main-layout/main-layout.component').then(
                (m) => m.MainLayoutComponent
            ),
        children: [
            {
                path: '',
                loadComponent: () =>
                    import('./pages/dashboard/dashboard.component').then(
                        (m) => m.DashboardComponent
                    ),
            },
            {
                path: 'grupos',
                canActivate: [permissionGuard],
                data: { permission: 'group:view' },
                loadComponent: () =>
                    import('./pages/grupos/grupos.component').then((m) => m.GruposComponent),
            },
            {
                path: 'usuarios',
                canActivate: [permissionGuard],
                data: { permission: 'users:view' },
                loadComponent: () =>
                    import('./pages/usuarios/usuarios.component').then((m) => m.UsuariosComponent),
            },
            {
                path: 'perfil',
                canActivate: [permissionGuard],
                loadComponent: () =>
                    import('./pages/perfil/perfil.component').then((m) => m.PerfilComponent),
            },
            {
                path: 'tickets/:grupoId',
                canActivate: [permissionGuard],
                data: { permission: 'ticket:view' },
                loadComponent: () =>
                    import('./pages/tickets/tickets.component').then((m) => m.TicketsComponent),
            },
        ],
    },
    { path: '**', redirectTo: '' },
];
