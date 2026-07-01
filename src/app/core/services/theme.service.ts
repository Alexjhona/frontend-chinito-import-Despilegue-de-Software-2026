import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type TemaSistema = 'Claro' | 'Oscuro';
export type ColorSistema = 'Azul' | 'Verde' | 'Rojo' | 'Morado' | 'Naranja';

export interface ThemeConfig {
  tema: TemaSistema;
  colorPrincipal: ColorSistema;
}

const DEFAULT_THEME: ThemeConfig = {
  tema: 'Claro',
  colorPrincipal: 'Azul',
};

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private readonly storageKey = 'chinito_theme_config';
  private readonly themeSubject = new BehaviorSubject<ThemeConfig>(this.leerTema());
  readonly theme$ = this.themeSubject.asObservable();

  get theme(): ThemeConfig {
    return this.themeSubject.value;
  }

  aplicar(config: ThemeConfig): void {
    const tema = this.normalizar(config);
    if (globalThis.window !== undefined) {
      localStorage.setItem(this.storageKey, JSON.stringify(tema));
    }
    this.themeSubject.next(tema);
    this.aplicarDocumento(tema);
  }

  inicializar(): void {
    this.aplicarDocumento(this.theme);
  }

  private leerTema(): ThemeConfig {
    const raw = globalThis.window === undefined ? null : localStorage.getItem(this.storageKey);
    if (!raw) return DEFAULT_THEME;

    try {
      return this.normalizar(JSON.parse(raw));
    } catch {
      return DEFAULT_THEME;
    }
  }

  private normalizar(config: Partial<ThemeConfig>): ThemeConfig {
    const temas: TemaSistema[] = ['Claro', 'Oscuro'];
    const colores: ColorSistema[] = ['Azul', 'Verde', 'Rojo', 'Morado', 'Naranja'];
    return {
      tema: temas.includes(config.tema as TemaSistema) ? config.tema as TemaSistema : DEFAULT_THEME.tema,
      colorPrincipal: colores.includes(config.colorPrincipal as ColorSistema) ? config.colorPrincipal as ColorSistema : DEFAULT_THEME.colorPrincipal,
    };
  }

  private aplicarDocumento(config: ThemeConfig): void {
    if (typeof document === 'undefined') return;

    const root = document.documentElement;
    root.dataset['theme'] = config.tema.toLowerCase();
    root.dataset['color'] = config.colorPrincipal.toLowerCase();
  }
}
