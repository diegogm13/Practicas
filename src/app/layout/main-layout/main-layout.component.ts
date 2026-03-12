import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { MenuModule } from 'primeng/menu';
import { BreadcrumbModule } from 'primeng/breadcrumb';
import { AuthService } from '../../services/auth.service';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';

@Component({
    selector: 'app-main-layout',
    standalone: true,
    imports: [CommonModule, RouterModule, ButtonModule, MenuModule, BreadcrumbModule],
    templateUrl: './main-layout.component.html',
    styleUrl: './main-layout.component.css',
})
export class MainLayoutComponent implements OnInit, OnDestroy {
    isLoggedIn = false;

    menuItems: MenuItem[] = [];

    breadcrumbItems: MenuItem[] = [];
    homeItem: MenuItem = { icon: 'pi pi-home', routerLink: '/dashboard', label: 'Inicio' };

    private routerSub!: Subscription;

    constructor(
        private authService: AuthService,
        private router: Router
    ) {}

    ngOnInit(): void {
        this.isLoggedIn = this.authService.isLoggedIn();
        this.buildMenu();
        this.updateBreadcrumb(this.router.url);

        // Update breadcrumb on every navigation
        this.routerSub = this.router.events
            .pipe(filter((e) => e instanceof NavigationEnd))
            .subscribe((e: any) => {
                this.isLoggedIn = this.authService.isLoggedIn();
                this.buildMenu();
                this.updateBreadcrumb(e.urlAfterRedirects ?? e.url);
            });
    }

    ngOnDestroy(): void {
        this.routerSub?.unsubscribe();
    }

    buildMenu(): void {
        const url = this.router.url;

        this.menuItems = [
            {
                label: 'Inicio',
                icon: 'pi pi-home',
                routerLink: '/dashboard',
                styleClass: url === '/dashboard' ? 'menu-active-item' : '',
            },
            {
                label: 'Grupos',
                icon: 'pi pi-users',
                routerLink: '/dashboard/grupos',
                styleClass: (url.includes('/dashboard/grupos') || url.includes('/dashboard/tickets/')) ? 'menu-active-item' : '',
                visible: this.authService.hasPermission('group:view'),
            },
            {
                label: 'Usuarios',
                icon: 'pi pi-user-edit',
                routerLink: '/dashboard/usuarios',
                styleClass: url.includes('/dashboard/usuarios') ? 'menu-active-item' : '',
                visible: this.authService.hasPermission('users:view'),
            },
            {
                label: 'Perfil',
                icon: 'pi pi-user',
                routerLink: '/dashboard/perfil',
                styleClass: url.includes('/dashboard/perfil') ? 'menu-active-item' : '',
            },
        ];
    }

    updateBreadcrumb(url: string): void {
        if (url.includes('/dashboard/tickets/')) {
            const grupoId = url.split('/dashboard/tickets/')[1]?.split('/')[0];
            const grupoNames: Record<string, string> = { '1': 'Grupo Alpha', '2': 'Grupo Beta', '3': 'Grupo Gamma' };
            const nombre = grupoNames[grupoId] ?? `Grupo ${grupoId}`;
            this.breadcrumbItems = [{ label: 'Grupos', routerLink: '/dashboard/grupos' }, { label: `Tickets — ${nombre}` }];
        } else if (url.includes('/dashboard/grupos')) {
            this.breadcrumbItems = [{ label: 'Grupos' }];
        } else if (url.includes('/dashboard/usuarios')) {
            this.breadcrumbItems = [{ label: 'Usuarios' }];
        } else if (url.includes('/dashboard/perfil')) {
            this.breadcrumbItems = [{ label: 'Perfil' }];
        } else if (url.includes('/dashboard/reportes')) {
            this.breadcrumbItems = [{ label: 'Reportes' }];
        } else {
            this.breadcrumbItems = [];
        }
    }

    logout(): void {
        this.authService.logout();
        this.isLoggedIn = false;
        this.router.navigate(['/login']);
    }

    navigateLogin(): void {
        this.router.navigate(['/login']);
    }

    navigateRegister(): void {
        this.router.navigate(['/register']);
    }
}
