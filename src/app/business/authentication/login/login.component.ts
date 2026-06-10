import { Component } from '@angular/core';
import { AuthService } from '../../../core/services/auth.service';
import { HttpErrorResponse } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

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

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  login(): void {
    this.errorMessage = '';
    const user = this.user.trim();

    if (!user || !this.password) {
      this.errorMessage = 'Completa usuario y contrasena';
      return;
    }

    this.isLoading = true;

    this.authService.login(user, this.password).subscribe({
      next: () => {
        this.isLoading = false;
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        console.error('Login failed', err);
        this.isLoading = false;
        this.errorMessage = this.getLoginErrorMessage(err);
      }
    });
  }

  private getLoginErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse && error.status === 400) {
      return 'Usuario o contrasena incorrectos.';
    }

    if (error instanceof HttpErrorResponse && error.status === 0) {
      return 'No hay conexion con el backend. Verifica que Gateway y ms-auth esten levantados.';
    }

    return 'No se pudo iniciar sesion. Intenta nuevamente.';
  }
}
