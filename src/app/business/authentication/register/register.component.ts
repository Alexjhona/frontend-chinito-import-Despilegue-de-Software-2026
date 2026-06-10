import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css'
})
export class RegisterComponent {
  user: string = '';
  password: string = '';
  confirmPassword: string = '';
  errorMessage: string = '';
  successMessage: string = '';
  isLoading = false;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  register(): void {
    this.errorMessage = '';
    this.successMessage = '';
    const user = this.user.trim();

    if (!user || !this.password || !this.confirmPassword) {
      this.errorMessage = 'Completa todos los campos';
      return;
    }

    if (this.password !== this.confirmPassword) {
      this.errorMessage = 'Las contraseñas no coinciden';
      return;
    }

    this.isLoading = true;

    this.authService.register(user, this.password).subscribe({
      next: () => {
        this.isLoading = false;
        this.successMessage = 'Usuario registrado correctamente. Ahora puedes iniciar sesion.';
        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 2000);
      },
      error: (err) => {
        console.error('Register failed', err);
        this.isLoading = false;
        this.errorMessage = this.getRegisterErrorMessage(err);
      }
    });
  }

  private getRegisterErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse && error.status === 400) {
      return 'No se pudo registrar el usuario. Puede que ya exista o que los datos no sean validos.';
    }

    if (error instanceof HttpErrorResponse && error.status === 0) {
      return 'No hay conexion con el backend. Verifica que Gateway y ms-auth esten levantados.';
    }

    return 'No se pudo registrar el usuario. Revisa la consola o intenta nuevamente.';
  }
}
