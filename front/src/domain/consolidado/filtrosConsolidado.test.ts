import { describe, expect, it } from 'vitest';
import { ApiError } from '../../services/httpClient';
import { JERARQUIA_VACIA } from '../../constants/productos';
import type { FiltrosConsolidado } from '../../types/consolidado';
import {
  FILTROS_CONSOLIDADO_INICIALES,
  chipsFiltrosActivos,
  construirQueryExportacion,
  construirQueryListado,
  contarFiltrosActivos,
  detalleErrorListado,
  filasEstimadas,
  filtrosEfectivos,
  mensajeErrorDescarga,
  nombreArchivo,
  quitarDeFiltros,
  type NombresFiltros,
} from './filtrosConsolidado';

const filtros = (parciales: Partial<FiltrosConsolidado> = {}): FiltrosConsolidado => ({ ...FILTROS_CONSOLIDADO_INICIALES, ...parciales });
const listado = (f: FiltrosConsolidado, j = JERARQUIA_VACIA, vista: 'PLANOGRAMA' | 'CROSS' | 'IMPULSO' = 'PLANOGRAMA') =>
  construirQueryListado(f, j, vista, 1, 50, 'sku', 'asc');

describe('construirQueryListado', () => {
  it('sin filtros todo queda indefinido (valores por defecto)', () => {
    expect(Object.values(listado(filtros())).every((v) => v === undefined)).toBe(true);
  });

  it('listas vacías se omiten y las llenas van en csv', () => {
    const q = listado(filtros({ tiendaIds: [1, 2], versionIds: [], estados: ['piloto'], busqueda: '  llanta ' }));
    expect(q).toMatchObject({ tiendaIds: '1,2', versionIds: undefined, estados: 'piloto', busqueda: 'llanta' });
  });

  it('manda solo el nivel de jerarquía más específico', () => {
    const q = listado(filtros(), { ...JERARQUIA_VACIA, area: '1', departamento: '12', familia: '123' });
    expect(q.familia).toBe('123');
    expect(q).not.toHaveProperty('area');
    expect(q).not.toHaveProperty('departamento');
  });

  it('soloDuplicados solo en la vista Planograma; la vista, página y orden solo si no son los de por defecto', () => {
    expect(listado(filtros({ soloDuplicados: true })).soloDuplicados).toBe(true);
    expect(listado(filtros({ soloDuplicados: true }), JERARQUIA_VACIA, 'CROSS')).toMatchObject({ soloDuplicados: undefined, vista: 'CROSS' });
    const q = construirQueryListado(filtros(), JERARQUIA_VACIA, 'PLANOGRAMA', 3, 100, 'tienda', 'desc');
    expect(q).toMatchObject({ page: 3, pageSize: 100, orden: 'tienda', direccion: 'desc', vista: undefined });
  });
});

describe('construirQueryExportacion', () => {
  const COLUMNAS = ['sku', 'tienda', 'minFinal'];

  it('lleva formato y columnas, y nunca vista, página ni orden', () => {
    const q = construirQueryExportacion(filtros({ tiendaIds: [7] }), JERARQUIA_VACIA, 'DETALLADO', ['CROSS'], COLUMNAS);
    expect(q).toMatchObject({ formato: 'DETALLADO', columnas: 'sku,tienda,minFinal', tiendaIds: '7', hojas: undefined });
    for (const prohibido of ['vista', 'page', 'pageSize', 'orden', 'direccion']) expect(q).not.toHaveProperty(prohibido);
  });

  it('hojas solo con HOJAS, en el orden fijo del libro', () => {
    expect(construirQueryExportacion(filtros(), JERARQUIA_VACIA, 'HOJAS', ['IMPULSO', 'PLANOGRAMA'], COLUMNAS).hojas).toBe('PLANOGRAMA,IMPULSO');
    expect(construirQueryExportacion(filtros(), JERARQUIA_VACIA, 'AGREGADO', ['CROSS'], COLUMNAS).hojas).toBeUndefined();
  });

  it('descarta claves fuera de la lista y repetidas', () => {
    const q = construirQueryExportacion(filtros(), JERARQUIA_VACIA, 'AGREGADO', [], ['sku', '__proto__', 'inventario', 'sku', 'montaje']);
    expect(q.columnas).toBe('sku,montaje');
  });
});

