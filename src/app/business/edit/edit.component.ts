import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { PublicContentConfig, PublicContentService } from '../../core/services/public-content.service';
import { Subscription } from 'rxjs';
import { DataRefreshService } from '../../core/services/data-refresh.service';

interface CategoriaEditor {
  id: number;
  nombre: string;
}

interface ProductoEditor {
  id?: number;
  nombre: string;
  categoriaId: number | null;
  imagen?: string;
  precioVenta?: number | null;
}

type PanelEditor = 'header' | 'hero' | 'catalogo' | 'productos' | 'servicios' | 'beneficios' | 'visibilidad';
type PaginaEditor = 'inicio' | 'catalogo' | 'productos' | 'servicios';
type DispositivoPreview = 'desktop' | 'tablet' | 'mobile';

@Component({
  selector: 'app-edit',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './edit.component.html',
})
export class EditComponent implements OnDestroy {
  config: PublicContentConfig;
  categorias: CategoriaEditor[] = [];
  productos: ProductoEditor[] = [];
  guardado = '';
  cargando = true;
  panelActivo: PanelEditor = 'hero';
  paginaPreview: PaginaEditor = 'inicio';
  escalaPreview = 0.82;
  dispositivoPreview: DispositivoPreview = 'desktop';
  mostrarGuias = true;
  modoInspector = true;
  formularioAbierto = false;

  readonly paginas: Array<{ id: PaginaEditor; label: string }> = [
    { id: 'inicio', label: 'Inicio' },
    { id: 'catalogo', label: 'Catálogo' },
    { id: 'productos', label: 'Productos' },
    { id: 'servicios', label: 'Servicios' },
  ];

  readonly paneles: Array<{ id: PanelEditor; label: string }> = [
    { id: 'header', label: 'Header' },
    { id: 'hero', label: 'Portada' },
    { id: 'catalogo', label: 'Catálogo' },
    { id: 'productos', label: 'Productos' },
    { id: 'servicios', label: 'Servicios' },
    { id: 'beneficios', label: 'Beneficios' },
    { id: 'visibilidad', label: 'Mostrar/Ocultar' },
  ];

  readonly dispositivos: Array<{ id: DispositivoPreview; label: string; ancho: number; alto: number }> = [
    { id: 'desktop', label: 'Desktop', ancho: 1180, alto: 780 },
    { id: 'tablet', label: 'Tablet', ancho: 820, alto: 900 },
    { id: 'mobile', label: 'iPhone 17 Pro Max', ancho: 440, alto: 956 },
  ];

  readonly slidesInicio = [
    {
      etiqueta: 'NUEVA COLECCIÓN',
      titulo: 'Audio Premium',
      descripcion: 'Audífonos inalámbricos, headsets gamer y parlantes con sonido envolvente y máxima calidad.',
      imagen: '/imagenes/carousel/audio-premium.png',
    },
    {
      etiqueta: 'ACCESORIOS APPLE',
      titulo: 'Protección Inteligente',
      descripcion: 'Cases, fundas MagSafe y protectores premium para cuidar tus dispositivos.',
      imagen: '/imagenes/carousel/proteccion-inteligente.png',
    },
    {
      etiqueta: 'CARGA RÁPIDA',
      titulo: 'Energía Todo el Día',
      descripcion: 'Power Banks, cargadores USB-C y estaciones de carga para todos tus dispositivos.',
      imagen: '/imagenes/carousel/carga-rapida.png',
    },
    {
      etiqueta: 'GAMING SETUP',
      titulo: 'Potencia tu Juego',
      descripcion: 'Teclados mecánicos, mouse gamer y accesorios para una experiencia profesional.',
      imagen: '/imagenes/carousel/gaming-setup.png',
    },
  ];

  private readonly categoriaUrl = 'http://localhost:8080/api/categorias';
  private readonly productoUrl = 'http://localhost:8080/api/productos';
  private readonly refreshSub: Subscription;

  constructor(
    private readonly http: HttpClient,
    private readonly publicContent: PublicContentService,
    private readonly dataRefresh: DataRefreshService,
  ) {
    this.config = structuredClone(this.publicContent.config);
    this.cargarCatalogo();
    this.refreshSub = this.dataRefresh.refresh$.subscribe(() => this.cargarCatalogo());
  }

  ngOnDestroy(): void {
    this.refreshSub.unsubscribe();
  }

  guardar(): void {
    this.publicContent.guardar(this.config);
    this.guardado = 'Cambios guardados. El inicio ya fue actualizado.';
    setTimeout(() => this.guardado = '', 2800);
  }

  resetear(): void {
    this.publicContent.resetear();
    this.config = structuredClone(this.publicContent.config);
    this.guardado = 'Se restauró el inicio original.';
    setTimeout(() => this.guardado = '', 2800);
  }

  seleccionar(panel: PanelEditor, abrirFormulario = true): void {
    this.panelActivo = panel;
    if (panel === 'hero') this.paginaPreview = 'inicio';
    if (panel === 'catalogo') this.paginaPreview = 'catalogo';
    if (panel === 'productos') this.paginaPreview = 'productos';
    if (panel === 'servicios') this.paginaPreview = 'servicios';
    this.formularioAbierto = abrirFormulario;
  }

