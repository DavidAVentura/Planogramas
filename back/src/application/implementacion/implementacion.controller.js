/**
 * implementacion.controller.js
 * Vista del Implementador y vista Por versión del Analista (Arquitectura/Contratos/16_implementacion/): extrae parámetros, llama al
 * usecase inyectando el repositorio y el puerto de inventario (CATI) y formatea la respuesta.
 * No contiene lógica de negocio ni accede a la BD ni a CATI directamente.
 */

const usecases           = require('../../domain/implementacion/implementacion.usecases');
const implementacionRepo = require('../../infrastructure/repositories/implementacion.repository');
const inventarioTienda   = require('../../infrastructure/cati/inventarioTienda');
const skuVersionRepo     = require('../../infrastructure/repositories/skuVersion.repository');
const catiClient         = require('../../infrastructure/cati/catiClient');
const { escribirLibroXlsx } = require('../../infrastructure/exportacion/libroXlsx');
const env                = require('../../config/env');
const { errorValidacion, parsearEnteroPositivo, parsearListaEnterosPositivos, validarQueryEstricta } = require('../compartido/validacion');
const { PATRON_JERARQUIA } = require('../compartido/esquemasComunes');
const { semaforoExportacion } = require('../compartido/semaforo');
const { schemaExportar } = require('./implementacion.schemas');

/** Tope de versiones por consulta en Por versión: cada una suma sus posiciones y su inventario. */
const MAX_VERSIONES_POR_CONSULTA = 50;

const CONTENT_TYPE_XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

// ─── Handlers ────────────────────────────────────────────────────────────────

async function obtenerResumen(req, res, next) {
  try {
    const tiendaId  = parsearEnteroPositivo(req.params.tiendaId, 'tiendaId');
    const resultado = await usecases.obtenerResumenImplementacion(implementacionRepo, inventarioTienda, tiendaId);
    res.json(resultado);
  } catch (err) {
    next(err);
  }
}

async function obtenerProductos(req, res, next) {
  try {
    const tiendaId   = parsearEnteroPositivo(req.params.tiendaId, 'tiendaId');
    const versionIds = parsearListaEnterosPositivos(req.query.versionIds, 'versionIds');
    const resultado  = await usecases.obtenerProductosImplementacion(
      implementacionRepo, inventarioTienda, tiendaId, versionIds, skuVersionRepo,
    );
    res.json(resultado);
  } catch (err) {
    next(err);
  }
}

// ─── Vista Por versión (Analista) ────────────────────────────────────────────

async function listarVersiones(req, res, next) {
  try {
    const incluir   = parsearListaEnterosPositivos(req.query.incluir, 'incluir') ?? [];
    const resultado = await usecases.listarVersionesPorVersion(implementacionRepo, incluir);
    res.json(resultado);
  } catch (err) {
    next(err);
  }
}

/** Código de Área/Departamento opcional: un único texto con el patrón (vacío o arreglo → 400). */
function parsearCodigoJerarquia(valor, nombre) {
  if (valor === undefined) return undefined;
  if (typeof valor !== 'string' || !PATRON_JERARQUIA.test(valor)) {
    throw errorValidacion(`${nombre} debe ser un código de 1 a 20 caracteres (letras, números, guion o guion bajo)`);
  }
  return valor;
}

async function obtenerProductosPorVersion(req, res, next) {
  try {
    const versionIds = parsearListaEnterosPositivos(req.query.versionIds, 'versionIds');
    if (!versionIds || versionIds.length === 0) throw errorValidacion('versionIds es requerido');
    if (versionIds.length > MAX_VERSIONES_POR_CONSULTA) {
      throw errorValidacion(`versionIds admite como máximo ${MAX_VERSIONES_POR_CONSULTA} versiones`);
    }
    const tiendaId = req.query.tiendaId === undefined ? undefined : parsearEnteroPositivo(req.query.tiendaId, 'tiendaId');

    const area         = parsearCodigoJerarquia(req.query.area, 'area');
    const departamento = parsearCodigoJerarquia(req.query.departamento, 'departamento');
    if (departamento && !area) throw errorValidacion('departamento requiere area');

    const resultado = await usecases.obtenerProductosPorVersion(
      implementacionRepo, inventarioTienda, { versionIds, tiendaId, area, departamento }, skuVersionRepo, catiClient,
    );
    res.json(resultado);
  } catch (err) {
    next(err);
  }
}

// ─── Descarga de productos por planograma (CU-10-06) ─────────────────────────

/**
 * Fábrica con dependencias inyectables (pruebas) y controller por defecto con las reales. Valida el
 * cuerpo de forma estricta y usa el valor devuelto por Joi; el libro se genera completo ANTES de
 * fijar cabeceras: si falla, el error sale como JSON y nunca un archivo truncado. El log no lleva
 * ids, códigos de jerarquía ni token.
 */
function crearControllerExportacion({ repo, catalogo, escribirLibro, semaforo, maximoFilas, ahora = () => new Date() }) {
  async function exportar(req, res, next) {
    try {
      const inicio = Date.now();
      const q = validarQueryEstricta(schemaExportar, { ...(req.body ?? {}) });

      const { buffer, filas, nombre } = await usecases.exportarProductosPorVersion(
        { repo, catalogo, escribirLibro, semaforo, maximoFilas, ahora },
        { versionIds: q.versionIds, formato: q.formato, area: q.area, departamento: q.departamento, posicionIds: q.posicionIds },
      );

      console.info(
        `[implementacion] exportacion numeroEmpleado=${req.usuario?.numeroEmpleado} formato=${q.formato} `
        + `versiones=${q.versionIds.length} filtroCliente=${q.posicionIds ? 'si' : 'no'} filas=${filas} ms=${Date.now() - inicio}`,
      );

      res.set({
        'Content-Type':        CONTENT_TYPE_XLSX,
        'Content-Disposition': `attachment; filename="${nombre}"`,
        'Cache-Control':       'no-store',
        'Content-Length':      String(buffer.length),
      });
      res.send(buffer);
    } catch (err) {
      next(err);
    }
  }

  return { exportar };
}

// Semáforo único del proceso, compartido con la exportación del consolidado.
const controllerExportacion = crearControllerExportacion({
  repo: implementacionRepo,
  catalogo: catiClient,
  escribirLibro: escribirLibroXlsx,
  semaforo: semaforoExportacion,
  maximoFilas: env.consolidado.exportacionMaxFilas,
});

module.exports = {
  obtenerResumen, obtenerProductos, listarVersiones, obtenerProductosPorVersion,
  ...controllerExportacion, crearControllerExportacion,
};
