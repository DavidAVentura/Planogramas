/**
 * version.usecases.js
 * Casos de uso del dominio PlanogramaVersion.
 * Reciben el repositorio por inyección de dependencia — sin imports de infraestructura.
 *
 * Crear/listar versiones son operaciones sobre el agregado Planograma+Version: por eso
 * reciben también el repositorio de Planograma, inyectado desde el controlador.
 */

const {
  ESTADOS,
  generarCodigo,
  validarPlanogramaNoArchivado,
  validarNoArchivada,
  calcularTransicionGuardar,
  validarTransicionPromover,
} = require('./version.entity');

// ─── Helpers privados ────────────────────────────────────────────────────────

function errorNotFound(mensaje) {
  const err = new Error(mensaje);
  err.status = 404;
  err.code   = 'NOT_FOUND';
  return err;
}

function errorConflict(mensaje, details) {
  const err = new Error(mensaje);
  err.status = 409;
  err.code   = 'CONFLICT';
  if (details) err.details = details;
  return err;
}

function errorVersionNoEncontrada(id) {
  return errorNotFound(`Versión ${id} no encontrada`);
}

function errorPlanogramaNoEncontrado(id) {
  return errorNotFound(`Planograma ${id} no encontrado`);
}

// ─── Listar / Crear (agregado Planograma → Version) ─────────────────────────

/**
 * Lista las versiones de un planograma.
 * @param {object} versionRepo
 * @param {object} planogramaRepo
 * @param {number} planogramaId
 * @param {{ incluirArchivadas?: boolean }} filtros
 * @returns {Promise<{ versiones: object[] }>}
 */
async function listarVersiones(versionRepo, planogramaRepo, planogramaId, filtros) {
  const planograma = await planogramaRepo.buscarPorId(planogramaId);
  if (!planograma) throw errorPlanogramaNoEncontrado(planogramaId);

  const versiones = await versionRepo.listarPorPlanograma(planogramaId, filtros);
  return { versiones };
}

async function crearVersionVacia(versionRepo, planograma, datos) {
  const activa = await versionRepo.buscarVersionActivaDeTipo(planograma.id, datos.tipo);
  if (activa) {
    throw errorConflict(
      `Ya existe una versión activa de tipo ${datos.tipo}. Archívala antes de crear una nueva.`,
      { versionActiva: activa },
    );
  }

  const secuencial = await versionRepo.siguienteSecuencial(planograma.id, datos.tipo);
  const codigo     = generarCodigo(planograma.departamento, datos.tipo, secuencial);

  const id = await versionRepo.crear({
    planograma_id: planograma.id,
    tipo:          datos.tipo,
    codigo,
    estado:        ESTADOS.BORRADOR,
    notas:         datos.notas ?? null,
  });

  return versionRepo.buscarPorId(id);
}

async function crearVersionEspecial(versionRepo, planograma, datos) {
  const versionBase = await versionRepo.buscarPorId(datos.versionBaseId);
  if (!versionBase || versionBase.planogramaId !== planograma.id) {
    throw errorNotFound(`Versión base ${datos.versionBaseId} no encontrada en este planograma`);
  }

  const yaClonada = await versionRepo.tiendaTieneVersionEspecialDeBase(datos.versionBaseId, datos.tiendaId);
  if (yaClonada) {
    throw errorConflict('La tienda ya tiene una versión especial derivada de esta versión base');
  }

  const secuencial = await versionRepo.siguienteSecuencial(planograma.id, datos.tipo);
  const codigo     = generarCodigo(planograma.departamento, datos.tipo, secuencial);

  const id = await versionRepo.crearConClon(
    {
      planograma_id:   planograma.id,
      tipo:            datos.tipo,
      codigo,
      estado:          ESTADOS.BORRADOR,
      notas:           datos.notas ?? null,
      version_base_id: datos.versionBaseId,
    },
    datos.versionBaseId,
    datos.tiendaId,
  );

  return versionRepo.buscarPorId(id);
}

/**
 * Crea una versión nueva. Si `datos.versionBaseId` está presente, crea una versión
 * especial por tienda clonando la estructura de esa versión base (CU-02-02);
 * de lo contrario crea una versión vacía (CU-02-01).
 * @param {object} versionRepo
 * @param {object} planogramaRepo
 * @param {number} planogramaId
 * @param {{ tipo, notas?, versionBaseId?, tiendaId? }} datos
 * @returns {Promise<object>}
 */
async function crearVersion(versionRepo, planogramaRepo, planogramaId, datos) {
  const planograma = await planogramaRepo.buscarPorId(planogramaId);
  if (!planograma) throw errorPlanogramaNoEncontrado(planogramaId);

  validarPlanogramaNoArchivado(planograma.estado);

  return datos.versionBaseId
    ? crearVersionEspecial(versionRepo, planograma, datos)
    : crearVersionVacia(versionRepo, planograma, datos);
}

// ─── Detalle / estructura ────────────────────────────────────────────────────

/**
 * Retorna el detalle completo de una versión (todos los campos, para el editor del Analista).
 * @param {object} versionRepo
 * @param {number} id
 * @param {{ vistaImplementador?: boolean }} opciones
 * @returns {Promise<object>}
 */
