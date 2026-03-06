import { Routes } from '@angular/router';

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
                loadComponent: () =>
                    import('./pages/grupos/grupos.component').then((m) => m.GruposComponent),
            },
            {
                path: 'usuarios',
                loadComponent: () =>
                    import('./pages/usuarios/usuarios.component').then((m) => m.UsuariosComponent),
            },
            {
                path: 'perfil',
                loadComponent: () =>
                    import('./pages/perfil/perfil.component').then((m) => m.PerfilComponent),
            },
            {
                path: 'tickets/:grupoId',
                loadComponent: () =>
                    import('./pages/tickets/tickets.component').then((m) => m.TicketsComponent),
            },
        ],
    },
    { path: '**', redirectTo: '' },
];