  cerrarFormulario(): void {
    this.formularioAbierto = false;
  }

  seleccionarPagina(pagina: PaginaEditor): void {
    this.paginaPreview = pagina;
    const panelPorPagina: Record<PaginaEditor, PanelEditor> = {
      inicio: 'hero',
      catalogo: 'catalogo',
      productos: 'productos',
      servicios: 'servicios',
    };
    this.panelActivo = panelPorPagina[pagina];
  }

  seleccionarDispositivo(dispositivo: DispositivoPreview): void {
    this.dispositivoPreview = dispositivo;
    const escalas: Record<DispositivoPreview, number> = {
      desktop: 0.82,
      tablet: 0.78,
      mobile: 0.72,
    };
    this.escalaPreview = escalas[dispositivo];
  }

  toggleCategoria(id: number, ocultar: boolean): void {
    this.config.categoriasOcultas = this.toggleId(this.config.categoriasOcultas, id, ocultar);
  }

  toggleProducto(id: number | undefined, ocultar: boolean): void {
    if (!id) return;
    this.config.productosOcultos = this.toggleId(this.config.productosOcultos, id, ocultar);
  }

  categoriaOculta(id: number): boolean {
    return this.config.categoriasOcultas.includes(id);
  }

  productoOculto(id: number | undefined): boolean {
    return id != null && this.config.productosOcultos.includes(id);
  }

  nombreCategoria(categoriaId: number | null): string {
    return this.categorias.find(categoria => categoria.id === categoriaId)?.nombre || 'Sin categoria';
  }

  get categoriasVisibles(): CategoriaEditor[] {
    return this.categorias.filter(categoria => !this.categoriaOculta(categoria.id));
  }

  get productosVisibles(): ProductoEditor[] {
    return this.productos.filter(producto =>
      !this.productoOculto(producto.id) &&
      !this.config.categoriasOcultas.includes(Number(producto.categoriaId))
    );
  }

  get dispositivoActual(): { id: DispositivoPreview; label: string; ancho: number; alto: number } {
    return this.dispositivos.find(dispositivo => dispositivo.id === this.dispositivoPreview) || this.dispositivos[0];
  }

  get anchoPreview(): number {
    return this.dispositivoActual.ancho;
  }

  get altoMinimoPreview(): number {
    return this.dispositivoActual.alto;
  }

  get seccionesVisibles(): number {
    return [
      this.config.mostrarHeader,
      this.config.mostrarVitrina,
      this.config.mostrarCatalogo,
      this.config.mostrarProductos,
      this.config.mostrarServicios,
    ].filter(Boolean).length;
  }

  get estadoPanelActivo(): string {
    const estados: Record<PanelEditor, string> = {
      visibilidad: `${this.config.categoriasOcultas.length + this.config.productosOcultos.length} ocultos`,
      catalogo: this.estadoVisibilidad(this.config.mostrarCatalogo),
      productos: this.estadoVisibilidad(this.config.mostrarProductos),
      servicios: this.estadoVisibilidad(this.config.mostrarServicios),
      header: this.estadoVisibilidad(this.config.mostrarHeader),
      hero: this.config.mostrarVitrina ? 'Vitrina activa' : 'Sin vitrina',
      beneficios: 'Activo',
    };
    return estados[this.panelActivo];
  }

  private estadoVisibilidad(visible: boolean): string {
    return visible ? 'Visible' : 'Oculto';
  }

  previewProducto(index: number): ProductoEditor | null {
    return this.productosVisibles[index] || null;
  }

  iniciales(nombre: string): string {
    return (nombre || 'CI').split(/\s+/).filter(Boolean).slice(0, 2).map(parte => parte.charAt(0).toUpperCase()).join('');
  }

  precio(producto: ProductoEditor | null): string {
    const precio = Number(producto?.precioVenta || 0);
    return precio > 0 ? `S/ ${precio.toFixed(2)}` : 'Consultar';
  }

  imagenProducto(producto: ProductoEditor): string {
    return producto.imagen || '';
  }

  clasePanel(panel: PanelEditor): string {
    return this.panelActivo === panel
      ? 'ring-4 ring-sky-200 border-sky-400'
      : 'border-transparent hover:border-sky-200 hover:ring-4 hover:ring-sky-50';
  }

  private cargarCatalogo(): void {
    this.cargando = true;

    this.http.get<CategoriaEditor[]>(this.categoriaUrl).subscribe({
      next: categorias => {
        this.categorias = categorias;
        this.cargando = false;
      },
      error: () => {
        this.categorias = [];
        this.cargando = false;
      },
    });

    this.http.get<ProductoEditor[]>(this.productoUrl).subscribe({
      next: productos => this.productos = productos,
      error: () => this.productos = [],
    });
  }

  private toggleId(ids: number[], id: number, agregar: boolean): number[] {
    const normalizados = new Set(ids.map(valor => Number(valor)));
    if (agregar) {
      normalizados.add(id);
    } else {
      normalizados.delete(id);
    }
    return [...normalizados];
  }
}
