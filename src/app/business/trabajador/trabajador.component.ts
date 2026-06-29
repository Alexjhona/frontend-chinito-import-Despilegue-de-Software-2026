import { CommonModule } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, OnDestroy } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { DataRefreshService } from '../../core/services/data-refresh.service';

type RolTrabajador = 'SUB_ADMIN' | 'VENDEDOR' | 'ALMACENERO' | 'COMPRAS' | 'CAJERO';

interface Trabajador {
  id?: number;
  nombre: string;
  apellido: string;
  dni: string;
  celular: string;
  correo: string;
  userName?: string;
  password?: string;
  rol: RolTrabajador | 'ADMIN' | 'OWNER';
  activo?: boolean;
}

interface DniConsulta {
  dni?: string;
  nombres?: string;
  apellidoPaterno?: string;
  apellidoMaterno?: string;
  nombreCompleto?: string;
}

@Component({
  selector: 'app-trabajador',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './trabajador.component.html',
})
export class TrabajadorComponent implements OnDestroy {
  trabajadores: Trabajador[] = [];
  mostrarFormulario = false;
  editTrabajador: Trabajador | null = null;
  accionPendiente: 'editar' | 'eliminar' | 'reset' | 'impersonar' | null = null;
  trabajadorPendiente: Trabajador | null = null;
  busqueda = '';
  paginaTrabajadores = 1;
  readonly elementosPorPagina = 10;
  mensaje = '';
  errorFormulario = '';
  mensajeDni = '';
  consultandoDni = false;
  ultimoDniConsultado = '';
  dniConDatosCargados = '';
  enlaceInvitacion = '';
  correoInvitacion = '';
  mensajeInvitacion = '';
  estadoEnvioInvitacion: 'idle' | 'enviando' | 'enviado' | 'error' = 'idle';
  tipoInvitacion: 'registro' | 'reset' = 'registro';
  readonly correoRemitenteInvitacion = 'guerrycastillo9@gmail.com';
  readonly roles: RolTrabajador[] = ['SUB_ADMIN', 'VENDEDOR', 'CAJERO', 'ALMACENERO', 'COMPRAS'];
  readonly permisosPorRol: Record<string, string[]> = {
    OWNER: ['Acceso total', 'Trabajadores', 'Crear usuarios', 'Editar/eliminar'],
    ADMIN: ['Acceso total', 'Trabajadores', 'Crear usuarios', 'Editar/eliminar'],
    SUB_ADMIN: ['Clientes', 'Proveedores', 'Categorías', 'Productos', 'Ventas', 'Sin trabajadores'],
    VENDEDOR: ['Clientes crear/ver', 'Productos solo ver', 'Ventas registrar', 'Boleta/PDF'],
    CAJERO: ['Ver clientes', 'Ver productos', 'Registrar ventas/cobros'],
    ALMACENERO: ['Ver proveedores', 'Ver categorías', 'Agregar categorías', 'Productos crear/editar'],
    COMPRAS: ['Gestionar proveedores', 'Ver categorías', 'Productos', 'Agregar productos'],
  };

  nombreRol(rol: string): string {
    if (rol === 'OWNER') return 'OWNER / ADMIN';
    if (rol === 'SUB_ADMIN') return 'SUB ADMIN';
    return rol;
  }

  formTrabajador: Trabajador = this.crearTrabajadorVacio();
  private readonly apiUrl = '/auth/trabajadores';
  private readonly correoInvitacionUrl = '/auth/trabajadores/enviar-invitacion';
  private readonly consultaDniUrl = '/auth/dni';
  private readonly refreshSub: Subscription;

  constructor(
    private readonly http: HttpClient,
    private readonly dataRefresh: DataRefreshService,
    private readonly authService: AuthService,
    private readonly router: Router,
  ) {
    this.cargarTrabajadores();
    this.refreshSub = this.dataRefresh.refresh$.subscribe(() => this.cargarTrabajadores());
  }

  ngOnDestroy() {
    this.refreshSub.unsubscribe();
  }

  cargarTrabajadores() {
    this.http.get<Trabajador[]>(this.apiUrl).subscribe({
      next: data => this.trabajadores = data,
      error: () => this.mensaje = 'No se pudo cargar trabajadores. Verifica que tu usuario sea ADMIN.',
    });
  }

