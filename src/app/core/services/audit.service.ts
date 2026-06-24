import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { AuthService } from './auth.service';

export interface AuditEntry {
  fecha: string;
  usuario: string;
  accion: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuditService {
  private readonly storageKey = 'chinito_audit_log';
  private readonly auditSubject = new BehaviorSubject<AuditEntry[]>(this.leer());
  readonly audit$ = this.auditSubject.asObservable();

  constructor(private readonly authService: AuthService) {}

  get entries(): AuditEntry[] {
    return this.auditSubject.value;
  }

  registrar(accion: string): void {
    const entry: AuditEntry = {
      fecha: new Date().toLocaleString('es-PE'),
      usuario: this.usuarioActual(),
      accion,
    };
    const entries = [entry, ...this.entries].slice(0, 80);
    localStorage.setItem(this.storageKey, JSON.stringify(entries));
    this.auditSubject.next(entries);
  }

  private leer(): AuditEntry[] {
    const raw = typeof window === 'undefined' ? null : localStorage.getItem(this.storageKey);
    if (!raw) return [];

    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  private usuarioActual(): string {
    const payload = this.authService.getPayload();
    return payload?.userName || payload?.sub || payload?.correo || this.authService.getRol().toLowerCase();
  }
}
