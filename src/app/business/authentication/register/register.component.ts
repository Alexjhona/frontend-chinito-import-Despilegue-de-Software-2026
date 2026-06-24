import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css'
})
export class RegisterComponent {
  user: string = '';
  email: string = '';
  password: string = '';
  confirmPassword: string = '';
  errorMessage: string = '';
  successMessage: string = '';
  isLoading = false;
  rolInvitado = '';
  nombreInvitado = '';
  esInvitacionTrabajador = false;
  esRestablecimiento = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.route.queryParamMap.subscribe(params => {
      const correo = (params.get('correo') || '').trim().toLowerCase();
      this.rolInvitado = params.get('rol') || '';
      this.nombreInvitado = params.get('nombre') || '';
      this.esRestablecimiento = params.get('modo') === 'reset';
      this.esInvitacionTrabajador = Boolean(correo);

      if (correo) {
        this.email = correo;
      }
    });
  }

  register(): void {
    this.errorMessage = '';
    this.successMessage = '';

    if (!this.esInvitacionTrabajador) {
      this.errorMessage = 'El registro solo está disponible desde una invitación enviada al correo.';
      return;
    }

    const user = this.user.trim();
    const email = this.email.trim().toLowerCase();

    if (!user || !email || !this.password || !this.confirmPassword) {
      this.errorMessage = 'Completa todos los campos';
      return;
    }

    if (this.password !== this.confirmPassword) {
      this.errorMessage = 'Las contraseñas no coinciden';
      return;
    }

    this.isLoading = true;
    const request: Observable<unknown> = this.authService.activateWorker(email, this.password, user);

    request.subscribe({
      next: () => {
        this.isLoading = false;
        this.successMessage = this.esRestablecimiento
          ? 'Contraseña actualizada correctamente. Ahora puedes iniciar sesion con tu usuario o correo.'
          : 'Cuenta registrada correctamente. Ahora puedes iniciar sesion con tu usuario o correo.';
        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 2000);
      },
      error: (err: unknown) => {
        console.error('Register failed', err);
        this.isLoading = false;
        this.errorMessage = this.getRegisterErrorMessage(err);
      }
    });
  }

  private getRegisterErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse && typeof error.error === 'object' && error.error?.mensaje) {
      return error.error.mensaje;
    }

    if (error instanceof HttpErrorResponse && error.status === 400) {
      return 'No se pudo registrar la contraseña. Puede que el correo ya este activo o que los datos no sean validos.';
    }

    if (error instanceof HttpErrorResponse && (error.status === 404 || error.status === 405)) {
      return 'El backend aun no tiene activo el registro de trabajadores. Reinicia ms-auth y vuelve a intentar.';
    }

    if (error instanceof HttpErrorResponse && error.status === 0) {
      return 'No hay conexion con el backend. Verifica que Gateway y ms-auth esten levantados.';
    }

    return 'No se pudo registrar la contraseña. Revisa la consola o intenta nuevamente.';
  }
}
