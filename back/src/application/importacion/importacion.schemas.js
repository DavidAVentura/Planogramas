/**
 * importacion.schemas.js
 * Esquemas Joi de la importación (layout de PDF y productos del Excel). Sin repositorios, para
 * poder probarlos con node:test.
 */

const Joi = require('joi');
const { DESTINOS }    = require('../../domain/importacion/importacion.entity');
const { DIRECCIONES } = require('../../domain/seccion/seccion.entity');
const { TIPOS_ACCESORIO } = require('../../domain/nivel/nivel.entity');
const { MODOS, DECISIONES, PERFILES_REDONDEO } = require('../../domain/posicion/posicion.entity');
const { schemaGanchos } = require('../compartido/ganchos.schema');

// ─── Esquemas de validación ───────────────────────────────────────────────────

const schemaPosicion = Joi.object({
  orden_horizontal:   Joi.number().integer().min(1).required(),
  sku:                Joi.string().trim().max(50).allow(null).default(null),
  ancho_asignado_cm:  Joi.number().positive().max(500).required(),
  facings_horizontal: Joi.number().integer().min(1).max(100).required(),
  nombre_detectado:   Joi.string().trim().max(500).allow(null, '').default(null),
  confidence:         Joi.number().integer().min(0).max(100).default(100),
  datos_vision:       Joi.object().unknown(true).allow(null).default(null),
  ganchos:            schemaGanchos.default([]),
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
  cuerpos:         Joi.array().items(schemaCuerpo).min(1).max(20).required(),
  // Llenar los espacios con los productos de "Por ubicar" (Excel) que tengan sus mismos ganchos.
  usar_por_ubicar: Joi.boolean().default(false),
});

const entero = () => Joi.number().integer().min(0).allow(null).default(null);

const schemaProductoExcel = Joi.object({
  sku:                       Joi.string().trim().min(1).max(50).required(),
  descripcion:               Joi.string().trim().max(500).allow(null, '').default(null),
  ganchos:                   schemaGanchos.default([]),
  facings_horizontal:        Joi.number().integer().min(1).max(100).required(),
  unidades_por_facing:       Joi.number().integer().min(1).allow(null).default(1),
  cantidad_apilable:         Joi.number().integer().min(1).allow(null).default(1),
  min_estetico:              entero(),
  capacidad_maxima:          Joi.number().integer().min(1).allow(null).default(null),
  min_final:                 entero(),
  max_final:                 entero(),
  perfil_redondeo:           Joi.string().valid(...PERFILES_REDONDEO).allow(null).default(null),
  modo:                      Joi.string().valid(...MODOS.filter((m) => m !== 'PENDIENTE')).allow(null).default(null),
  decision:                  Joi.string().valid(...DECISIONES).allow(null).default(null),
  // Formato nuevo: varios accesorios por producto, en el orden de la celda.
  accesorios:                Joi.array().items(Joi.object({
    codigo:          Joi.string().trim().min(1).max(50).required(),
    tamano_pulgadas: Joi.number().positive().max(999).precision(2).allow(null).default(null),
  })).max(10).default([]),
  // Formato legado (un solo accesorio): solo se acepta si `accesorios` viene vacío.
  accesorio_codigo:          Joi.string().trim().max(50).allow(null, '').default(null),
  tamano_accesorio_pulgadas: Joi.number().positive().max(999).allow(null).default(null),
  observaciones:             Joi.string().trim().max(500).allow(null, '').default(null),
}).custom((producto, helpers) => (
  producto.accesorios.length > 0 && producto.accesorio_codigo
    ? helpers.error('producto.accesoriosMixtos')
    : producto
)).messages({ 'producto.accesoriosMixtos': '"accesorios" y "accesorio_codigo" no se pueden enviar juntos' });

const schemaImportarProductos = Joi.object({
  productos: Joi.array().items(schemaProductoExcel).min(1).max(1000).required(),
});

function validarBody(schema, body) {
  const { error, value } = schema.validate(body, { abortEarly: false, stripUnknown: true });
  if (error) throw error;
  return value;
}

module.exports = { schemaImportar, schemaImportarProductos, validarBody };
