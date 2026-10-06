/**
 * importacion.controller.js
 * Extrae parámetros del request, llama al usecase correspondiente y formatea la respuesta.
 * No contiene lógica de negocio ni accede a la BD directamente.
 */

const Joi             = require('joi');
const usecases        = require('../../domain/importacion/importacion.usecases');
const { DESTINOS }    = require('../../domain/importacion/importacion.entity');
const { DIRECCIONES } = require('../../domain/seccion/seccion.entity');
const { TIPOS_ACCESORIO } = require('../../domain/nivel/nivel.entity');
const importacionRepo = require('../../infrastructure/repositories/importacion.repository');
const gondolaRepo     = require('../../infrastructure/repositories/gondola.repository');
const versionRepo     = require('../../infrastructure/repositories/version.repository');
const accesorioRepo   = require('../../infrastructure/repositories/accesorio.repository');
const productoRepo    = require('../../infrastructure/repositories/producto.repository');

// ─── Esquemas de validación ───────────────────────────────────────────────────

const schemaPosicion = Joi.object({
  orden_horizontal:   Joi.number().integer().min(1).required(),
  sku:                Joi.string().trim().max(50).allow(null).default(null),
  ancho_asignado_cm:  Joi.number().positive().max(500).required(),
  facings_horizontal: Joi.number().integer().min(1).max(100).required(),
  nombre_detectado:   Joi.string().trim().max(500).allow(null, '').default(null),
  confidence:         Joi.number().integer().min(0).max(100).default(100),
  datos_vision:       Joi.object().unknown(true).allow(null).default(null),
});

const schemaNivel = Joi.object({
  seccion_clave:             Joi.string().trim().max(50).allow(null).default(null),
  orden:                     Joi.number().integer().min(1).required(),
  altura_desde_piso_cm:      Joi.number().min(0).max(300).required(),
  tipo_accesorio:            Joi.string().valid(...TIPOS_ACCESORIO).required(),
  codigo_accesorio_id:       Joi.number().integer().positive().allow(null).default(null),
  tamano_accesorio_pulgadas: Joi.number().positive().max(999).allow(null).default(null),
  notas:                     Joi.string().trim().max(200).allow(null, '').default(null),
  posiciones:                Joi.array().items(schemaPosicion).max(200).default([]),
});

const schemaSeccion = Joi.object({
  clave:       Joi.string().trim().min(1).max(50).required(),
  padre_clave: Joi.string().trim().max(50).allow(null).required(),
  es_division: Joi.boolean().required(),
  direccion:   Joi.string().valid(...DIRECCIONES).allow(null).required(),
  orden:       Joi.number().integer().min(1).required(),
  tam_cm:      Joi.number().positive().required(),
});

const schemaCuerpo = Joi.object({
  destino:        Joi.string().valid(...DESTINOS).required(),
  gondola_id:     Joi.when('destino', {
    is:        'REEMPLAZAR',
    then:      Joi.number().integer().positive().required(),
    otherwise: Joi.forbidden(),
  }),
  nombre:         Joi.string().trim().min(1).max(100).required(),
  ancho_cm:       Joi.number().positive().max(500).required(),
  alto_cm:        Joi.number().positive().max(300).required(),
  profundidad_cm: Joi.number().positive().max(200).required(),
  secciones:      Joi.array().items(schemaSeccion).max(50).default([]),
  niveles:        Joi.array().items(schemaNivel).max(50).default([]),
});

const schemaImportar = Joi.object({
  cuerpos: Joi.array().items(schemaCuerpo).min(1).max(20).required(),
});

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

function validarBody(schema, body) {
  const { error, value } = schema.validate(body, { abortEarly: false, stripUnknown: true });
  if (error) throw error;
  return value;
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

module.exports = { importarLayout };
