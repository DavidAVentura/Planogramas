import { describe, expect, it } from 'vitest';
import { ApiError } from '../../services/httpClient';
import { JERARQUIA_VACIA } from '../../constants/productos';
import type { VersionPorVersion } from '../../types/implementacion';
import {
  CAMPOS_BLOQUE_PIVOTE,
  ENCABEZADOS_COMUNES_PIVOTE,
  MENSAJE_DESCARGA_GENERICO,
  construirCuerpoExportacion,
  encabezadosBloque,
  mensajeErrorDescargaPorVersion,
  nombreArchivoPorVersion,
  pivoteAplicable,
} from './descargaPorVersion';

let siguienteId = 1;
const version = (extra: Partial<VersionPorVersion> = {}): VersionPorVersion => {
  const id = siguienteId++;
  return {
    versionId: id, codigo: `V${id}`, estado: 'publicado', nombre: 'Ferretería', descripcion: null, departamento: 'D', totalProductos: 1,
    tipo: 'GRANDE', esEspecial: false, planogramaId: 10, adjuntos: 0, tiendaIds: [], ...extra,
  };
};

describe('pivoteAplicable', () => {
  it('TG piloto + TG publicado del mismo planograma es aplicable', () => {
    const r = pivoteAplicable([version({ estado: 'piloto' }), version({ estado: 'publicado' })]);
    expect(r).toEqual({ aplicable: true, sinTipo: [], duplicadas: [], especiales: [] });
  });

  it('dos versiones del mismo planograma, tipo y estado → no aplicable, con el grupo', () => {
    const a = version({ estado: 'borrador' });
    const b = version({ estado: 'borrador' });
    const r = pivoteAplicable([a, b, version({ tipo: 'MEDIANA', estado: 'borrador' })]);
    expect(r.aplicable).toBe(false);
    expect(r.duplicadas).toEqual([[a, b]]);
  });

  it('mismo tipo y estado en planogramas distintos sí es aplicable', () => {
    expect(pivoteAplicable([version(), version({ planogramaId: 11 })]).aplicable).toBe(true);
  });

  it('una especial más una normal: aplicable y la especial se reporta', () => {
    const especial = version({ esEspecial: true });
    const r = pivoteAplicable([version(), especial]);
    expect(r.aplicable).toBe(true);
    expect(r.especiales).toEqual([especial]);
  });

  it('solo especiales → no aplicable', () => {
    const r = pivoteAplicable([version({ esEspecial: true }), version({ esEspecial: true })]);
    expect(r.aplicable).toBe(false);
    expect(r.especiales).toHaveLength(2);
  });

  it('una normal sin tipo → no aplicable', () => {
    const sinTipo = version({ tipo: null as unknown as VersionPorVersion['tipo'] });
    const r = pivoteAplicable([sinTipo, version()]);
    expect(r.aplicable).toBe(false);
    expect(r.sinTipo).toEqual([sinTipo]);
  });

  it('una especial sin tipo no bloquea', () => {
    expect(pivoteAplicable([version(), version({ esEspecial: true, tipo: null as unknown as VersionPorVersion['tipo'] })]).aplicable).toBe(true);
  });

  it('sin versiones no hay nada que avisar', () => {
    expect(pivoteAplicable([]).aplicable).toBe(true);
  });
});

describe('construirCuerpoExportacion', () => {
  const base = { versionIds: [12, 15], formato: 'LISTA' as const, jerarquia: JERARQUIA_VACIA, posicionIds: [1, 2], hayFiltrosCliente: false };

  it('sin jerarquía ni filtros no serializa claves vacías ni posicionIds', () => {
    const cuerpo = construirCuerpoExportacion(base);
    expect(cuerpo).toEqual({ versionIds: [12, 15], formato: 'LISTA' });
    expect(Object.keys(JSON.parse(JSON.stringify(cuerpo)))).toEqual(['versionIds', 'formato']);
  });

  it('con filtros de la tabla envía las posiciones visibles (aunque sean ninguna)', () => {
    expect(construirCuerpoExportacion({ ...base, hayFiltrosCliente: true }).posicionIds).toEqual([1, 2]);
    expect(construirCuerpoExportacion({ ...base, hayFiltrosCliente: true, posicionIds: [] }).posicionIds).toEqual([]);
  });

  it('jerarquía: solo Área y Departamento; el departamento exige área', () => {
    const conArea = construirCuerpoExportacion({ ...base, jerarquia: { ...JERARQUIA_VACIA, area: 'A01' } });
    expect(conArea).toEqual({ versionIds: [12, 15], formato: 'LISTA', area: 'A01' });
    const conAmbos = construirCuerpoExportacion({
      ...base, formato: 'PIVOTE', jerarquia: { ...JERARQUIA_VACIA, area: 'A01', departamento: 'D05', familia: 'F1' },
    });
    expect(conAmbos).toEqual({ versionIds: [12, 15], formato: 'PIVOTE', area: 'A01', departamento: 'D05' });
    expect(construirCuerpoExportacion({ ...base, jerarquia: { ...JERARQUIA_VACIA, departamento: 'D05' } }).departamento).toBeUndefined();
  });
});

