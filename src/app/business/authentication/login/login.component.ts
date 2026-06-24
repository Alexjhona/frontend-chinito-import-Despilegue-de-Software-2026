import { Component } from '@angular/core';
import { AuthService } from '../../../core/services/auth.service';
import { HttpErrorResponse } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuditService } from '../../../core/services/audit.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, CommonModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  user: string = '';
  password: string = '';
  errorMessage: string = '';
  isLoading = false;
  private readonly credentialCheckDelayMs = 1400;

  constructor(
    private authService: AuthService,
    private router: Router,
    private auditService: AuditService,
  ) {}

  login(): void {
    this.errorMessage = '';
    const user = this.user.trim();

    if (!user || !this.password) {
      this.errorMessage = 'Completa usuario o correo y contrasena';
      return;
    }

    this.isLoading = true;

    window.setTimeout(() => {
      this.authService.login(user, this.password).subscribe({
        next: () => {
          this.auditService.registrar('Inicio de sesión');
          this.isLoading = false;
          this.router.navigate(['/dashboard']);
        },
        error: (err) => {
          console.error('Login failed', err);
          this.isLoading = false;
          this.errorMessage = this.getLoginErrorMessage(err);
        }
      });
    }, this.credentialCheckDelayMs);
  }

  private getLoginErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse && error.status === 400) {
      return 'Usuario, correo o contrasena incorrectos.';
    }

    if (error instanceof HttpErrorResponse && error.status === 0) {
      return 'No hay conexion con el backend. Verifica que Gateway y ms-auth esten levantados.';
    }

    return 'No se pudo iniciar sesion. Intenta nuevamente.';
  }
}
