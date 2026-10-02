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
  generarCodigoEspecial,
  validarPlanogramaNoArchivado,
  validarNoArchivada,
  calcularTransicionGuardar,
  validarTransicionPromover,
  validarTransicionArchivar,
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

async function validarSinBorradorDeTipo(versionRepo, planogramaId, tipo) {
  const borrador = await versionRepo.buscarVersionEnEstado(planogramaId, tipo, ESTADOS.BORRADOR);
  if (borrador) {
    throw errorConflict(
      `Ya existe una versión en borrador de tipo ${tipo}. Archívala o promuévela antes de crear una nueva.`,
      { versionActiva: borrador },
    );
  }
}

async function crearVersionVacia(versionRepo, planograma, datos) {
  await validarSinBorradorDeTipo(versionRepo, planograma.id, datos.tipo);

  const codigo = generarCodigo(planograma.nombre, datos.tipo);

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

  // Sin llamada a validarSinBorradorDeTipo: la unicidad "una por estado" es una
  // regla de la línea base — las especiales por tienda no compiten entre sí ni
  // con la base por ningún estado.
  const yaClonada = await versionRepo.tiendaTieneVersionEspecialDeBase(datos.versionBaseId, datos.tiendaId);
  if (yaClonada) {
    throw errorConflict('La tienda ya tiene una versión especial derivada de esta versión base');
  }

  const tienda = await versionRepo.buscarTiendaPorId(datos.tiendaId);
  if (!tienda) throw errorNotFound(`Tienda ${datos.tiendaId} no encontrada`);

  const codigo = generarCodigoEspecial(planograma.nombre, datos.tipo, tienda.codigo);

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

/**
 * Ficha de solo lectura de una versión (modal "Ver versión" de Estructura).
 * @param {object} versionRepo
 * @param {number} id
 * @returns {Promise<object>}
 */
async function obtenerResumen(versionRepo, id) {
  const version = await versionRepo.buscarPorId(id);
  if (!version) throw errorVersionNoEncontrada(id);

  return versionRepo.obtenerResumen(id);
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

  if (version.estado === ESTADOS.BORRADOR && nuevoEstado === ESTADOS.EN_DESARROLLO) {
    const { versionAnteriorArchivada } = await versionRepo.guardarComoEnDesarrollo(id);
    const actualizada = await versionRepo.buscarPorId(id);
    return { ...actualizada, versionAnteriorArchivada };
  }

  await versionRepo.actualizarEstado(id, nuevoEstado);
  return versionRepo.buscarPorId(id);
}

// ─── Promover ────────────────────────────────────────────────────────────────

/**
 * Avanza el estado de la versión: en_desarrollo → piloto, o piloto → publicado.
 * @param {object} versionRepo
 * @param {number} id
 * @param {{ estadoDestino: string, tiendaIds?: number[] }} datos
 * @param {{ numero, nombre }} usuario  quien queda en la auditoría de asignaciones
 * @returns {Promise<object>}
 */
async function promoverVersion(versionRepo, id, datos, usuario) {
  const version = await versionRepo.buscarPorId(id);
  if (!version) throw errorVersionNoEncontrada(id);

  validarTransicionPromover(version.estado, datos.estadoDestino);
  const motivo = datos.motivo || null;

  if (datos.estadoDestino === ESTADOS.PILOTO) {
    const { tiendas, versionAnteriorArchivada } = await versionRepo.promoverAPiloto(id, datos.tiendaIds, usuario, motivo);
    const actualizada = await versionRepo.buscarPorId(id);
    return { ...actualizada, tiendas, versionAnteriorArchivada };
  }

  await validarPublicable(versionRepo, id);

  const { versionAnteriorArchivada } = await versionRepo.promoverAPublicado(id, usuario, motivo);
  const actualizada = await versionRepo.buscarPorId(id);
  return { ...actualizada, versionAnteriorArchivada };
}

function errorNoProcesable(mensaje, details) {
  const err = new Error(mensaje);
  err.status = 422;
  err.code   = 'UNPROCESSABLE';
  if (details) err.details = details;
  return err;
}

/**
 * Reglas para publicar una versión en piloto: sin errores bloqueantes y con al menos una
 * tienda piloto (si nadie la probó, el piloto no aportó nada).
 */
async function validarPublicable(versionRepo, id) {
  const errores = await versionRepo.buscarErroresBloqueantes(id);
  if (errores.length > 0) throw errorNoProcesable('Existen errores bloqueantes que impiden publicar', errores);

  const { asignadas } = await versionRepo.listarTiendas(id);
  if (asignadas.length === 0) {
    throw errorNoProcesable('La versión en piloto no tiene tiendas; asigna al menos una tienda piloto antes de publicar');
  }
}

/**
 * Simula la publicación de una versión en piloto sin guardar nada: errores bloqueantes y
 * qué pasaría con las tiendas. Responde 200 aun con errores, para que el front los muestre
 * antes de ofrecer "Publicar".
 * @param {object} versionRepo
 * @param {number} id
 * @returns {Promise<object>}
 */
async function simularPublicacion(versionRepo, id) {
  const version = await versionRepo.buscarPorId(id);
  if (!version) throw errorVersionNoEncontrada(id);

  validarTransicionPromover(version.estado, ESTADOS.PUBLICADO);

  const [erroresBloqueantes, plan] = await Promise.all([
    versionRepo.buscarErroresBloqueantes(id),
    versionRepo.simularPublicacion(id),
  ]);
  return {
    versionId:  id,
    codigo:     version.codigo,
    tipo:       version.tipo,
    esEspecial: version.versionBaseId !== null,
    erroresBloqueantes,
    ...plan,
  };
}

// ─── Archivar ────────────────────────────────────────────────────────────────

/**
 * Archiva la versión manualmente (borrador/en_desarrollo/piloto → archivado), sin
 * esperar a que otra versión la reemplace.
 * @param {object} versionRepo
 * @param {number} id
 * @returns {Promise<object>}
 */
async function archivarVersion(versionRepo, id) {
  const version = await versionRepo.buscarPorId(id);
  if (!version) throw errorVersionNoEncontrada(id);

  validarTransicionArchivar(version.estado);

  await versionRepo.actualizarEstado(id, ESTADOS.ARCHIVADO);
  return versionRepo.buscarPorId(id);
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
 * @param {{ numero, nombre }} usuario  quien queda en la auditoría de asignaciones
 * @returns {Promise<{ tiendas: object[], ignorados: number[] }>}
 */
async function reemplazarTiendasVersion(versionRepo, id, tiendaIds, usuario) {
  const version = await versionRepo.buscarPorId(id);
  if (!version) throw errorVersionNoEncontrada(id);

  validarNoArchivada(version.estado, 'No se pueden modificar las tiendas de una versión archivada');

  return versionRepo.reemplazarTiendas(id, tiendaIds, usuario);
}

module.exports = {
  listarVersiones,
  crearVersion,
  obtenerDetalle,
  obtenerEstructuraPublicada,
  obtenerResumen,
  editarMetadatos,
  guardarVersion,
  promoverVersion,
  simularPublicacion,
  archivarVersion,
  listarTiendasVersion,
  reemplazarTiendasVersion,
};
