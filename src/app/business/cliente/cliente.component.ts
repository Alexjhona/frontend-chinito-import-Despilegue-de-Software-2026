import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../core/services/auth.service';
import { Subscription } from 'rxjs';
import { DataRefreshService } from '../../core/services/data-refresh.service';

interface Cliente {
  id?: number;
  dniOrRuc: string;
  razonSocialONombre: string;
  direccion: string;
  telefono: string;
  nombres?: string;
  apellidoPaterno?: string;
  apellidoMaterno?: string;
  nombre?: string;
  razonSocial?: string;
}

interface DniConsulta {
  dni: string;
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  nombreCompleto: string;
}

@Component({
  selector: 'app-cliente',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './cliente.component.html',
})
export class ClienteComponent implements OnDestroy {
  clientes: Cliente[] = [];
  mostrarFormulario = false;
  editCliente: Cliente | null = null;
  formCliente: Cliente = this.crearClienteVacio();
  busqueda: string = ''; // NUEVO
  paginaClientes = 1;
  readonly elementosPorPagina = 10;
  mensajeExito = '';
  errorFormulario = '';
  mensajeDni = '';
  consultandoDni = false;
  ultimoDniConsultado = '';
  telefonoAdvertencia = false;
  accionPendiente: 'editar' | 'eliminar' | null = null;
  clientePendiente: Cliente | null = null;
  private readonly apiUrl = 'http://localhost:8080/api/clientes';
  private readonly consultaDniUrl = 'http://localhost:8080/auth/dni';
  private consultaDniId = 0;
  private readonly refreshSub: Subscription;

  constructor(
    private readonly http: HttpClient,
    private readonly authService: AuthService,
    private readonly dataRefresh: DataRefreshService,
  ) {
    this.cargarClientes();
    this.refreshSub = this.dataRefresh.refresh$.subscribe(() => this.cargarClientes());
  }

  ngOnDestroy() {
    this.refreshSub.unsubscribe();
  }

  get puedeEscribir(): boolean {
    return this.authService.hasPermission('clientes-write');
  }

  cargarClientes() {
    this.http.get<Cliente[]>(this.apiUrl).subscribe(data => this.clientes = data.map(cliente => this.normalizarCliente(cliente)));
  }

  // NUEVO: filtro para la tabla
  get clientesFiltrados(): Cliente[] {
    const texto = this.normalizarTexto(this.busqueda);
    if (!texto) return this.clientes;
    return this.clientes.filter(c =>
      this.normalizarTexto(c.dniOrRuc).includes(texto) ||
      this.normalizarTexto(this.getNombreCliente(c)).includes(texto)
    );
  }

  get clientesPaginados(): Cliente[] {
    this.ajustarPaginaClientes();
    const inicio = (this.paginaClientes - 1) * this.elementosPorPagina;
    return this.clientesFiltrados.slice(inicio, inicio + this.elementosPorPagina);
  }

  get totalPaginasClientes(): number {
    return Math.max(1, Math.ceil(this.clientesFiltrados.length / this.elementosPorPagina));
  }

  cambiarPaginaClientes(cambio: number) {
    this.paginaClientes = Math.min(Math.max(this.paginaClientes + cambio, 1), this.totalPaginasClientes);
  }

  private ajustarPaginaClientes() {
    if (this.paginaClientes > this.totalPaginasClientes) {
      this.paginaClientes = this.totalPaginasClientes;
    }
  }

  getNombreCliente(cliente: Cliente): string {
    const nombreSeparado = `${cliente.nombres || ''} ${cliente.apellidoPaterno || ''} ${cliente.apellidoMaterno || ''}`
      .replace(/\s+/g, ' ')
      .trim();
    return nombreSeparado || cliente.razonSocialONombre || cliente.nombre || cliente.razonSocial || '';
  }

