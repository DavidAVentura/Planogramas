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
const { errorValidacion, parsearEnteroPositivo, parsearListaEnterosPositivos } = require('../compartido/validacion');

/** Tope de versiones por consulta en Por versión: cada una suma sus posiciones y su inventario. */
const MAX_VERSIONES_POR_CONSULTA = 50;

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

async function obtenerProductosPorVersion(req, res, next) {
  try {
    const versionIds = parsearListaEnterosPositivos(req.query.versionIds, 'versionIds');
    if (!versionIds || versionIds.length === 0) throw errorValidacion('versionIds es requerido');
    if (versionIds.length > MAX_VERSIONES_POR_CONSULTA) {
      throw errorValidacion(`versionIds admite como máximo ${MAX_VERSIONES_POR_CONSULTA} versiones`);
    }
    const tiendaId = req.query.tiendaId === undefined ? undefined : parsearEnteroPositivo(req.query.tiendaId, 'tiendaId');

    const resultado = await usecases.obtenerProductosPorVersion(
      implementacionRepo, inventarioTienda, { versionIds, tiendaId }, skuVersionRepo,
    );
    res.json(resultado);
  } catch (err) {
    next(err);
  }
}

module.exports = { obtenerResumen, obtenerProductos, listarVersiones, obtenerProductosPorVersion };
