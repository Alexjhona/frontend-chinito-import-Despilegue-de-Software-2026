import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';

interface LoginResponse {
  token: string;
}

interface RegisterResponse {
  id: number;
  userName: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private LOGIN_URL = 'https://album-tested-cgi-dragon.trycloudflare.com/auth/login';
  private REGISTER_URL = 'https://album-tested-cgi-dragon.trycloudflare.com/auth/create';
  private tokenKey = 'authToken';

  constructor(
    private httpClient: HttpClient,
    private router: Router
  ) {}

  login(user: string, password: string): Observable<LoginResponse> {
    return this.httpClient.post<LoginResponse>(this.LOGIN_URL, {
      userName: user,
      password: password
    }).pipe(
      tap((response) => {
        if (response.token) {
          this.setToken(response.token);
        }
      })
    );
  }

  register(user: string, password: string): Observable<RegisterResponse> {
    return this.httpClient.post<RegisterResponse>(this.REGISTER_URL, {
      userName: user,
      password: password
    });
  }

  private setToken(token: string): void {
    localStorage.setItem(this.tokenKey, token);
  }

  getToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(this.tokenKey);
    }
    return null;
  }

  isAuthenticated(): boolean {
    const token = this.getToken();

    if (!token) {
      return false;
    }

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const exp = payload.exp * 1000;
      return Date.now() < exp;
    } catch (error) {
      return false;
    }
  }

  logout(): void {
    localStorage.removeItem(this.tokenKey);
    this.router.navigate(['/login']);
  }
}