  private normalizarTexto(valor: string | undefined | null): string {
    return (valor || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase();
  }

  guardar(form?: NgForm) {
    if (!this.puedeEscribir) return;
    this.mensajeExito = '';
    this.errorFormulario = '';
    this.prepararClienteParaGuardar();

    if (
      form?.invalid ||
      this.documentoClienteInvalido() ||
      !this.formCliente.nombres ||
      !this.formCliente.apellidoPaterno ||
      !this.formCliente.apellidoMaterno
    ) {
      this.errorFormulario = 'Revisa los campos obligatorios antes de guardar.';
      return;
    }

    if (!this.editCliente && this.clientes.some(cliente => cliente.dniOrRuc === this.formCliente.dniOrRuc)) {
      this.errorFormulario = 'Este DNI ya está registrado. Ingresa otro DNI para agregar un cliente nuevo.';
      return;
    }

    if (this.editCliente?.id) {
      // Editar
      this.http.put<Cliente>(`${this.apiUrl}/${this.editCliente.id}`, this.formCliente).subscribe({
        next: () => {
          this.cargarClientes();
          this.resetFormulario();
          this.mensajeExito = 'Cliente actualizado correctamente.';
        },
        error: error => this.mostrarErrorGuardado(error),
      });
    } else {
      // Nuevo
      this.http.post<Cliente>(this.apiUrl, this.formCliente).subscribe({
        next: () => {
          this.cargarClientes();
          this.resetFormulario();
          this.mensajeExito = 'Cliente agregado correctamente.';
        },
        error: error => this.mostrarErrorGuardado(error),
      });
    }
  }

  private mostrarErrorGuardado(error: HttpErrorResponse): void {
    this.errorFormulario = `No se pudo guardar el cliente (HTTP ${error.status || 0}).`;
  }

  consultarDniCliente() {
    this.sanitizarDocumentoCliente();
    const dni = this.formCliente.dniOrRuc;

    if (dni !== this.ultimoDniConsultado) {
      this.formCliente.nombres = '';
      this.formCliente.apellidoPaterno = '';
      this.formCliente.apellidoMaterno = '';
      this.formCliente.razonSocialONombre = '';
    }

    if (dni.length !== 8) {
      this.mensajeDni = '';
      this.consultandoDni = false;
      this.ultimoDniConsultado = '';
      this.consultaDniId++;
      return;
    }

    if (this.ultimoDniConsultado === dni && this.getNombreCliente(this.formCliente)) return;

    const consultaActual = ++this.consultaDniId;
    this.consultandoDni = true;
    this.mensajeDni = 'Consultando DNI...';
    this.ultimoDniConsultado = dni;

    this.http.get<DniConsulta>(`${this.consultaDniUrl}/${dni}`).subscribe({
      next: data => {
        if (consultaActual !== this.consultaDniId || this.formCliente.dniOrRuc !== dni) return;

        this.formCliente.nombres = (data.nombres || '').trim();
        this.formCliente.apellidoPaterno = (data.apellidoPaterno || '').trim();
        this.formCliente.apellidoMaterno = (data.apellidoMaterno || '').trim();
        this.formCliente.razonSocialONombre = this.getNombreCliente(this.formCliente);
        this.mensajeDni = 'Nombres y apellidos cargados desde la API.';
        this.consultandoDni = false;
      },
      error: () => {
        if (consultaActual !== this.consultaDniId || this.formCliente.dniOrRuc !== dni) return;

        this.mensajeDni = 'No se encontro el DNI en la API gratuita.';
        this.consultandoDni = false;
      },
    });
  }

  sanitizarDocumentoCliente() {
    this.formCliente.dniOrRuc = (this.formCliente.dniOrRuc || '').replace(/\D/g, '').slice(0, 11);
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

  get tituloConfirmacion(): string {
    return this.accionPendiente === 'editar'
      ? '¿Editar este cliente?'
      : '¿Eliminar este cliente?';
  }

  get mensajeConfirmacion(): string {
    const nombre = this.clientePendiente ? this.getNombreCliente(this.clientePendiente) || this.clientePendiente.dniOrRuc : 'este cliente';

    return this.accionPendiente === 'editar'
      ? `Vas a abrir la edición de ${nombre}.`
      : `Esta acción eliminará a ${nombre}.`;
  }

  solicitarEditar(cliente: Cliente) {
    if (!this.puedeEscribir) return;
    this.accionPendiente = 'editar';
    this.clientePendiente = cliente;
  }

  solicitarEliminar(cliente: Cliente) {
    if (!this.puedeEscribir) return;
    this.accionPendiente = 'eliminar';
    this.clientePendiente = cliente;
  }

  confirmarAccion() {
    if (!this.accionPendiente || !this.clientePendiente) return;

    if (this.accionPendiente === 'editar') {
      this.editar(this.clientePendiente);
    } else {
      this.eliminarCliente(this.clientePendiente.id);
    }

    this.cancelarConfirmacion();
  }

  cancelarConfirmacion() {
    this.accionPendiente = null;
    this.clientePendiente = null;
  }

  eliminarCliente(id: number | undefined) {
    if (!this.puedeEscribir) return;
    if(!id) return;
    this.http.delete(`${this.apiUrl}/${id}`).subscribe(() => {
      this.cargarClientes();
      this.mensajeExito = 'Cliente eliminado correctamente.';
    });
  }

  editar(cliente: Cliente) {
    if (!this.puedeEscribir) return;
    this.mensajeExito = '';
    this.errorFormulario = '';
    this.mensajeDni = '';
    this.consultandoDni = false;
    this.telefonoAdvertencia = false;
    this.editCliente = cliente;
    this.formCliente = this.normalizarCliente({ ...cliente });
    this.ultimoDniConsultado = this.formCliente.dniOrRuc || '';
    this.mostrarFormulario = true;
  }

  nuevoCliente() {
    if (!this.puedeEscribir) return;
    this.editCliente = null;
    this.formCliente = this.crearClienteVacio();
    this.mensajeExito = '';
    this.errorFormulario = '';
    this.mensajeDni = '';
    this.ultimoDniConsultado = '';
    this.telefonoAdvertencia = false;
    this.mostrarFormulario = true;
  }

  cancelar() {
    this.resetFormulario();
  }

  private prepararClienteParaGuardar() {
    this.sanitizarDocumentoCliente();
    this.formCliente.nombres = (this.formCliente.nombres || '').trim();
    this.formCliente.apellidoPaterno = (this.formCliente.apellidoPaterno || '').trim();
    this.formCliente.apellidoMaterno = (this.formCliente.apellidoMaterno || '').trim();
    this.formCliente.razonSocialONombre = this.getNombreCliente(this.formCliente);
    this.formCliente.direccion = '';
    this.formCliente.telefono = '';
  }

  private documentoClienteInvalido(): boolean {
    const documento = this.formCliente.dniOrRuc || '';
    return documento.length !== 8 && documento.length !== 11;
  }

  soloNumerosTelefono() {
    const telefonoLimpio = (this.formCliente.telefono || '').replace(/\D/g, '').slice(0, 9);
    this.telefonoAdvertencia = this.formCliente.telefono !== telefonoLimpio;
    this.formCliente.telefono = telefonoLimpio;
  }

  get telefonoPeruInvalido(): boolean {
    const telefono = this.formCliente.telefono || '';
    return telefono.length > 0 && (telefono.length !== 9 || !telefono.startsWith('9'));
  }

  private crearClienteVacio(): Cliente {
    return {
      dniOrRuc: '',
      razonSocialONombre: '',
      direccion: '',
      telefono: '',
      nombres: '',
      apellidoPaterno: '',
      apellidoMaterno: '',
    };
  }

  private normalizarCliente(cliente: Cliente): Cliente {
    const nombres = (cliente.nombres || '').replace(/\s+/g, ' ').trim();
    const apellidoPaterno = (cliente.apellidoPaterno || '').trim();
    const apellidoMaterno = (cliente.apellidoMaterno || '').trim();
    const nombreLegacy = nombres || (cliente.razonSocialONombre || cliente.nombre || cliente.razonSocial || '').replace(/\s+/g, ' ').trim();
    const base = {
      ...this.crearClienteVacio(),
      ...cliente,
      dniOrRuc: cliente.dniOrRuc || '',
      razonSocialONombre: cliente.razonSocialONombre || cliente.nombre || cliente.razonSocial || '',
      direccion: cliente.direccion || '',
      telefono: cliente.telefono || '',
    };

    if (apellidoPaterno || apellidoMaterno) {
      return { ...base, nombres, apellidoPaterno, apellidoMaterno };
    }

    const partes = nombreLegacy.split(' ').filter(Boolean);
    if (partes.length < 3) {
      return { ...base, nombres, apellidoPaterno, apellidoMaterno };
    }

    return {
      ...base,
      apellidoPaterno: partes[0],
      apellidoMaterno: partes[1],
      nombres: partes.slice(2).join(' '),
    };
  }

  private resetFormulario() {
    this.mostrarFormulario = false;
    this.editCliente = null;
    this.errorFormulario = '';
    this.mensajeDni = '';
    this.consultandoDni = false;
    this.ultimoDniConsultado = '';
    this.telefonoAdvertencia = false;
    this.formCliente = this.crearClienteVacio();
  }
}
