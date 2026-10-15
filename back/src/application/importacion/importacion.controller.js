/**
 * importacion.controller.js
 * Extrae parámetros del request, llama al usecase correspondiente y formatea la respuesta.
 * No contiene lógica de negocio ni accede a la BD directamente.
 */

const usecases        = require('../../domain/importacion/importacion.usecases');
const { schemaImportar, schemaImportarProductos, validarBody } = require('./importacion.schemas');
const importacionRepo = require('../../infrastructure/repositories/importacion.repository');
const gondolaRepo     = require('../../infrastructure/repositories/gondola.repository');
const versionRepo     = require('../../infrastructure/repositories/version.repository');
const accesorioRepo   = require('../../infrastructure/repositories/accesorio.repository');
const productoRepo    = require('../../infrastructure/repositories/producto.repository');

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parsearId(valor) {
  const id = parseInt(valor, 10);
  if (isNaN(id) || id < 1) {
    const err = new Error('El id debe ser un entero positivo');
    err.status = 400;
    err.code   = 'VALIDATION_ERROR';
    throw err;
  }
  return id;
}

// ─── Handlers ────────────────────────────────────────────────────────────────

async function importarLayout(req, res, next) {
  try {
    const versionId = parsearId(req.params.id);
    const datos     = validarBody(schemaImportar, req.body);
    const resultado = await usecases.importarLayout(
      { importacionRepo, gondolaRepo, versionRepo, accesorioRepo, productoRepo },
      versionId,
      datos,
    );
    res.status(201).json(resultado);
  } catch (err) {
    next(err);
  }
}

async function importarProductos(req, res, next) {
  try {
    const versionId = parsearId(req.params.id);
    const datos     = validarBody(schemaImportarProductos, req.body);
    const resultado = await usecases.importarProductos(
      { importacionRepo, versionRepo, accesorioRepo, productoRepo },
      versionId,
      datos,
    );
    res.status(201).json(resultado);
  } catch (err) {
    next(err);
  }
}

module.exports = { importarLayout, importarProductos };
