import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface PublicContentConfig {
  mostrarHeader: boolean;
  mostrarEstadisticas: boolean;
  mostrarVitrina: boolean;
  mostrarCatalogo: boolean;
  mostrarProductos: boolean;
  mostrarServicios: boolean;
  marca: string;
  subtituloHeader: string;
  heroEtiqueta: string;
  heroTitulo: string;
  heroDescripcion: string;
  botonCategorias: string;
  botonLogin: string;
  vitrinaEtiqueta: string;
  vitrinaTitulo: string;
  catalogoEtiqueta: string;
  catalogoTitulo: string;
  catalogoDescripcion: string;
  productosEtiqueta: string;
  productosTitulo: string;
  productosDescripcion: string;
  serviciosInfoTitulo: string;
  serviciosInfoDescripcion: string;
  serviciosGestionTitulo: string;
  serviciosGestionDescripcion: string;
  slidesInicio: PublicSlideConfig[];
  servicios: PublicServicioConfig[];
  beneficios: PublicBeneficioConfig[];
  categoriasOcultas: number[];
  productosOcultos: number[];
}

export interface PublicSlideConfig {
  etiqueta: string;
  titulo: string;
  descripcion: string;
  boton: string;
  imagen: string;
}

export interface PublicServicioConfig {
  id: 'garantia' | 'pagos' | 'atencion';
  icono: string;
  titulo: string;
  descripcion: string;
  imagen: string;
  modalDescripcion: string;
  puntos: string[];
}

export interface PublicBeneficioConfig {
  titulo: string;
  descripcion: string;
}

const DEFAULT_PUBLIC_CONTENT: PublicContentConfig = {
  mostrarHeader: true,
  mostrarEstadisticas: true,
  mostrarVitrina: true,
  mostrarCatalogo: true,
  mostrarProductos: true,
  mostrarServicios: true,
  marca: 'Chinito Importaciones',
  subtituloHeader: 'Catálogo de productos',
  heroEtiqueta: 'Catálogo público',
  heroTitulo: 'Encuentra productos disponibles para tu negocio.',
  heroDescripcion: 'Revisa el catálogo de Chinito Importaciones, explora categorías y consulta precios referenciales de productos disponibles.',
  botonCategorias: 'Ver categorías',
  botonLogin: 'Iniciar sesión',
  vitrinaEtiqueta: 'Vitrina',
  vitrinaTitulo: 'Productos destacados',
  catalogoEtiqueta: 'Productos',
  catalogoTitulo: 'Catálogo completo',
  catalogoDescripcion: 'Explora las categorías del catálogo. Al elegir una categoría, los productos se filtran automáticamente abajo.',
  productosEtiqueta: 'Productos',
  productosTitulo: 'Productos del catálogo',
  productosDescripcion: 'Filtrados según la categoría y búsqueda seleccionada.',
  serviciosInfoTitulo: 'Atención para compras',
  serviciosInfoDescripcion: 'Consulta disponibilidad, revisa precios de referencia y coordina pedidos desde el canal de atención del negocio.',
  serviciosGestionTitulo: 'Sistema interno',
  serviciosGestionDescripcion: 'El acceso interno permite registrar ventas, gestionar trabajadores, controlar inventario y administrar proveedores.',
  slidesInicio: [
    {
      etiqueta: 'NUEVA COLECCIÓN',
      titulo: 'Audio Premium',
      descripcion: 'Audífonos inalámbricos, headsets gamer y parlantes con sonido envolvente y máxima calidad.',
      boton: 'Ver Productos',
      imagen: '/imagenes/carousel/audio-premium.png',
    },
    {
      etiqueta: 'ACCESORIOS APPLE',
      titulo: 'Protección Inteligente',
      descripcion: 'Cases, fundas MagSafe y protectores premium para cuidar tus dispositivos.',
      boton: 'Explorar',
      imagen: '/imagenes/carousel/proteccion-inteligente.png',
    },
    {
      etiqueta: 'CARGA RÁPIDA',
      titulo: 'Energía Todo el Día',
      descripcion: 'Power Banks, cargadores USB-C y estaciones de carga para todos tus dispositivos.',
      boton: 'Comprar Ahora',
      imagen: '/imagenes/carousel/carga-rapida.png',
    },
    {
      etiqueta: 'GAMING SETUP',
      titulo: 'Potencia tu Juego',
      descripcion: 'Teclados mecánicos, mouse gamer y accesorios para una experiencia profesional.',
      boton: 'Ver Colección',
      imagen: '/imagenes/carousel/gaming-setup.png',
    },
  ],
  servicios: [
    {
      id: 'garantia',
      icono: '🛡️',
      titulo: 'Garantía de calidad',
      descripcion: 'Trabajamos con productos seleccionados y accesorios de confianza para brindarte una mejor experiencia.',
      imagen: '/imagenes/servicios/garantia-calidad.png',
      modalDescripcion: 'Cada accesorio se revisa antes de entregarse para que compres con tranquilidad. Priorizamos productos con buena duración, compatibilidad y acabado, porque la idea es que lo uses todos los días sin preocuparte.',
      puntos: ['Productos seleccionados por calidad.', 'Revisión visual antes de la entrega.', 'Orientación si necesitas cambiar o elegir mejor.'],
    },
    {
      id: 'pagos',
      icono: '💳',
      titulo: 'Múltiples métodos de pago',
      descripcion: 'Paga de la forma que prefieras.',
      imagen: '/imagenes/servicios/metodos-pago.png',
      modalDescripcion: 'Queremos que comprar sea simple y rápido. Puedes pagar con el método que tengas a la mano y confirmar tu pedido sin vueltas, ya sea desde el celular, en efectivo o con tarjeta.',
      puntos: ['Pagos rápidos por billeteras digitales.', 'Transferencias para compras grandes.', 'Opciones flexibles para cada cliente.'],
    },
    {
      id: 'atencion',
      icono: '💬',
      titulo: 'Atención personalizada',
      descripcion: 'Te ayudamos a elegir el accesorio ideal según tus necesidades.',
      imagen: '/imagenes/servicios/atencion-personalizada.png',
      modalDescripcion: 'Elige la plataforma que prefieras para recibir asesoría rápida, resolver dudas y encontrar el accesorio ideal para tu equipo.',
      puntos: ['Asesoría por WhatsApp', 'Atención rápida', 'Soporte antes y después de la compra'],
    },
  ],
  beneficios: [
    { titulo: 'Calidad Premium', descripcion: 'Productos originales y de las mejores marcas.' },
    { titulo: 'Mejores Precios', descripcion: 'Precios competitivos todos los días.' },
    { titulo: 'Devoluciones Fáciles', descripcion: '30 días para cambios o devoluciones.' },
    { titulo: 'Soporte 24/7', descripcion: 'Estamos aquí para ayudarte siempre.' },
  ],
  categoriasOcultas: [],
  productosOcultos: [],
};