  get trabajadoresFiltrados(): Trabajador[] {
    const texto = this.normalizar(this.busqueda);
    if (texto) {
      return this.trabajadores.filter(t =>
        this.normalizar(`${t.nombre} ${t.apellido}`).includes(texto) ||
        this.normalizar(t.dni).includes(texto) ||
        this.normalizar(t.correo || t.userName).includes(texto) ||
        this.normalizar(t.rol).includes(texto)
      );
    }
    return this.trabajadores;
  }

  get trabajadoresPaginados(): Trabajador[] {
    this.ajustarPaginaTrabajadores();
    const inicio = (this.paginaTrabajadores - 1) * this.elementosPorPagina;
    return this.trabajadoresFiltrados.slice(inicio, inicio + this.elementosPorPagina);
  }

  get totalPaginasTrabajadores(): number {
    return Math.max(1, Math.ceil(this.trabajadoresFiltrados.length / this.elementosPorPagina));
  }

  cambiarPaginaTrabajadores(cambio: number) {
    this.paginaTrabajadores = Math.min(Math.max(this.paginaTrabajadores + cambio, 1), this.totalPaginasTrabajadores);
  }

  private ajustarPaginaTrabajadores() {
    if (this.paginaTrabajadores > this.totalPaginasTrabajadores) {
      this.paginaTrabajadores = this.totalPaginasTrabajadores;
    }
  }

  nombreCompleto(trabajador: Trabajador): string {
    const nombre = `${trabajador.nombre || ''} ${trabajador.apellido || ''}`.trim();
    return nombre || trabajador.correo || trabajador.userName || 'Trabajador';
  }

  iniciales(trabajador: Trabajador): string {
    const partes = this.nombreCompleto(trabajador).split(/\s+/).filter(Boolean);
    return partes.slice(0, 2).map(parte => parte.charAt(0).toUpperCase()).join('') || 'T';
  }

  get tituloConfirmacion(): string {
    if (this.accionPendiente === 'editar') return '¿Editar este trabajador?';
    if (this.accionPendiente === 'reset') return '¿Restablecer contraseña?';
    if (this.accionPendiente === 'impersonar') return '¿Entrar como este trabajador?';
    return '¿Eliminar este trabajador?';
  }

  get mensajeConfirmacion(): string {
    const nombre = this.trabajadorPendiente ? this.nombreCompleto(this.trabajadorPendiente) : 'este trabajador';

    if (this.accionPendiente === 'editar') {
      return `Vas a abrir la edición de ${nombre}.`;
    }

    if (this.accionPendiente === 'reset') {
      return `Se enviará un enlace al correo de ${nombre} para crear una nueva contraseña.`;
    }

    if (this.accionPendiente === 'impersonar') {
      return `Tu sesión cambiará temporalmente al rol y permisos de ${nombre}.`;
    }

    return `Esta acción eliminará a ${nombre}.`;
  }

  get puedeImpersonar(): boolean {
    const rol = this.authService.getRol();
    return rol === 'OWNER' || rol === 'ADMIN';
  }

  solicitarEditar(trabajador: Trabajador) {
    this.accionPendiente = 'editar';
    this.trabajadorPendiente = trabajador;
  }

  solicitarEliminar(trabajador: Trabajador) {
    this.accionPendiente = 'eliminar';
    this.trabajadorPendiente = trabajador;
  }

  solicitarRestablecerPassword(trabajador: Trabajador) {
    this.accionPendiente = 'reset';
    this.trabajadorPendiente = trabajador;
  }

  solicitarIngresarComo(trabajador: Trabajador) {
    this.accionPendiente = 'impersonar';
    this.trabajadorPendiente = trabajador;
  }

  confirmarAccion() {
    if (!this.accionPendiente || !this.trabajadorPendiente) return;

    if (this.accionPendiente === 'editar') {
      this.editar(this.trabajadorPendiente);
    } else if (this.accionPendiente === 'reset') {
      this.restablecerPassword(this.trabajadorPendiente);
    } else if (this.accionPendiente === 'impersonar') {
      this.ingresarComoTrabajador(this.trabajadorPendiente);
    } else {
      this.eliminar(this.trabajadorPendiente);
    }

    this.cancelarConfirmacion();
  }

  cancelarConfirmacion() {
    this.accionPendiente = null;
    this.trabajadorPendiente = null;
  }

