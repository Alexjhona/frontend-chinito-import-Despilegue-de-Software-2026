import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { Subscription } from 'rxjs';
import { DataRefreshService } from '../../core/services/data-refresh.service';

interface Categoria {
  id?: number;
  nombre: string;
  imagen?: string;
}

@Component({
  selector: 'app-categoria',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './categoria.component.html',
  styleUrl: './categoria.component.css',
})
export class CategoriaComponent implements OnDestroy {
  categorias: Categoria[] = [];
  mostrarFormulario = false;
  editCategoria: Categoria | null = null;
  formCategoria: Categoria = this.crearCategoriaVacia();
  busqueda: string = '';
  mensajeExito = '';
  errorFormulario = '';
  mensajeImagenWeb = '';
  cargandoImagenWeb = false;
  private imagenGeneradaIntentos = 0;
  accionPendiente: 'editar' | 'eliminar' | null = null;
  categoriaPendiente: Categoria | null = null;
  private readonly apiUrl = 'http://localhost:8080/api/categorias';
  private readonly refreshSub: Subscription;

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private router: Router,
    private dataRefresh: DataRefreshService,
  ) {
    this.cargarCategorias();
    this.refreshSub = this.dataRefresh.refresh$.subscribe(() => this.cargarCategorias());
  }

  ngOnDestroy() {
    this.refreshSub.unsubscribe();
  }

  get puedeEscribir(): boolean {
    return this.authService.hasPermission('categorias-write');
  }

  get esPaginaAgregarCategoria(): boolean {
    return this.router.url.includes('/agregar-categoria');
  }

  cargarCategorias() {
    this.http.get<Categoria[]>(this.apiUrl).subscribe(data => this.categorias = data);
  }

  get categoriasFiltradas(): Categoria[] {
    const texto = this.normalizarTexto(this.busqueda);
    if (!texto) return this.categorias;
    return this.categorias.filter(c =>
      this.normalizarTexto(c.nombre).includes(texto) ||
      (c.id !== undefined && c.id.toString().includes(texto))
    );
  }

  get totalCategorias(): number {
    return this.categorias.length;
  }

  guardar(form?: NgForm) {
    if (!this.puedeEscribir) return;
    this.mensajeExito = '';
    this.errorFormulario = '';

    this.formCategoria.nombre = (this.formCategoria.nombre || '').trim();

    if (form?.invalid || !this.formCategoria.nombre) {
      this.errorFormulario = 'Revisa los campos obligatorios antes de guardar.';
      return;
    }

    if (this.editCategoria && this.editCategoria.id) {
      this.http.put<Categoria>(`${this.apiUrl}/${this.editCategoria.id}`, this.formCategoria).subscribe(() => {
        this.cargarCategorias();
        this.resetFormulario();
        this.mensajeExito = 'Categoría actualizada correctamente.';
      });
    } else {
      this.http.post<Categoria>(this.apiUrl, this.formCategoria).subscribe(() => {
        this.cargarCategorias();
        this.resetFormulario();
        this.mensajeExito = 'Categoría agregada correctamente.';
      });
    }
  }

  eliminarCategoria(id: number | undefined) {
    if (!this.puedeEscribir) return;
    if (!id) return;
    this.http.delete(`${this.apiUrl}/${id}`).subscribe(() => {
      this.cargarCategorias();
      this.mensajeExito = 'Categoría eliminada correctamente.';
    });
  }

  editar(categoria: Categoria) {
    if (!this.puedeEscribir) return;
    this.mensajeExito = '';
    this.errorFormulario = '';
    this.mensajeImagenWeb = '';
    this.editCategoria = categoria;
    this.formCategoria = {
      ...this.crearCategoriaVacia(),
      ...categoria,
      nombre: categoria.nombre || '',
      imagen: categoria.imagen || '',
    };
    this.mostrarFormulario = true;
  }

  nuevaCategoria() {
    if (!this.puedeEscribir) return;
    this.mensajeExito = '';
    this.errorFormulario = '';
    this.mensajeImagenWeb = '';
    this.editCategoria = null;
    this.formCategoria = this.crearCategoriaVacia();
    this.mostrarFormulario = true;
  }

  cancelar() {
    this.resetFormulario();
  }

  solicitarEditar(categoria: Categoria) {
    if (!this.puedeEscribir) return;
    this.accionPendiente = 'editar';
    this.categoriaPendiente = categoria;
  }

  solicitarEliminar(categoria: Categoria) {
    if (!this.puedeEscribir) return;
    this.accionPendiente = 'eliminar';
    this.categoriaPendiente = categoria;
  }

  get tituloConfirmacion(): string {
    return this.accionPendiente === 'editar' ? 'Editar categoría' : 'Eliminar categoría';
  }

  get mensajeConfirmacion(): string {
    const nombre = this.categoriaPendiente?.nombre || 'esta categoría';
    if (this.accionPendiente === 'editar') {
      return `¿Seguro que quieres editar ${nombre}?`;
    }
    return `¿Seguro que quieres eliminar ${nombre}? Esta acción no se puede deshacer.`;
  }

  confirmarAccion() {
    if (!this.accionPendiente || !this.categoriaPendiente) return;

    const categoria = this.categoriaPendiente;
    const accion = this.accionPendiente;
    this.cancelarConfirmacion();

    if (accion === 'editar') {
      this.editar(categoria);
      return;
    }

    this.eliminarCategoria(categoria.id);
  }

  cancelarConfirmacion() {
    this.accionPendiente = null;
    this.categoriaPendiente = null;
  }

  seleccionarImagen(event: Event) {
    this.errorFormulario = '';
    this.mensajeImagenWeb = '';
    this.cargandoImagenWeb = false;
    const input = event.target as HTMLInputElement;
    const archivo = input.files?.[0];

    if (!archivo) return;

    if (!archivo.type.startsWith('image/')) {
      this.errorFormulario = 'Selecciona un archivo de imagen válido.';
      input.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      this.formCategoria.imagen = String(reader.result || '');
    };
    reader.readAsDataURL(archivo);
  }

  quitarImagen() {
    this.formCategoria.imagen = '';
    this.mensajeImagenWeb = '';
    this.cargandoImagenWeb = false;
  }

  buscarImagenCategoriaWeb() {
    this.errorFormulario = '';
    this.mensajeImagenWeb = '';

    const nombre = (this.formCategoria.nombre || '').trim();

    if (!nombre) {
      this.errorFormulario = 'Escribe primero el nombre de la categoría para generar una imagen.';
      return;
    }

    this.imagenGeneradaIntentos += 1;
    this.cargandoImagenWeb = true;
    this.formCategoria.imagen = this.crearUrlImagenWeb(nombre, 'categoria', this.imagenGeneradaIntentos);
    this.mensajeImagenWeb = `Generando imagen para "${nombre}"...`;
  }

  imagenWebLista() {
    if (!this.cargandoImagenWeb) return;
    this.cargandoImagenWeb = false;
    this.mensajeImagenWeb = 'Imagen generada por nombre. Si no te convence, presiona Regenerar.';
  }

  imagenWebError() {
    if (!this.cargandoImagenWeb) return;
    this.cargandoImagenWeb = false;
    this.formCategoria.imagen = '';
    this.errorFormulario = 'No se pudo generar la imagen ahora. Intenta otra vez o sube una desde la PC.';
    this.mensajeImagenWeb = '';
  }

  getIniciales(nombre: string): string {
    return nombre
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map(parte => parte[0]?.toUpperCase())
      .join('') || 'CI';
  }

  private normalizarTexto(valor: string | undefined): string {
    return (valor || '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  private crearUrlImagenWeb(nombre: string, contexto: string, intento: number): string {
    const termino = nombre.trim() || contexto;
    const prompt = [
      `Create an AI generated ecommerce catalog image for this exact category name: ${termino}`,
      `Main subject: ${termino}`,
      `Translate "${termino}" to English internally if needed, but render the real object family represented by that name`,
      `Do not render a generic box or abstract icon; render visible products that match ${termino}`,
      'several representative items from the category',
      'centered composition',
      'clean white background',
      'realistic studio product photography',
      'sharp high detail',
      'no text, no watermark, no logo'
    ].join(', ');
    const seed = this.hashTexto(`${contexto}-${this.normalizarTexto(termino)}-${intento}`);

    return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?model=flux&width=900&height=700&seed=${seed}&nologo=true&enhance=true&safe=true&cacheBust=${Date.now()}`;
  }

  private hashTexto(valor: string): number {
    let hash = 0;

    for (const caracter of valor) {
      hash = ((hash << 5) - hash) + caracter.charCodeAt(0);
      hash |= 0;
    }

    return Math.abs(hash % 9000) + 1000;
  }

  private crearCategoriaVacia(): Categoria {
    return {
      nombre: '',
      imagen: '',
    };
  }

  private resetFormulario() {
    this.errorFormulario = '';
    this.mensajeImagenWeb = '';
    this.cargandoImagenWeb = false;
    this.mostrarFormulario = false;
    this.editCategoria = null;
    this.formCategoria = this.crearCategoriaVacia();
  }
}
