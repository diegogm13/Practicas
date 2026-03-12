import { Directive, Input, OnInit, TemplateRef, ViewContainerRef } from '@angular/core';
import { AuthService } from '../services/auth.service';

/**
 * Directiva estructural que muestra el elemento solo si el usuario
 * tiene el permiso indicado.
 *
 * Uso:
 *   <p-button *hasPermission="'group:add'" ...></p-button>
 */
@Directive({
    selector: '[hasPermission]',
    standalone: true,
})
export class HasPermissionDirective implements OnInit {
    @Input() hasPermission = '';

    constructor(
        private templateRef: TemplateRef<unknown>,
        private viewContainer: ViewContainerRef,
        private authService: AuthService,
    ) {}

    ngOnInit(): void {
        if (this.authService.hasPermission(this.hasPermission)) {
            this.viewContainer.createEmbeddedView(this.templateRef);
        } else {
            this.viewContainer.clear();
        }
    }
}
