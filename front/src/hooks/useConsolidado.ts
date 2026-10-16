import { useCallback, useEffect, useMemo, useState } from 'react';
import { consolidadoService } from '../services/consolidado.service';
import { ApiError } from '../services/httpClient';
import type { QueryConsolidado } from '../domain/consolidado/filtrosConsolidado';
import type { RespuestaConsolidado } from '../types/consolidado';

/**
 * Listado del consolidado para una query. Una respuesta vieja nunca pisa a una nueva: al cambiar la
 * query (o recargar) la petición anterior queda descartada. Mientras llega la nueva se conserva la
 * última respuesta en `datos` para que el resumen no parpadee; la tabla usa `cargando`.
 */
export function useConsolidado(query: QueryConsolidado) {
  const [datos, setDatos] = useState<RespuestaConsolidado | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  const [recargas, setRecargas] = useState(0);

  // La query se compara por valor: la página arma un objeto nuevo en cada render.
  const clave = JSON.stringify(query);
  const consulta = useMemo(() => JSON.parse(clave) as QueryConsolidado, [clave]);

  useEffect(() => {
    let vigente = true;
    setCargando(true);
    setError(null);
    consolidadoService
      .listar(consulta)
      .then((respuesta) => vigente && setDatos(respuesta))
      .catch((err) => vigente && setError(err instanceof ApiError ? err : new ApiError(0, 'ERROR', 'Error inesperado')))
      .finally(() => vigente && setCargando(false));
    return () => {
      vigente = false;
    };
  }, [consulta, recargas]);

  const recargar = useCallback(() => setRecargas((n) => n + 1), []);

  return { datos, cargando, error, recargar };
}
