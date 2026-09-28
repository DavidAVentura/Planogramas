import { useCallback, useEffect, useState } from 'react';
import {
  cargarPreferenciasColumnas,
  guardarPreferenciasColumnas,
} from '../config/preferenciasImplementador';
import type { PreferenciasColumnas } from '../domain/implementacion/columnasProductos';

/**
 * Orden y visibilidad de columnas y orden de filas de la tabla Productos del Implementador,
 * recordados en este navegador. Se validan al leer (ver `validarPreferencias`).
 */
export function usePreferenciasColumnas() {
  const [prefs, setPrefs] = useState<PreferenciasColumnas>(cargarPreferenciasColumnas);

  useEffect(() => {
    guardarPreferenciasColumnas(prefs);
  }, [prefs]);

  const actualizar = useCallback(
    (cambio: (actual: PreferenciasColumnas) => PreferenciasColumnas) => setPrefs(cambio),
    [],
  );

  return { prefs, actualizar };
}