@Injectable({
  providedIn: 'root',
})
export class PublicContentService {
  private readonly storageKey = 'chinito_public_content_config';
  private readonly configSubject = new BehaviorSubject<PublicContentConfig>(this.leerConfig());
  readonly config$ = this.configSubject.asObservable();

  get config(): PublicContentConfig {
    return this.configSubject.value;
  }

  guardar(config: PublicContentConfig): void {
    const normalizado = this.normalizarConfig(config);
    localStorage.setItem(this.storageKey, JSON.stringify(normalizado));
    this.configSubject.next(normalizado);
  }

  resetear(): void {
    localStorage.removeItem(this.storageKey);
    this.configSubject.next(this.clonar(DEFAULT_PUBLIC_CONTENT));
  }

  estaCategoriaOculta(id: number | null | undefined): boolean {
    return id != null && this.config.categoriasOcultas.includes(Number(id));
  }

  estaProductoOculto(id: number | null | undefined): boolean {
    return id != null && this.config.productosOcultos.includes(Number(id));
  }

  private leerConfig(): PublicContentConfig {
    if (globalThis.window === undefined) return this.clonar(DEFAULT_PUBLIC_CONTENT);

    const raw = localStorage.getItem(this.storageKey);
    if (!raw) return this.clonar(DEFAULT_PUBLIC_CONTENT);

    try {
      return this.normalizarConfig(JSON.parse(raw));
    } catch {
      return this.clonar(DEFAULT_PUBLIC_CONTENT);
    }
  }

  private normalizarConfig(config: Partial<PublicContentConfig>): PublicContentConfig {
    return {
      ...this.clonar(DEFAULT_PUBLIC_CONTENT),
      ...config,
      slidesInicio: this.normalizarSlides(config.slidesInicio),
      servicios: this.normalizarServicios(config.servicios),
      beneficios: this.normalizarBeneficios(config.beneficios),
      categoriasOcultas: this.normalizarIds(config.categoriasOcultas),
      productosOcultos: this.normalizarIds(config.productosOcultos),
    };
  }

  private normalizarSlides(slides: unknown): PublicSlideConfig[] {
    if (!Array.isArray(slides) || !slides.length) return this.clonar(DEFAULT_PUBLIC_CONTENT.slidesInicio);
    return this.clonar(DEFAULT_PUBLIC_CONTENT.slidesInicio)
      .map((base, index) => this.unirConfig(base, slides[index]));
  }

  private normalizarServicios(servicios: unknown): PublicServicioConfig[] {
    if (!Array.isArray(servicios) || !servicios.length) return this.clonar(DEFAULT_PUBLIC_CONTENT.servicios);
    return this.clonar(DEFAULT_PUBLIC_CONTENT.servicios)
      .map(base => this.unirConfig(
        base,
        servicios.find((servicio: Partial<PublicServicioConfig>) => servicio?.id === base.id)
      ));
  }

  private normalizarBeneficios(beneficios: unknown): PublicBeneficioConfig[] {
    if (!Array.isArray(beneficios) || !beneficios.length) return this.clonar(DEFAULT_PUBLIC_CONTENT.beneficios);
    return this.clonar(DEFAULT_PUBLIC_CONTENT.beneficios)
      .map((base, index) => this.unirConfig(base, beneficios[index]));
  }

  private normalizarIds(ids: unknown): number[] {
    if (!Array.isArray(ids)) return [];
    return [...new Set(ids.map(Number).filter(id => Number.isFinite(id)))];
  }

  private unirConfig<T extends object>(base: T, valor: unknown): T {
    return valor && typeof valor === 'object'
      ? { ...base, ...(valor as Partial<T>) }
      : base;
  }

  private clonar<T>(config: T): T {
    return structuredClone(config);
  }
}
