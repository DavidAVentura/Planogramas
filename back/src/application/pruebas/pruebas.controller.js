/**
 * pruebas.controller.js
 * Soporte de la colección Postman: siembra fixtures y limpia lo creado por una corrida.
 * Solo se monta con PRUEBAS_HABILITADAS=true y fuera de producción (ver routes/index.js).
 */

const Joi         = require('joi');
const usecases    = require('../../domain/pruebas/pruebas.usecases');
const repo        = require('../../infrastructure/repositories/pruebas.repository');
const blobStorage = require('../../infrastructure/storage/blobClient');
const { validarConJoi, usuarioActual } = require('../compartido/validacion');

const listaIds = Joi.array().items(Joi.number().integer().min(1)).default([]);

const schemaLimpieza = Joi.object({
  planogramaIds: listaIds,
  tiendaIds:     listaIds,
  skus:          Joi.array().items(Joi.string().trim().min(1)).default([]),
  accesorioIds:  listaIds,
});

async function sembrarFixtures(req, res, next) {
  try {
    const fixtures = await usecases.sembrarFixtures(repo, usuarioActual(req));
    res.status(201).json(fixtures);
  } catch (err) {
    next(err);
  }
}

async function limpiar(req, res, next) {
  try {
    const datos     = validarConJoi(schemaLimpieza, req.body ?? {});
    const resultado = await usecases.limpiarDatos(repo, blobStorage, datos);
    res.json(resultado);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  sembrarFixtures,
  limpiar,
};
