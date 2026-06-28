import { PublicContentService } from './public-content.service';

describe('PublicContentService', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it('should expose independent default content', () => {
    const service = new PublicContentService();
    expect(service.config.marca).toBe('Chinito Importaciones');
    expect(service.config.slidesInicio.length).toBe(4);
    expect(service.estaCategoriaOculta(null)).toBeFalse();
    expect(service.estaProductoOculto(undefined)).toBeFalse();
  });

  it('should normalize, persist and emit partial configuration', () => {
    const service = new PublicContentService();
    let emitted = service.config;
    service.config$.subscribe(config => emitted = config);

    service.guardar({
      ...service.config,
      marca: 'Catálogo CODEX',
      slidesInicio: [{ ...service.config.slidesInicio[0], titulo: 'Principal' }],
      servicios: [{ ...service.config.servicios[1], titulo: 'Pagos seguros' }],
      beneficios: [{ titulo: 'Beneficio', descripcion: 'Descripción' }],
      categoriasOcultas: [1, 1, Number.NaN],
      productosOcultos: [7, 7],
    });

    expect(emitted.marca).toBe('Catálogo CODEX');
    expect(emitted.slidesInicio[0].titulo).toBe('Principal');
    expect(emitted.slidesInicio.length).toBe(4);
    expect(emitted.servicios.find(item => item.id === 'pagos')?.titulo).toBe('Pagos seguros');
    expect(emitted.categoriasOcultas).toEqual([1]);
    expect(emitted.productosOcultos).toEqual([7]);
    expect(service.estaCategoriaOculta(1)).toBeTrue();
    expect(service.estaProductoOculto(7)).toBeTrue();
    expect(localStorage.getItem('chinito_public_content_config')).toContain('Catálogo CODEX');
  });

  it('should restore persisted content and recover from invalid JSON', () => {
    localStorage.setItem('chinito_public_content_config', JSON.stringify({ marca: 'Persistida' }));
    expect(new PublicContentService().config.marca).toBe('Persistida');

    localStorage.setItem('chinito_public_content_config', '{inválido');
    expect(new PublicContentService().config.marca).toBe('Chinito Importaciones');
  });

  it('should reset content and use defaults for invalid collections', () => {
    const service = new PublicContentService();
    service.guardar({
      ...service.config,
      marca: 'Temporal',
      slidesInicio: [] as never,
      servicios: [] as never,
      beneficios: [] as never,
      categoriasOcultas: null as never,
      productosOcultos: null as never,
    });
    expect(service.config.slidesInicio.length).toBe(4);
    expect(service.config.servicios.length).toBe(3);
    expect(service.config.beneficios.length).toBe(4);

    service.resetear();
    expect(service.config.marca).toBe('Chinito Importaciones');
    expect(localStorage.getItem('chinito_public_content_config')).toBeNull();
  });
});
