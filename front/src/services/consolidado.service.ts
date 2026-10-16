import { httpClient } from './httpClient';
import type { FiltrosDisponiblesConsolidado, RespuestaConsolidado } from '../types/consolidado';

type Query = Record<string, string | number | boolean | undefined>;

export const consolidadoService = {
  /** Listado paginado SKU–tienda–versión (publicadas y piloto asignadas a tiendas). */
  listar: (query: Query) => httpClient.get<RespuestaConsolidado>('/consolidado/tiendas', query),

  /** Opciones de los modales de tienda y versión. */
  obtenerFiltros: () => httpClient.get<FiltrosDisponiblesConsolidado>('/consolidado/tiendas/filtros'),

  /** .xlsx generado en el servidor con los mismos filtros del listado. */
  descargar: (query: Query) => httpClient.getBinario('/consolidado/tiendas/exportar', query),
};
