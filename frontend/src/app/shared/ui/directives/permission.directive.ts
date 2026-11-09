import {
  Directive,
  Input,
  TemplateRef,
  ViewContainerRef,
  inject,
  OnInit,
} from '@angular/core';
import { AuthService } from '../services/auth.service';

/**
 * PermissionDirective — Directiva estructural para RBAC (Role-Based Access Control).
 *
 * Muestra o oculta elementos del DOM según el rol del usuario autenticado.
 *
 * @usage
 * ```html
 * <!-- Mostrar solo para admins -->
 * <button *appPermission="'admin'">Eliminar</button>
 *
 * <!-- Mostrar para múltiples roles -->
 * <app-panel *appPermission="['admin', 'manager']">Configuración</app-panel>
 *
 * <!-- Con fallback (else) -->
 * <div *appPermission="'admin'; else noAccess">Panel admin</div>
 * <ng-template #noAccess>
 *   <p>No tienes permiso para ver esto.</p>
 * </ng-template>
 * ```
 *
 * @setup Registrar en app.config.ts:
 * No requiere registro global — es standalone. Solo importar donde se use.
 *
 * @customize
 * Ajusta `hasPermission()` para usar tu modelo de permisos real.
 * Actualmente usa `user.role` del AuthService.
 */
@Directive({
  selector: '[appPermission]',
  standalone: true,
})
export class PermissionDirective implements OnInit {
  private tpl = inject(TemplateRef<unknown>);
  private vcr = inject(ViewContainerRef);
  private auth = inject(AuthService);

  /** Rol o lista de roles permitidos */
  @Input() appPermission: string | string[] = [];

  /** Template alternativo cuando no tiene permiso */
  @Input() appPermissionElse?: TemplateRef<unknown>;

  ngOnInit(): void {
    this.updateView();
  }

  private updateView(): void {
    this.vcr.clear();

    if (this.hasPermission()) {
      this.vcr.createEmbeddedView(this.tpl);
    } else if (this.appPermissionElse) {
      this.vcr.createEmbeddedView(this.appPermissionElse);
    }
  }

  /**
   * Verifica si el usuario tiene el rol requerido.
   * @customize Ajusta esta lógica a tu modelo de permisos.
   */
  private hasPermission(): boolean {
    const user = this.auth.currentUser();
    if (!user) return false;

    const userRole = user['role'] as string | undefined;
    if (!userRole) return false;

    const roles = Array.isArray(this.appPermission)
      ? this.appPermission
      : [this.appPermission];

    // 'superadmin' tiene acceso a todo
    if (userRole === 'superadmin') return true;

    return roles.includes(userRole);
  }
}
