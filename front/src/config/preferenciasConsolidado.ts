// Preferencias de columnas del Consolidado Tiendas guardadas en este navegador (localStorage). Si
// localStorage no está disponible o el valor guardado es inválido, se usan las columnas por defecto.
import {
  PREFERENCIAS_CONSOLIDADO_INICIALES,
  validarPreferenciasConsolidado,
  type PreferenciasConsolidado,
} from '../domain/consolidado/columnasConsolidado';

const CLAVE_COLUMNAS = 'planogramas.consolidado.columnas';

export function cargarPreferenciasConsolidado(): PreferenciasConsolidado {
  try {
    const crudo = localStorage.getItem(CLAVE_COLUMNAS);
    return crudo ? validarPreferenciasConsolidado(JSON.parse(crudo)) : PREFERENCIAS_CONSOLIDADO_INICIALES;
  } catch {
    return PREFERENCIAS_CONSOLIDADO_INICIALES;
  }
}

export function guardarPreferenciasConsolidado(prefs: PreferenciasConsolidado) {
  try {
    localStorage.setItem(CLAVE_COLUMNAS, JSON.stringify(prefs));
  } catch {
    // Sin localStorage la preferencia solo dura esta sesión.
  }
}