describe('embudo y chips', () => {
  const nombres: NombresFiltros = {
    tiendas: new Map([[1, '101 · Zona 9'], [2, '102 · Norte'], [3, '103 · Sur'], [4, '104 · Este']]),
    versiones: new Map([[10, 'AUTOS 02-TG']]),
    jerarquia: ['Automotriz', 'Autos', 'Cuidado del auto'],
  };

  it('cada filtro cuenta una vez, aunque tenga varios valores o niveles', () => {
    expect(contarFiltrosActivos(filtros(), JERARQUIA_VACIA)).toBe(0);
    const f = filtros({ tiendaIds: [1, 2, 3], versionIds: [10], estados: ['piloto'], busqueda: 'x', soloDuplicados: true });
    expect(contarFiltrosActivos(f, { ...JERARQUIA_VACIA, area: '1', departamento: '2', familia: '3' })).toBe(6);
  });

  it('filtrosEfectivos apaga soloDuplicados fuera de la vista Planograma', () => {
    expect(filtrosEfectivos(filtros({ soloDuplicados: true }), 'CROSS').soloDuplicados).toBe(false);
    expect(filtrosEfectivos(filtros({ soloDuplicados: true }), 'PLANOGRAMA').soloDuplicados).toBe(true);
  });

  it('sin filtros no hay chips; la vista aparece como chip sin ✕', () => {
    expect(chipsFiltrosActivos(filtros(), JERARQUIA_VACIA, 'PLANOGRAMA', nombres)).toEqual([]);
    expect(chipsFiltrosActivos(filtros(), JERARQUIA_VACIA, 'CROSS', nombres)).toEqual([
      { id: 'vista', texto: 'Vista: Solo cross', quitar: null },
    ]);
  });

  it('con hasta 2 tiendas hay un chip por tienda; con 3 o más se agrupan', () => {
    const dos = chipsFiltrosActivos(filtros({ tiendaIds: [1, 2] }), JERARQUIA_VACIA, 'PLANOGRAMA', nombres);
    expect(dos.map((c) => c.texto)).toEqual(['Tienda: 101 · Zona 9', 'Tienda: 102 · Norte']);
    expect(dos[0].quitar).toEqual({ campo: 'tiendaIds', id: 1 });
    const cuatro = chipsFiltrosActivos(filtros({ tiendaIds: [1, 2, 3, 4] }), JERARQUIA_VACIA, 'PLANOGRAMA', nombres);
    expect(cuatro).toHaveLength(1);
    expect(cuatro[0].texto).toBe('Tiendas: 4');
    expect(cuatro[0].titulo).toContain('104 · Este');
    expect(cuatro[0].quitar).toEqual({ campo: 'tiendaIds' });
  });

  it('jerarquía, estado, búsqueda y duplicados', () => {
    const chips = chipsFiltrosActivos(
      filtros({ versionIds: [10], estados: ['publicado', 'piloto'], busqueda: 'llanta', soloDuplicados: true }),
      { ...JERARQUIA_VACIA, area: '1', departamento: '2', familia: '3' },
      'PLANOGRAMA',
      nombres,
    );
    expect(chips.map((c) => c.texto)).toEqual([
      'Versión: AUTOS 02-TG',
      'Estado: Publicada y Piloto',
      'Jerarquía: Automotriz › Autos › Cuidado del auto',
      'Búsqueda: llanta',
      'Más de un planograma',
    ]);
  });

  it('quitarDeFiltros quita un valor o todos', () => {
    const f = filtros({ tiendaIds: [1, 2, 3], versionIds: [10], estados: ['piloto'], busqueda: 'x', soloDuplicados: true });
    expect(quitarDeFiltros(f, { campo: 'tiendaIds', id: 2 }).tiendaIds).toEqual([1, 3]);
    expect(quitarDeFiltros(f, { campo: 'tiendaIds' }).tiendaIds).toEqual([]);
    expect(quitarDeFiltros(f, { campo: 'versionIds' }).versionIds).toEqual([]);
    expect(quitarDeFiltros(f, { campo: 'estados' }).estados).toEqual([]);
    expect(quitarDeFiltros(f, { campo: 'busqueda' }).busqueda).toBe('');
    expect(quitarDeFiltros(f, { campo: 'soloDuplicados' }).soloDuplicados).toBe(false);
  });
});

