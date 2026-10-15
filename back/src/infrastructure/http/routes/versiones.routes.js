/**
 * versiones.routes.js
 * Define las rutas del módulo Versiones que cuelgan de /versiones y las conecta al controller.
 * El listado y la creación cuelgan de /planogramas/:id/versiones — ver planogramas.routes.js.
 */

const { Router }         = require('express');
const controller         = require('../../../application/versiones/versiones.controller');
const gondolasController = require('../../../application/gondolas/gondolas.controller');
const adjuntosController = require('../../../application/adjuntos/adjuntos.controller');
const skusController     = require('../../../application/skusVersion/skusVersion.controller');
const importacionController = require('../../../application/importacion/importacion.controller');

// A transitoria (requiereAnalista) en las acciones sin permiso propio en CAO (DT-11); ver matriz en Arquitectura/SEGURIDAD_PERMISOS.md
const { requiereAnalista, requiereImplementador, requierePermiso, PERMISOS } = require('../middlewares/autorizacion');

// C: contenido de la versión (editor PLA005 o lienzo PLA006); siempre junto con la regla A
const editarContenido = requierePermiso(PERMISOS.EDITAR_VERSION, PERMISOS.EDITAR_LIENZO);

const router = Router();

// GET   /versiones/:id                — detalle completo (góndolas → niveles → posiciones)
router.get('/:id', requiereAnalista, controller.obtener);

// GET   /versiones/:id/gondolas       — lista las góndolas de la versión (módulo góndolas)
router.get('/:id/gondolas', requiereAnalista, gondolasController.listar);

// POST  /versiones/:id/gondolas       — agrega una góndola a la versión (módulo góndolas)
router.post('/:id/gondolas', requiereAnalista, editarContenido, gondolasController.agregar);

// PATCH /versiones/:id/gondolas/orden — reordena las góndolas de la versión (módulo góndolas)
router.patch('/:id/gondolas/orden', requiereAnalista, editarContenido, gondolasController.reordenar);

// PATCH /versiones/:id                — partial update de notas y/o código
router.patch('/:id', requiereAnalista, requierePermiso(PERMISOS.EDITAR_VERSION), controller.editar);

// POST  /versiones/:id/promover       — avanza el estado (en_desarrollo→piloto, piloto→publicado)
router.post('/:id/promover', requiereAnalista, controller.promover);

// GET   /versiones/:id/publicacion/simular — impacto de publicar (errores bloqueantes y tiendas), sin guardar
router.get('/:id/publicacion/simular', requiereAnalista, controller.simularPublicacion);

// POST  /versiones/:id/archivar       — archiva la versión manualmente (borrador/en_desarrollo/piloto)
router.post('/:id/archivar', requiereAnalista, controller.archivar);

// GET   /versiones/:id/tiendas        — tiendas asignadas y disponibles
router.get('/:id/tiendas', requiereAnalista, controller.obtenerTiendas);

// PUT   /versiones/:id/tiendas        — reemplaza el listado completo de tiendas asignadas
router.put('/:id/tiendas', requiereAnalista, requierePermiso(PERMISOS.EDITAR_ESTRUCTURA), controller.reemplazarTiendas);

// PATCH /versiones/:id/guardar        — acción "Guardar" del editor
router.patch('/:id/guardar', requiereAnalista, controller.guardar);

// GET   /versiones/:id/estructura     — estructura reducida de solo lectura (Implementador)
router.get('/:id/estructura', requiereAnalista, controller.obtenerEstructura);

// GET   /versiones/:id/resumen        — ficha de solo lectura: datos, conteos de estructura y tiendas
router.get('/:id/resumen', requiereAnalista, controller.obtenerResumen);

// GET   /versiones/:id/adjuntos       — lista los adjuntos de la versión (módulo adjuntos)
router.get('/:id/adjuntos', requiereImplementador, adjuntosController.listar);

// POST  /versiones/:id/adjuntos/subida — URL SAS para subir el archivo directo a Azure (módulo adjuntos)
router.post('/:id/adjuntos/subida', requiereAnalista, adjuntosController.solicitarSubida);

// POST  /versiones/:id/adjuntos       — confirma el archivo ya subido y crea el adjunto (módulo adjuntos)
router.post('/:id/adjuntos', requiereAnalista, adjuntosController.agregar);

// GET   /versiones/:id/skus           — SKU de la versión con totales y ganchos calculados (módulo skus)
router.get('/:id/skus', requiereAnalista, skusController.listar);

// PATCH /versiones/:id/skus/:sku      — aplica mín./máx. final a todas las posiciones del SKU (módulo skus)
router.patch('/:id/skus/:sku', requiereAnalista, editarContenido, skusController.editar);

// POST  /versiones/:id/importar-layout — crea/reemplaza góndolas completas (secciones, niveles,
//        posiciones) en una transacción; lo usa el Agente Importador de PDF (módulo importacion)
router.post('/:id/importar-layout', requiereAnalista, editarContenido, importacionController.importarLayout);

// POST  /versiones/:id/importar-productos — importa el listado de productos de un Excel a la
//        góndola "Por ubicar" (ganchos, cantidades, mín./máx., accesorio...) (módulo importacion)
router.post('/:id/importar-productos', requiereAnalista, editarContenido, importacionController.importarProductos);

module.exports = router;
