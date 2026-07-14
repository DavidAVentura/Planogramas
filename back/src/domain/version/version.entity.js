/**
 * version.entity.js
 * Reglas de negocio puras del dominio PlanogramaVersion.
 * Sin dependencias de Express, Knex ni ninguna infraestructura.
 */

const TIPOS = Object.freeze({
  GRANDE:  'GRANDE',
  MEDIANA: 'MEDIANA',
  EXPRESS: 'EXPRESS',
});

const ESTADOS = Object.freeze({
  BORRADOR:       'borrador',
  EN_DESARROLLO:  'en_desarrollo',
  PILOTO:         'piloto',
  PUBLICADO:      'publicado',
  ARCHIVADO:      'archivado',
});

/** Estados en los que una versión cuenta como "activa" para la regla de unicidad por tipo. */
const ESTADOS_ACTIVOS = Object.freeze([ESTADOS.BORRADOR, ESTADOS.EN_DESARROLLO, ESTADOS.PILOTO]);

const INICIALES_TIPO = Object.freeze({
  [TIPOS.GRANDE]:  'G',
  [TIPOS.MEDIANA]: 'M',
  [TIPOS.EXPRESS]: 'E',
});

/** Transición válida de `promover`: estado actual → estado destino permitido. */
const TRANSICION_PROMOVER = Object.freeze({
  [ESTADOS.EN_DESARROLLO]: ESTADOS.PILOTO,
  [ESTADOS.PILOTO]:        ESTADOS.PUBLICADO,
});

function errorUnprocessable(mensaje) {
  const err = new Error(mensaje);
  err.status = 422;
  err.code   = 'UNPROCESSABLE';
  return err;
}

/**
 * Genera el código de versión con el patrón {DEPARTAMENTO}-T{INICIAL_TIPO}-{SECUENCIAL}.
 * Ej: generarCodigo('Autos', 'GRANDE', 2) → 'AUTOS-TG-02'
 * @param {string} departamento
 * @param {string} tipo
 * @param {number} secuencial
 * @returns {string}
 */
function generarCodigo(departamento, tipo, secuencial) {
  const dep = departamento.trim().toUpperCase().replace(/\s+/g, '');
  const seq = String(secuencial).padStart(2, '0');
  return `${dep}-T${INICIALES_TIPO[tipo]}-${seq}`;
}

/**
 * Valida que se puedan crear versiones nuevas en el planograma.
 * @param {string} estadoPlanograma
 */
function validarPlanogramaNoArchivado(estadoPlanograma) {
  if (estadoPlanograma === 'archivado') {
    throw errorUnprocessable('No se pueden crear versiones en un planograma archivado');
  }
}

/**
 * Valida que la versión no esté archivada (metadatos, tiendas).
 * @param {string} estadoActual
 * @param {string} mensaje
 */
function validarNoArchivada(estadoActual, mensaje) {
  if (estadoActual === ESTADOS.ARCHIVADO) {
    throw errorUnprocessable(mensaje);
  }
}

/**
 * Calcula el estado destino de la acción "guardar".
 * `borrador` avanza a `en_desarrollo`; `en_desarrollo`/`piloto` no cambian de estado.
 * `publicado`/`archivado` rechazan la operación.
 * @param {string} estadoActual
 * @returns {string} nuevo estado
 */
function calcularTransicionGuardar(estadoActual) {
  if (estadoActual === ESTADOS.PUBLICADO || estadoActual === ESTADOS.ARCHIVADO) {
    throw errorUnprocessable(`No se puede guardar una versión en estado '${estadoActual}'`);
  }
  return estadoActual === ESTADOS.BORRADOR ? ESTADOS.EN_DESARROLLO : estadoActual;
}

/**
 * Valida que la transición de `promover` sea válida según la máquina de estados.
 * @param {string} estadoActual
 * @param {string} estadoDestino
 */
function validarTransicionPromover(estadoActual, estadoDestino) {
  if (TRANSICION_PROMOVER[estadoActual] !== estadoDestino) {
    throw errorUnprocessable(`No se puede promover de '${estadoActual}' a '${estadoDestino}'`);
  }
}

module.exports = {
  TIPOS,
  ESTADOS,
  ESTADOS_ACTIVOS,
  generarCodigo,
  validarPlanogramaNoArchivado,
  validarNoArchivada,
  calcularTransicionGuardar,
  validarTransicionPromover,
};
