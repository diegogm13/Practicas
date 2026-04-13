import { Directive, Input, DoCheck, TemplateRef, ViewContainerRef } from '@angular/core';
import { PermissionService } from '../services/permission.service';

/**
 * Directiva estructural que muestra el elemento solo si el usuario
 * tiene el permiso indicado. Se re-evalúa en cada ciclo de detección
 * para reflejar cambios de permisos sin recargar la página.
 *
 * Uso:
 *   <p-button *hasPermission="'group:add'" ...></p-button>
 */
@Directive({
    selector: '[hasPermission]',
    standalone: true,
})
export class HasPermissionDirective implements DoCheck {
    @Input() hasPermission = '';
    private hasView = false;

    constructor(
        private templateRef: TemplateRef<unknown>,
        private viewContainer: ViewContainerRef,
        private permissionService: PermissionService,
    ) {}

    ngDoCheck(): void {
        const allowed = this.permissionService.hasPermission(this.hasPermission);
        if (allowed && !this.hasView) {
            this.viewContainer.createEmbeddedView(this.templateRef);
            this.hasView = true;
        } else if (!allowed && this.hasView) {
            this.viewContainer.clear();
            this.hasView = false;
        }
    }
}
