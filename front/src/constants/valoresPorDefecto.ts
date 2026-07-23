/**
 * Valores por defecto de Cemaco para góndolas y niveles nuevos. Se precargan en los formularios
 * del editor (GondolaModal, NivelModal) y el Agente Extractor del Planograma los usa con el mismo
 * criterio al crear estos elementos desde el chat (ver DEFAULTS en
 * back/src/agents/agenteExtractor/agenteExtractor.js — misma fuente de verdad, duplicada ahí
 * porque el backend no puede importar del frontend). El usuario siempre puede editarlos.
 */

export const GONDOLA_DEFAULTS = {
  ancho_cm: 200,
  alto_cm: 230,
  profundidad_cm: 50,
} as const;

export const NIVEL_DEFAULTS = {
  altura_desde_piso_cm: 5,
  tipo_accesorio: 'BANDEJA',
} as const;