  nuevoTrabajador() {
    this.mensaje = '';
    this.errorFormulario = '';
    this.mensajeInvitacion = '';
    this.mensajeDni = '';
    this.ultimoDniConsultado = '';
    this.dniConDatosCargados = '';
    this.editTrabajador = null;
    this.formTrabajador = this.crearTrabajadorVacio();
    this.mostrarFormulario = true;
  }

  editar(trabajador: Trabajador) {
    this.mensaje = '';
    this.errorFormulario = '';
    this.mensajeInvitacion = '';
    this.mensajeDni = '';
    this.ultimoDniConsultado = trabajador.dni || '';
    this.dniConDatosCargados = trabajador.dni || '';
    this.editTrabajador = trabajador;
    this.formTrabajador = { ...trabajador, password: '' };
    this.mostrarFormulario = true;
  }

  guardar(form?: NgForm) {
    this.mensaje = '';
    this.errorFormulario = '';
    this.limpiarFormulario();

    const errorTrabajador = this.primerErrorTrabajador(form);
    if (errorTrabajador) {
      this.errorFormulario = errorTrabajador;
      return;
    }

    const editando = Boolean(this.editTrabajador?.id);
    const duplicado = this.obtenerDuplicadoTrabajador();
    if (duplicado) {
      this.errorFormulario = duplicado;
      return;
    }

    const payload: Trabajador = {
      ...this.formTrabajador,
      userName: this.formTrabajador.correo,
    };

    if (editando) {
      delete payload.password;
    }

    if (!editando) {
      this.crearTrabajadorLegacy(payload);
      return;
    }

    this.http.put<Trabajador>(`${this.apiUrl}/${this.editTrabajador?.id}`, payload).subscribe({
      next: trabajadorGuardado => {
        this.finalizarGuardadoTrabajador(trabajadorGuardado || payload, true);
      },
      error: () => {
        this.errorFormulario = 'No se pudo guardar. Revisa que el DNI, correo o usuario no estén repetidos.';
      },
    });
  }

  errorCampoTrabajador(campo: 'nombre' | 'apellido' | 'dni' | 'celular' | 'correo' | 'rol'): string {
    const valor = this.formTrabajador[campo];

    switch (campo) {
      case 'nombre': return String(valor || '').trim() ? '' : 'El nombre es obligatorio.';
      case 'apellido': return String(valor || '').trim() ? '' : 'El apellido es obligatorio.';
      case 'dni': return this.errorDniTrabajador();
      case 'celular': return this.errorCelularTrabajador();
      case 'correo': return this.errorCorreoTrabajador();
      case 'rol': return this.formTrabajador.rol ? '' : 'Selecciona un rol.';
    }
  }

  private errorDniTrabajador(): string {
    if (!this.formTrabajador.dni) return 'El DNI es obligatorio.';
    return this.formTrabajador.dni.length === 8 ? '' : 'El DNI debe tener 8 dígitos.';
  }

  private errorCelularTrabajador(): string {
    const celular = this.formTrabajador.celular;
    if (!celular) return 'El celular es obligatorio.';
    if (celular.length !== 9) return 'El celular debe tener 9 dígitos.';
    return celular.startsWith('9') ? '' : 'El celular debe comenzar con 9.';
  }

  private errorCorreoTrabajador(): string {
    const correo = this.formTrabajador.correo;
    if (!correo) return 'El correo es obligatorio.';
    return this.esCorreoValido(correo) ? '' : 'Ingresa un correo válido.';
  }

  private esCorreoValido(correo: string): boolean {
    if (Array.from(correo).some(caracter => caracter.trim() === '')) return false;

    const arroba = correo.indexOf('@');
    if (arroba <= 0 || arroba !== correo.lastIndexOf('@')) return false;

    const dominio = correo.slice(arroba + 1);
    const punto = dominio.indexOf('.');
    return punto > 0 && punto < dominio.length - 1;
  }

  private primerErrorTrabajador(form?: NgForm): string {
    const campos: Array<'nombre' | 'apellido' | 'dni' | 'celular' | 'correo' | 'rol'> = ['nombre', 'apellido', 'dni', 'celular', 'correo', 'rol'];
    const errorCampo = campos.map(campo => this.errorCampoTrabajador(campo)).find(Boolean);
    if (errorCampo) return errorCampo;
    if (form?.invalid) return 'Revisa los campos marcados antes de guardar.';
    return '';
  }

