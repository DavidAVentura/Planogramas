/**
 * tienda.entity.js
 * Reglas de negocio puras del dominio Tienda.
 * Sin dependencias de Express, Knex ni ninguna infraestructura.
 */

const TIPOS = Object.freeze(['GRANDE', 'MEDIANA', 'EXPRESS']);

const ESTADOS = Object.freeze({
  ACTIVO:   'activo',
  INACTIVO: 'inactivo',
});

/** Valor del filtro `estado` de GET /tiendas que no filtra por estado (vista de administración). */
const FILTRO_ESTADO_TODOS = 'todos';

/** Marcas de punto de venta. Una tienda sin marca asignada guarda `null`. */
const MARCAS = Object.freeze(['Cemaco', 'Jugueton', 'Bebé Jugueton']);

/**
 * Valida el grupo cohesivo de parámetros `sinVersionEspecial` + `planogramaId` +
 * `versionBaseId`: los tres deben ir juntos o ninguno.
 * @param {{ sinVersionEspecial?, planogramaId?, versionBaseId? }} filtros
 */
function validarGrupoSinVersionEspecial(filtros) {
  if (!filtros.sinVersionEspecial) return;

  if (filtros.planogramaId === undefined || filtros.versionBaseId === undefined) {
    const err = new Error('sinVersionEspecial=true requiere planogramaId y versionBaseId');
    err.status = 400;
    err.code   = 'VALIDATION_ERROR';
    throw err;
  }
}

module.exports = {
  TIPOS,
  ESTADOS,
  FILTRO_ESTADO_TODOS,
  MARCAS,
  validarGrupoSinVersionEspecial,
};
