/**
 * versiones.routes.js
 * Define las rutas del módulo Versiones que cuelgan de /versiones y las conecta al controller.
 * El listado y la creación cuelgan de /planogramas/:id/versiones — ver planogramas.routes.js.
 */

const { Router } = require('express');
const controller = require('../../../application/versiones/versiones.controller');

const router = Router();

// GET   /versiones/:id                — detalle completo (góndolas → niveles → posiciones)
router.get('/:id',                  controller.obtener);

// PATCH /versiones/:id                — partial update de notas y/o código
router.patch('/:id',                controller.editar);

// POST  /versiones/:id/promover       — avanza el estado (en_desarrollo→piloto, piloto→publicado)
router.post('/:id/promover',        controller.promover);

// GET   /versiones/:id/tiendas        — tiendas asignadas y disponibles
router.get('/:id/tiendas',          controller.obtenerTiendas);

// PUT   /versiones/:id/tiendas        — reemplaza el listado completo de tiendas asignadas
router.put('/:id/tiendas',          controller.reemplazarTiendas);

// PATCH /versiones/:id/guardar        — acción "Guardar" del editor
router.patch('/:id/guardar',        controller.guardar);

// GET   /versiones/:id/estructura     — estructura reducida de solo lectura (Implementador)
router.get('/:id/estructura',       controller.obtenerEstructura);

module.exports = router;
