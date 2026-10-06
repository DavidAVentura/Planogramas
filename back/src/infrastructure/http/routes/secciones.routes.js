/**
 * secciones.routes.js
 * Define las rutas del módulo Secciones que cuelgan de /secciones y las conecta al controller.
 * Consultar la estructura y dividir cuelgan de /gondolas/:id/secciones — ver gondolas.routes.js.
 */

const { Router }  = require('express');
const controller  = require('../../../application/secciones/secciones.controller');

const router = Router();

// PATCH  /secciones/:id   — cambia la medida de la sección; la diferencia la absorbe su vecina
router.patch('/:id',  controller.redimensionar);

// DELETE /secciones/:id   — quita una sección sin productos; su espacio pasa a la vecina
router.delete('/:id', controller.quitar);

module.exports = router;
