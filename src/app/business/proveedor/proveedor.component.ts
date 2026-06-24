import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../core/services/auth.service';
import { Subscription } from 'rxjs';
import { DataRefreshService } from '../../core/services/data-refresh.service';

interface Proveedor {
  id?: number;
  dniOrRuc: string;
  razonSocialONombre: string;
  nombre?: string;
  razonSocial?: string;
  correoElectronico: string;
  telefono: string;
}

interface RucConsulta {
  nombre?: string;
  razonSocial?: string;
  nombreCompleto?: string;
  numeroDocumento?: string;
  correoElectronico?: string;
  correo?: string;
}

@Component({
  selector: 'app-proveedor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './proveedor.component.html',
  styleUrl: './proveedor.component.css',
})
export class ProveedorComponent implements OnDestroy {
  proveedores: Proveedor[] = [];
  mostrarFormulario = false;
  editProveedor: Proveedor | null = null;
  formProveedor: Proveedor = this.crearProveedorVacio();
  busqueda: string = ''; // NUEVO
  mensajeExito = '';
  errorFormulario = '';
  mensajeRuc = '';
  consultandoRuc = false;
  ultimoRucConsultado = '';
  telefonoAdvertencia = false;
  accionPendiente: 'editar' | 'eliminar' | null = null;
  proveedorPendiente: Proveedor | null = null;
  private apiUrl = 'http://localhost:8080/api/proveedores';
  private consultaRucUrl = 'http://localhost:8080/api/proveedores/ruc';
  private readonly refreshSub: Subscription;

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private dataRefresh: DataRefreshService,
  ) {
    this.cargarProveedores();
    this.refreshSub = this.dataRefresh.refresh$.subscribe(() => this.cargarProveedores());
  }

  ngOnDestroy() {
    this.refreshSub.unsubscribe();
  }

  get puedeEscribir(): boolean {
    return this.authService.hasPermission('proveedores-write');
  }

  cargarProveedores() {
    this.http.get<Proveedor[]>(this.apiUrl).subscribe(data => this.proveedores = data);
  }

  // NUEVO: filtro para la tabla
  get proveedoresFiltrados(): Proveedor[] {
    const texto = this.normalizarTexto(this.busqueda);
    if (!texto) return this.proveedores;
    return this.proveedores.filter(p =>
      this.normalizarTexto(p.dniOrRuc).includes(texto) ||
      this.normalizarTexto(this.getNombreProveedor(p)).includes(texto) ||
      this.normalizarTexto(p.correoElectronico).includes(texto)
    );
  }

  getNombreProveedor(proveedor: Proveedor): string {
    return proveedor.razonSocialONombre || proveedor.nombre || proveedor.razonSocial || '';
  }

  private nombreDesdeRuc(data: RucConsulta): string {
    return (data.razonSocial || data.nombre || data.nombreCompleto || '').trim();
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
    this.prepararProveedorParaGuardar();
    this.soloNumerosTelefono();

    if (form?.invalid || !this.formProveedor.dniOrRuc || !this.formProveedor.correoElectronico || !this.formProveedor.telefono || this.telefonoPeruInvalido) {
      this.errorFormulario = 'Revisa los campos obligatorios antes de guardar.';
      return;
    }

    if (this.editProveedor && this.editProveedor.id) {
      // Editar
      this.http.put<Proveedor>(`${this.apiUrl}/${this.editProveedor.id}`, this.formProveedor).subscribe(() => {
        this.cargarProveedores();
        this.resetFormulario();
        this.mensajeExito = 'Proveedor actualizado correctamente.';
      });
    } else {
      // Nuevo
      this.http.post<Proveedor>(this.apiUrl, this.formProveedor).subscribe(() => {
        this.cargarProveedores();
        this.resetFormulario();
        this.mensajeExito = 'Proveedor agregado correctamente.';
      });
    }
  }

  consultarRucProveedor() {
    this.formProveedor.dniOrRuc = this.formProveedor.dniOrRuc.replace(/\D/g, '').slice(0, 11);
    const ruc = this.formProveedor.dniOrRuc;

    if (ruc.length !== 11) {
      this.mensajeRuc = '';
      return;
    }

    if (this.consultandoRuc || this.ultimoRucConsultado === ruc) return;

    this.consultandoRuc = true;
    this.mensajeRuc = 'Consultando RUC...';
    this.ultimoRucConsultado = ruc;

    this.http.get<RucConsulta>(`${this.consultaRucUrl}/${ruc}`).subscribe({
      next: data => {
        const nombre = this.nombreDesdeRuc(data);
        if (nombre) {
          this.formProveedor.razonSocialONombre = nombre;
        }
        const correo = (data.correoElectronico || data.correo || '').trim();
        if (correo) {
          this.formProveedor.correoElectronico = correo;
        }
        this.mensajeRuc = nombre ? 'Razón social cargada desde la API.' : 'RUC consultado, completa la razón social si falta.';
        this.consultandoRuc = false;
      },
      error: () => {
        this.mensajeRuc = 'No se encontro el RUC en la API gratuita.';
        this.consultandoRuc = false;
      },
    });
  }

  soloNumerosTelefono() {
    const telefonoLimpio = this.formProveedor.telefono.replace(/\D/g, '').slice(0, 9);
    this.telefonoAdvertencia = this.formProveedor.telefono !== telefonoLimpio;
    this.formProveedor.telefono = telefonoLimpio;
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

  get telefonoPeruInvalido(): boolean {
    const telefono = this.formProveedor.telefono;
    return telefono.length > 0 && (telefono.length !== 9 || !telefono.startsWith('9'));
  }

  get tituloConfirmacion(): string {
    return this.accionPendiente === 'editar'
      ? '¿Editar este proveedor?'
      : '¿Eliminar este proveedor?';
  }

  get mensajeConfirmacion(): string {
    const nombre = this.proveedorPendiente ? this.getNombreProveedor(this.proveedorPendiente) || this.proveedorPendiente.dniOrRuc : 'este proveedor';

    return this.accionPendiente === 'editar'
      ? `Vas a abrir la edición de ${nombre}.`
      : `Esta acción eliminará a ${nombre}.`;
  }

  solicitarEditar(proveedor: Proveedor) {
    if (!this.puedeEscribir) return;
    this.accionPendiente = 'editar';
    this.proveedorPendiente = proveedor;
  }

  solicitarEliminar(proveedor: Proveedor) {
    if (!this.puedeEscribir) return;
    this.accionPendiente = 'eliminar';
    this.proveedorPendiente = proveedor;
  }

  confirmarAccion() {
    if (!this.accionPendiente || !this.proveedorPendiente) return;

    if (this.accionPendiente === 'editar') {
      this.editar(this.proveedorPendiente);
    } else {
      this.eliminarProveedor(this.proveedorPendiente.id);
    }

    this.cancelarConfirmacion();
  }

  cancelarConfirmacion() {
    this.accionPendiente = null;
    this.proveedorPendiente = null;
  }

  eliminarProveedor(id: number | undefined) {
    if (!this.puedeEscribir) return;
    if(!id) return;
    this.http.delete(`${this.apiUrl}/${id}`).subscribe(() => {
      this.cargarProveedores();
      this.mensajeExito = 'Proveedor eliminado correctamente.';
    });
  }

  editar(proveedor: Proveedor) {
    if (!this.puedeEscribir) return;
    this.mensajeExito = '';
    this.errorFormulario = '';
    this.telefonoAdvertencia = false;
    this.consultandoRuc = false;
    this.editProveedor = proveedor;
    this.formProveedor = {
      ...this.crearProveedorVacio(),
      ...proveedor,
      dniOrRuc: proveedor.dniOrRuc || '',
      razonSocialONombre: this.getNombreProveedor(proveedor),
      correoElectronico: proveedor.correoElectronico || '',
      telefono: proveedor.telefono || '',
    };
    this.ultimoRucConsultado = proveedor.dniOrRuc || '';
    this.mensajeRuc = '';
    this.mostrarFormulario = true;
  }

  nuevoProveedor() {
    if (!this.puedeEscribir) return;
    this.editProveedor = null;
    this.formProveedor = this.crearProveedorVacio();
    this.mensajeExito = '';
    this.errorFormulario = '';
    this.mensajeRuc = '';
    this.ultimoRucConsultado = '';
    this.telefonoAdvertencia = false;
    this.mostrarFormulario = true;
  }

  cancelar() {
    this.resetFormulario();
  }

  private crearProveedorVacio(): Proveedor {
    return {
      dniOrRuc: '',
      razonSocialONombre: '',
      correoElectronico: '',
      telefono: '',
    };
  }

  private prepararProveedorParaGuardar() {
    this.formProveedor.dniOrRuc = (this.formProveedor.dniOrRuc || '').replace(/\D/g, '').slice(0, 11);
    this.formProveedor.razonSocialONombre = (this.formProveedor.razonSocialONombre || '').trim();
    this.formProveedor.correoElectronico = (this.formProveedor.correoElectronico || '').trim();
    this.formProveedor.telefono = (this.formProveedor.telefono || '').trim();
  }

  private resetFormulario() {
    this.mostrarFormulario = false;
    this.editProveedor = null;
    this.errorFormulario = '';
    this.mensajeRuc = '';
    this.consultandoRuc = false;
    this.ultimoRucConsultado = '';
    this.telefonoAdvertencia = false;
    this.formProveedor = this.crearProveedorVacio();
  }
}