describe('nombreArchivoPorVersion', () => {
  it('formato y fecha', () => {
    expect(nombreArchivoPorVersion('PIVOTE', new Date(2026, 9, 19))).toBe('productos-por-planograma-pivote-20261019.xlsx');
    expect(nombreArchivoPorVersion('LISTA', new Date(2026, 0, 5))).toBe('productos-por-planograma-lista-20260105.xlsx');
  });
});

describe('mensajeErrorDescargaPorVersion', () => {
  const error = (status: number, code: string, details?: unknown) => new ApiError(status, code, 'x', details);

  it('422 se muestra en el modal', () => {
    expect(mensajeErrorDescargaPorVersion(error(422, 'PIVOTE_NO_APLICABLE'))).toMatchObject({ enModal: true });
    expect(mensajeErrorDescargaPorVersion(error(422, 'EXPORTACION_DEMASIADO_GRANDE', { filas: 120000, maximo: 100000 }))).toEqual({
      texto: 'La descarga tendría 120000 filas y el máximo es 100000. Elige menos versiones o filtra por Área y Departamento.',
      enModal: true,
    });
  });

  it('tope sin details numéricos cae en el texto genérico', () => {
    expect(mensajeErrorDescargaPorVersion(error(422, 'EXPORTACION_DEMASIADO_GRANDE', { filas: 'x' }))).toEqual({
      texto: MENSAJE_DESCARGA_GENERICO, enModal: false,
    });
  });

  it('429, 503, 404 y 403 salen como toast', () => {
    expect(mensajeErrorDescargaPorVersion(error(429, 'RATE_LIMITED'))).toEqual({
      texto: 'Hiciste muchas descargas seguidas. Espera un minuto e intenta de nuevo.', enModal: false,
    });
    expect(mensajeErrorDescargaPorVersion(error(503, 'EXPORTACION_EN_CURSO')).texto).toBe('Hay otra descarga en curso. Intenta de nuevo en unos segundos.');
    expect(mensajeErrorDescargaPorVersion(error(503, 'SERVICE_UNAVAILABLE')).texto).toBe('No se pudo consultar la jerarquía en CATI. Intenta de nuevo en unos minutos.');
    expect(mensajeErrorDescargaPorVersion(error(404, 'NOT_FOUND')).texto).toBe('Alguna de las versiones elegidas ya no existe. Vuelve a elegirlas.');
    expect(mensajeErrorDescargaPorVersion(error(403, 'FORBIDDEN')).texto).toBe('No tienes permiso para esta acción.');
    expect(mensajeErrorDescargaPorVersion(error(500, 'INTERNAL_ERROR'))).toEqual({ texto: MENSAJE_DESCARGA_GENERICO, enModal: false });
  });
});

describe('literal de encabezados del Pivote (idéntico al del back)', () => {
  it('comunes y campos de bloque', () => {
    expect([...ENCABEZADOS_COMUNES_PIVOTE]).toEqual(['SKU', 'Descripcion', 'Nombre_planograma', 'Estado_version', 'Modo', 'SKU_sustituto']);
    expect(CAMPOS_BLOQUE_PIVOTE).toHaveLength(13);
    expect(encabezadosBloque('TG', 2).slice(0, 3)).toEqual(['Planograma_TG', 'Facings_TG', 'Cantidad_x_facing_TG']);
    expect(encabezadosBloque('TM', 2).slice(-3)).toEqual(['Observaciones_TM', 'TM1', 'TM2']);
    expect(encabezadosBloque('TE', 0)).toHaveLength(13);
  });
});