  sanitizarDniTrabajador() {
    const dniAnterior = this.formTrabajador.dni;
    this.formTrabajador.dni = this.formTrabajador.dni.replaceAll(/\D/g, '').slice(0, 8);

    if (this.dniConDatosCargados && this.formTrabajador.dni !== this.dniConDatosCargados) {
      this.formTrabajador.nombre = '';
      this.formTrabajador.apellido = '';
      this.dniConDatosCargados = '';
    }

    if (dniAnterior !== this.formTrabajador.dni || this.ultimoDniConsultado !== this.formTrabajador.dni) {
      this.ultimoDniConsultado = '';
    }

    this.mensajeDni = '';
    this.consultandoDni = false;
  }

  sanitizarCelularTrabajador() {
    this.formTrabajador.celular = this.formTrabajador.celular.replaceAll(/\D/g, '').slice(0, 9);
  }

  permitirSoloNumeros(event: KeyboardEvent) {
    const teclasPermitidas = ['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'Home', 'End'];
    const esAtajo = event.ctrlKey || event.metaKey;

    if (teclasPermitidas.includes(event.key) || esAtajo || /^\d$/.test(event.key)) return;

    event.preventDefault();
  }

  permitirPegadoNumerico(event: ClipboardEvent) {
    const texto = event.clipboardData?.getData('text') || '';
    if (/\D/.test(texto)) event.preventDefault();
  }

  consultarDniTrabajador() {
    this.formTrabajador.dni = this.formTrabajador.dni.replaceAll(/\D/g, '').slice(0, 8);
    const dni = this.formTrabajador.dni;

    if (dni.length !== 8) {
      this.mensajeDni = '';
      this.consultandoDni = false;
      this.ultimoDniConsultado = '';
      this.dniConDatosCargados = '';
      return;
    }

    if (this.consultandoDni || this.ultimoDniConsultado === dni) return;

    this.consultandoDni = true;
    this.mensajeDni = 'Consultando DNI...';
    this.ultimoDniConsultado = dni;

    this.http.get<DniConsulta>(`${this.consultaDniUrl}/${dni}`).subscribe({
      next: data => {
        const datosDni = this.normalizarDatosDni(data);
        this.formTrabajador.nombre = datosDni.nombres;
        this.formTrabajador.apellido = datosDni.apellidos;
        this.mensajeDni = datosDni.nombres || datosDni.apellidos
          ? 'Nombres y apellidos cargados desde la API.'
          : 'No se encontro el DNI en la API gratuita.';
        this.dniConDatosCargados = datosDni.nombres || datosDni.apellidos ? dni : '';
        if (!datosDni.nombres && !datosDni.apellidos) {
          this.ultimoDniConsultado = '';
        }
        this.consultandoDni = false;
      },
      error: () => {
        this.mensajeDni = 'No se encontro el DNI en la API gratuita.';
        this.ultimoDniConsultado = '';
        this.dniConDatosCargados = '';
        this.consultandoDni = false;
      },
    });
  }

  eliminar(trabajador: Trabajador) {
    if (!trabajador.id) return;
    this.http.delete(`${this.apiUrl}/${trabajador.id}`).subscribe({
      next: () => {
        this.mensaje = 'Trabajador eliminado correctamente.';
        this.cargarTrabajadores();
      },
      error: error => {
        this.mensaje = error?.status === 403
          ? 'No tienes permiso para eliminar trabajadores. Ingresa con un usuario ADMIN.'
          : 'No se pudo eliminar el trabajador. Revisa si tiene movimientos asociados.';
      },
    });
  }

  restablecerPassword(trabajador: Trabajador) {
    if (!trabajador.correo) {
      this.mensaje = 'El trabajador no tiene correo para enviar el restablecimiento.';
      return;
    }

    this.prepararInvitacion(trabajador, 'reset');
    this.enviarCorreoInvitacionAutomatico(trabajador, 'reset');
    this.mensaje = 'Enviando enlace de restablecimiento al correo...';
  }

  ingresarComoTrabajador(trabajador: Trabajador) {
    if (!trabajador.id || !this.puedeImpersonar) return;

    this.mensaje = `Entrando como ${this.nombreCompleto(trabajador)}...`;
    this.authService.impersonateWorker(trabajador.id).subscribe({
      next: () => {
        this.router.navigate(['/dashboard']);
      },
      error: (error: HttpErrorResponse) => {
        this.mensaje = error.status === 403
          ? 'Solo OWNER o ADMIN pueden entrar como otro trabajador.'
          : 'No se pudo entrar como este trabajador. Revisa que el backend esté actualizado.';
      },
    });
  }

  cancelar() {
    this.mostrarFormulario = false;
    this.editTrabajador = null;
    this.errorFormulario = '';
    this.mensajeDni = '';
    this.consultandoDni = false;
    this.ultimoDniConsultado = '';
    this.dniConDatosCargados = '';
    this.formTrabajador = this.crearTrabajadorVacio();
  }

  private crearTrabajadorVacio(): Trabajador {
    return {
      nombre: '',
      apellido: '',
      dni: '',
      celular: '',
      correo: '',
      userName: '',
      rol: 'VENDEDOR',
      activo: true,
    };
  }

  private limpiarFormulario() {
    this.formTrabajador.nombre = this.formTrabajador.nombre.trim();
    this.formTrabajador.apellido = this.formTrabajador.apellido.trim();
    this.formTrabajador.dni = this.formTrabajador.dni.replaceAll(/\D/g, '').slice(0, 8);
    this.formTrabajador.celular = this.formTrabajador.celular.replaceAll(/\D/g, '').slice(0, 9);
    this.formTrabajador.correo = this.formTrabajador.correo.trim().toLowerCase();
    this.formTrabajador.userName = this.formTrabajador.correo;
  }

  private obtenerDuplicadoTrabajador(): string {
    const idActual = this.editTrabajador?.id;
    const dni = this.formTrabajador.dni;
    const correo = this.formTrabajador.correo.toLowerCase();
    const trabajadorConDni = this.trabajadores.find(trabajador =>
      trabajador.id !== idActual && (trabajador.dni || '') === dni
    );
    if (trabajadorConDni) {
      return `Ya existe un trabajador con el DNI ${dni}. Cambia el DNI o edita ese registro.`;
    }

    const trabajadorConCorreo = this.trabajadores.find(trabajador =>
      trabajador.id !== idActual && this.normalizarCorreo(trabajador.correo || trabajador.userName) === correo
    );
    if (trabajadorConCorreo) {
      return `Ya existe un trabajador con el correo ${correo}. Usa otro correo o edita ese registro.`;
    }

    return '';
  }

  private crearTrabajadorLegacy(payload: Trabajador) {
    const payloadLegacy: Trabajador = {
      ...payload,
      password: this.generarPasswordTemporal(),
    };

    this.http.post<Trabajador>(this.apiUrl, payloadLegacy).subscribe({
      next: trabajadorGuardado => {
        this.finalizarGuardadoTrabajador(trabajadorGuardado || payload, false);
      },
      error: () => {
        this.errorFormulario = 'No se pudo guardar. Revisa que el DNI, correo o usuario no estén repetidos.';
      },
    });
  }

  private finalizarGuardadoTrabajador(trabajador: Trabajador, editando: boolean) {
    if (!editando) {
      this.prepararInvitacion(trabajador, 'registro');
      this.enviarCorreoInvitacionAutomatico(trabajador, 'registro');
    }

    this.cancelar();
    this.mensaje = editando
      ? 'Trabajador actualizado correctamente.'
      : 'Trabajador registrado correctamente. Enviando invitación al correo...';
    this.cargarTrabajadores();
  }

  private generarPasswordTemporal(): string {
    const valorAleatorio = new Uint32Array(1);
    crypto.getRandomValues(valorAleatorio);
    return `Temp-${valorAleatorio[0]}-${this.formTrabajador.dni}`;
  }

  private prepararInvitacion(trabajador: Trabajador, tipo: 'registro' | 'reset' = 'registro') {
    const correo = (trabajador.correo || '').trim().toLowerCase();
    if (!correo) return;

    const nombre = this.nombreCompleto(trabajador);
    const rol = trabajador.rol || this.formTrabajador.rol;
    const origen = this.obtenerOrigenRegistro();
    const params = new URLSearchParams({
      correo,
      rol,
      nombre,
      modo: tipo,
    });

    this.tipoInvitacion = tipo;
    this.correoInvitacion = correo;
    this.enlaceInvitacion = `${origen}/registro-trabajador?${params.toString()}`;
    this.mensajeInvitacion = '';
  }

  private enviarCorreoInvitacionAutomatico(trabajador: Trabajador, tipo: 'registro' | 'reset' = 'registro') {
    if (!this.enlaceInvitacion || !this.correoInvitacion) return;

    this.estadoEnvioInvitacion = 'enviando';
    this.mensajeInvitacion = tipo === 'reset'
      ? `Enviando restablecimiento automáticamente desde ${this.correoRemitenteInvitacion}...`
      : `Enviando invitación automáticamente desde ${this.correoRemitenteInvitacion}...`;

    this.http.post(this.correoInvitacionUrl, {
      para: this.correoInvitacion,
      remitente: this.correoRemitenteInvitacion,
      nombre: this.nombreCompleto(trabajador),
      rol: trabajador.rol,
      enlaceRegistro: this.enlaceInvitacion,
      asunto: tipo === 'reset'
        ? 'Restablecer contraseña - Chinito Importaciones'
        : 'Registro de acceso - Chinito Importaciones',
    }).subscribe({
      next: () => {
        this.estadoEnvioInvitacion = 'enviado';
        this.mensaje = tipo === 'reset'
          ? 'Enlace de restablecimiento enviado al correo.'
          : 'Trabajador registrado correctamente. Invitación enviada al correo.';
        this.mensajeInvitacion = 'Correo enviado automáticamente.';
      },
      error: (error: HttpErrorResponse) => {
        this.estadoEnvioInvitacion = 'error';
        const mensajeBackend = typeof error.error === 'object' && error.error?.mensaje ? error.error.mensaje : '';
        this.mensaje = tipo === 'reset'
          ? 'No se pudo enviar el correo de restablecimiento.'
          : 'Trabajador registrado correctamente, pero el correo automático no se pudo enviar.';
        this.mensajeInvitacion = mensajeBackend || 'Revisa que el backend esté actualizado y tenga configurado MAIL_PASSWORD para Gmail.';
      },
    });
  }

  private obtenerOrigenRegistro(): string {
    return typeof globalThis.window !== 'undefined' ? globalThis.window.location.origin : 'http://localhost:4200';
  }

  private normalizar(valor: string | undefined | null): string {
    return (valor || '').normalize('NFD').replaceAll(/[\u0300-\u036f]/g, '').trim().toLowerCase();
  }

  private normalizarCorreo(valor: string | undefined | null): string {
    return (valor || '').trim().toLowerCase();
  }

  private normalizarDatosDni(data: DniConsulta): { nombres: string; apellidos: string } {
    const nombres = (data.nombres || '').replaceAll(/\s+/g, ' ').trim();
    const apellidoPaterno = (data.apellidoPaterno || '').replaceAll(/\s+/g, ' ').trim();
    const apellidoMaterno = (data.apellidoMaterno || '').replaceAll(/\s+/g, ' ').trim();
    const apellidos = `${apellidoPaterno} ${apellidoMaterno}`.replaceAll(/\s+/g, ' ').trim();

    if (nombres || apellidos) {
      return { nombres, apellidos };
    }

    const nombreCompleto = (data.nombreCompleto || '').replaceAll(/\s+/g, ' ').trim();
    if (!nombreCompleto) {
      return { nombres: '', apellidos: '' };
    }

    if (nombreCompleto.includes(',')) {
      const [apellidosParte, nombresParte] = nombreCompleto.split(',').map(parte => parte.trim());
      return { nombres: nombresParte || '', apellidos: apellidosParte || '' };
    }

    const partes = nombreCompleto.split(' ').filter(Boolean);
    if (partes.length < 3) {
      return { nombres: nombreCompleto, apellidos: '' };
    }

    return {
      nombres: partes.slice(2).join(' '),
      apellidos: partes.slice(0, 2).join(' '),
    };
  }

  estaActivo(trabajador: Trabajador | null | undefined): boolean {
    if (!trabajador || !this.authService.isAuthenticated()) return false;

    const payload = this.authService.getPayload();
    if (!payload) return false;

    const idSesion = String(payload.id || payload.userId || payload.trabajadorId || payload.workerId || '');
    const idTrabajador = trabajador.id ? String(trabajador.id) : '';
    if (idSesion && idTrabajador && idSesion === idTrabajador) return true;

    const identificadoresSesion = [
      payload.correo,
      payload.email,
      payload.userName,
      payload.username,
      payload.preferred_username,
      payload.sub,
    ].map(valor => this.normalizarCorreo(String(valor || ''))).filter(Boolean);

    const identificadoresTrabajador = [
      trabajador.correo,
      trabajador.userName,
    ].map(valor => this.normalizarCorreo(valor)).filter(Boolean);

    return identificadoresTrabajador.some(valor => identificadoresSesion.includes(valor));
  }
}