async function obtenerDetalle(versionRepo, id, opciones) {
  const version = await versionRepo.buscarPorId(id);
  if (!version) throw errorVersionNoEncontrada(id);

  return versionRepo.obtenerDetalleCompleto(id, opciones);
}

/**
 * Retorna la estructura reducida de una versión publicada (vista del Implementador).
 * @param {object} versionRepo
 * @param {number} id
 * @param {{ vistaImplementador?: boolean }} opciones
 * @returns {Promise<object>}
 */
async function obtenerEstructuraPublicada(versionRepo, id, opciones) {
  const version = await versionRepo.buscarPorId(id);
  if (!version) throw errorVersionNoEncontrada(id);

  if (version.estado !== ESTADOS.PUBLICADO) {
    const err = new Error('La versión no está publicada');
    err.status = 403;
    err.code   = 'FORBIDDEN';
    throw err;
  }

  return versionRepo.obtenerEstructuraPublicada(id, opciones);
}

// ─── Metadatos ───────────────────────────────────────────────────────────────

/**
 * Aplica un partial update de notas y/o código.
 * @param {object} versionRepo
 * @param {number} id
 * @param {{ notas?, codigo? }} cambios
 * @returns {Promise<object>}
 */
async function editarMetadatos(versionRepo, id, cambios) {
  const version = await versionRepo.buscarPorId(id);
  if (!version) throw errorVersionNoEncontrada(id);

  validarNoArchivada(version.estado, 'No se puede editar una versión archivada');

  if (cambios.codigo !== undefined) {
    const duplicado = await versionRepo.existeCodigoEnPlanograma(version.planogramaId, cambios.codigo, id);
    if (duplicado) throw errorConflict('El código ya existe en otra versión de este planograma');
  }

  await versionRepo.actualizarMetadatos(id, cambios);
  return versionRepo.buscarPorId(id);
}

// ─── Guardar ─────────────────────────────────────────────────────────────────

/**
 * Acción "Guardar" del editor: borrador → en_desarrollo, o solo refresca updated_at.
 * @param {object} versionRepo
 * @param {number} id
 * @returns {Promise<object>}
 */
async function guardarVersion(versionRepo, id) {
  const version = await versionRepo.buscarPorId(id);
  if (!version) throw errorVersionNoEncontrada(id);

  const nuevoEstado = calcularTransicionGuardar(version.estado);
  await versionRepo.actualizarEstado(id, nuevoEstado);

  return versionRepo.buscarPorId(id);
}

// ─── Promover ────────────────────────────────────────────────────────────────

/**
 * Avanza el estado de la versión: en_desarrollo → piloto, o piloto → publicado.
 * @param {object} versionRepo
 * @param {number} id
 * @param {{ estadoDestino: string, tiendaIds?: number[] }} datos
 * @returns {Promise<object>}
 */
async function promoverVersion(versionRepo, id, datos) {
  const version = await versionRepo.buscarPorId(id);
  if (!version) throw errorVersionNoEncontrada(id);

  validarTransicionPromover(version.estado, datos.estadoDestino);

  if (datos.estadoDestino === ESTADOS.PILOTO) {
    const { tiendas } = await versionRepo.promoverAPiloto(id, datos.tiendaIds);
    const actualizada = await versionRepo.buscarPorId(id);
    return { ...actualizada, tiendas };
  }

  const errores = await versionRepo.buscarErroresBloqueantes(id);
  if (errores.length > 0) {
    const err = new Error('Existen errores bloqueantes que impiden publicar');
    err.status  = 422;
    err.code    = 'UNPROCESSABLE';
    err.details = errores;
    throw err;
  }

  const { versionAnteriorArchivada } = await versionRepo.promoverAPublicado(id);
  const actualizada = await versionRepo.buscarPorId(id);
  return { ...actualizada, versionAnteriorArchivada };
}

// ─── Tiendas ─────────────────────────────────────────────────────────────────

/**
 * Lista las tiendas asignadas y disponibles para una versión.
 * @param {object} versionRepo
 * @param {number} id
 * @returns {Promise<{ asignadas: object[], disponibles: object[] }>}
 */
async function listarTiendasVersion(versionRepo, id) {
  const version = await versionRepo.buscarPorId(id);
  if (!version) throw errorVersionNoEncontrada(id);

  return versionRepo.listarTiendas(id);
}

/**
 * Reemplaza el listado completo de tiendas asignadas a la versión.
 * @param {object} versionRepo
 * @param {number} id
 * @param {number[]} tiendaIds
 * @returns {Promise<{ tiendas: object[], ignorados: number[] }>}
 */
async function reemplazarTiendasVersion(versionRepo, id, tiendaIds) {
  const version = await versionRepo.buscarPorId(id);
  if (!version) throw errorVersionNoEncontrada(id);

  validarNoArchivada(version.estado, 'No se pueden modificar las tiendas de una versión archivada');

  return versionRepo.reemplazarTiendas(id, tiendaIds);
}

module.exports = {
  listarVersiones,
  crearVersion,
  obtenerDetalle,
  obtenerEstructuraPublicada,
  editarMetadatos,
  guardarVersion,
  promoverVersion,
  listarTiendasVersion,
  reemplazarTiendasVersion,
};
