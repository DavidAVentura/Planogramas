/**
 * Valores por defecto de Cemaco para góndolas y niveles nuevos. Se precargan en los formularios
 * del editor (GondolaModal, NivelModal) y el Agente Extractor del Planograma los usa con el mismo
 * criterio al crear estos elementos desde el chat. Las medidas de góndola replican
 * GONDOLA_DEFAULTS de back/src/domain/gondola/gondola.entity.js (de donde salen también las
 * góndolas que nacen con una versión nueva) y los de nivel, DEFAULTS de
 * back/src/agents/agenteExtractor/agenteExtractor.js — duplicados porque el front no importa del
 * back. El usuario siempre puede editarlos.
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

/** Ancho (cm) de una posición PENDIENTE creada vacía (sin SKU) desde el Lienzo — placeholder
 * hasta que se le asigne un SKU, momento en el que `asignarSku` recalcula el ancho real a
 * partir del producto (ver `posicion.usecases.js`). */
export const POSICION_PENDIENTE_ANCHO_CM = 10;
