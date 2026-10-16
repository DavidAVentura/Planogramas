import { useCallback, useEffect, useState } from 'react';
import { consolidadoService } from '../services/consolidado.service';
import type { FiltrosDisponiblesConsolidado } from '../types/consolidado';

/** Opciones de los modales de tienda y versión del consolidado (una sola llamada al montar). */
export function useFiltrosConsolidado() {
  const [opciones, setOpciones] = useState<FiltrosDisponiblesConsolidado | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);
  const [recargas, setRecargas] = useState(0);

  useEffect(() => {
    let vigente = true;
    setCargando(true);
    setError(false);
    consolidadoService
      .obtenerFiltros()
      .then((o) => vigente && setOpciones(o))
      .catch(() => vigente && setError(true))
      .finally(() => vigente && setCargando(false));
    return () => {
      vigente = false;
    };
  }, [recargas]);

  const recargar = useCallback(() => setRecargas((n) => n + 1), []);

  return { opciones, cargando, error, recargar };
}
