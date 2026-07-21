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

/**
 * Estados desde los que se puede archivar una versión manualmente vía `archivar`.
 * `publicado` queda fuera a propósito: solo se archiva automáticamente cuando otra
 * versión la reemplaza (ver `promoverVersion`), para no retirar por error una versión
 * que las tiendas puedan estar usando activamente.
 */
const ESTADOS_ARCHIVABLES = Object.freeze([ESTADOS.BORRADOR, ESTADOS.EN_DESARROLLO, ESTADOS.PILOTO]);

function errorUnprocessable(mensaje) {
  const err = new Error(mensaje);
  err.status = 422;
  err.code   = 'UNPROCESSABLE';
  return err;
}

/**
 * Genera el código de versión base con el patrón {NOMBRE_PLANOGRAMA}-T{INICIAL_TIPO}.
 * Ej: generarCodigo('LIMPIEZA 03', 'GRANDE') → 'LIMPIEZA 03-TG'
 * @param {string} nombrePlanograma
 * @param {string} tipo
 * @returns {string}
 */
function generarCodigo(nombrePlanograma, tipo) {
  const nombre = nombrePlanograma.trim().toUpperCase();
  return `${nombre}-T${INICIALES_TIPO[tipo]}`;
}

/**
 * Genera el código de versión especial por tienda, agregando el código de tienda como sufijo.
 * Ej: generarCodigoEspecial('LIMPIEZA 03', 'GRANDE', 'T0PC') → 'LIMPIEZA 03-TG-T0PC'
 * @param {string} nombrePlanograma
 * @param {string} tipo
 * @param {string} codigoTienda
 * @returns {string}
 */
function generarCodigoEspecial(nombrePlanograma, tipo, codigoTienda) {
  return `${generarCodigo(nombrePlanograma, tipo)}-${codigoTienda.trim().toUpperCase()}`;
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

/**
 * Valida que la versión se pueda archivar manualmente desde su estado actual.
 * @param {string} estadoActual
 */
function validarTransicionArchivar(estadoActual) {
  if (!ESTADOS_ARCHIVABLES.includes(estadoActual)) {
    throw errorUnprocessable(`No se puede archivar una versión en estado '${estadoActual}'`);
  }
}

module.exports = {
  TIPOS,
  ESTADOS,
  generarCodigo,
  generarCodigoEspecial,
  validarPlanogramaNoArchivado,
  validarNoArchivada,
  calcularTransicionGuardar,
  validarTransicionPromover,
  validarTransicionArchivar,
};
