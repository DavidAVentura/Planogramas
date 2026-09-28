/**
 * implementacion.controller.js
 * Vista del Implementador (Arquitectura/Contratos/16_implementacion/): extrae parámetros, llama al
 * usecase inyectando el repositorio y el puerto de inventario (CATI) y formatea la respuesta.
 * No contiene lógica de negocio ni accede a la BD ni a CATI directamente.
 */

const usecases           = require('../../domain/implementacion/implementacion.usecases');
const implementacionRepo = require('../../infrastructure/repositories/implementacion.repository');
const inventarioTienda   = require('../../infrastructure/cati/inventarioTienda');
const { parsearEnteroPositivo, parsearListaEnterosPositivos } = require('../compartido/validacion');

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
      implementacionRepo, inventarioTienda, tiendaId, versionIds,
    );
    res.json(resultado);
  } catch (err) {
    next(err);
  }
}

module.exports = { obtenerResumen, obtenerProductos };