describe('descarga', () => {
  const conteos = { PLANOGRAMA: 3163, CROSS: 18, IMPULSO: 2, AGREGADO: 3130 };

  it('filasEstimadas de los 3 formatos', () => {
    expect(filasEstimadas('DETALLADO', [], conteos)).toBe(3183);
    expect(filasEstimadas('AGREGADO', [], conteos)).toBe(3130);
    expect(filasEstimadas('HOJAS', ['CROSS', 'IMPULSO'], conteos)).toBe(20);
    expect(filasEstimadas('HOJAS', [], conteos)).toBe(0);
  });

  it('nombreArchivo usa la fecha local con la regla del servidor', () => {
    const fecha = new Date(2026, 9, 15, 10, 30);
    expect(nombreArchivo('AGREGADO', fecha)).toBe('consolidado-tiendas-minmax-20261015.xlsx');
    expect(nombreArchivo('DETALLADO', fecha)).toBe('consolidado-tiendas-detallado-20261015.xlsx');
    expect(nombreArchivo('HOJAS', new Date(2027, 0, 5))).toBe('consolidado-tiendas-hojas-20270105.xlsx');
  });

  it('mensajeErrorDescarga según el error', () => {
    expect(mensajeErrorDescarga(new ApiError(422, 'EXPORTACION_DEMASIADO_GRANDE', 'x', { filas: 150000, maximo: 100000 })))
      .toBe('La descarga tendría 150000 filas y el máximo es 100000. Ajusta los filtros.');
    expect(mensajeErrorDescarga(new ApiError(429, 'RATE_LIMITED', 'x')))
      .toBe('Hiciste muchas descargas seguidas. Espera un minuto e inténtalo de nuevo.');
    expect(mensajeErrorDescarga(new ApiError(503, 'EXPORTACION_EN_CURSO', 'Hay otra descarga en curso. Inténtalo en unos segundos.')))
      .toBe('Hay otra descarga en curso. Inténtalo en unos segundos.');
    expect(mensajeErrorDescarga(new ApiError(503, 'SERVICIO_NO_DISPONIBLE', 'CATI')))
      .toBe('La jerarquía no está disponible en este momento. Quita el filtro de jerarquía o inténtalo más tarde.');
    expect(mensajeErrorDescarga(new ApiError(500, 'INTERNAL_ERROR', 'x'))).toBe('No se pudo generar la descarga. Inténtalo de nuevo.');
    expect(mensajeErrorDescarga(new ApiError(0, 'NETWORK_ERROR', 'x'))).toBe('No se pudo generar la descarga. Inténtalo de nuevo.');
    expect(mensajeErrorDescarga(new ApiError(422, 'EXPORTACION_DEMASIADO_GRANDE', 'x', {}))).toBe('No se pudo generar la descarga. Inténtalo de nuevo.');
  });

  it('detalleErrorListado: CATI, validación y genérico', () => {
    expect(detalleErrorListado(new ApiError(503, 'SERVICIO_NO_DISPONIBLE', 'x')))
      .toBe('La jerarquía no está disponible en este momento. Quita el filtro de jerarquía o inténtalo más tarde.');
    expect(detalleErrorListado(new ApiError(400, 'VALIDATION_ERROR', 'Datos de entrada inválidos', ['"page" must be a number'])))
      .toBe('Datos de entrada inválidos · "page" must be a number');
    expect(detalleErrorListado(new ApiError(500, 'INTERNAL_ERROR', 'x'))).toBe('Revisa tu conexión e inténtalo de nuevo.');
  });
});
