/**
 * secciones.routes.js
 * Define las rutas del módulo Secciones que cuelgan de /secciones y las conecta al controller.
 * Consultar la estructura y dividir cuelgan de /gondolas/:id/secciones — ver gondolas.routes.js.
 */

const { Router }  = require('express');
const controller  = require('../../../application/secciones/secciones.controller');

const { requiereAnalista, requierePermiso, PERMISOS } = require('../middlewares/autorizacion');

// C: contenido de la versión (editor PLA005 o lienzo PLA006); siempre junto con la regla A
const editarContenido = requierePermiso(PERMISOS.EDITAR_VERSION, PERMISOS.EDITAR_LIENZO);

const router = Router();
router.use(requiereAnalista); // A transitoria: sin permiso propio en CAO (DT-11)

// PATCH  /secciones/:id   — cambia la medida de la sección; la diferencia la absorbe su vecina
router.patch('/:id', editarContenido, controller.redimensionar);

// DELETE /secciones/:id   — quita una sección sin productos; su espacio pasa a la vecina
router.delete('/:id', editarContenido, controller.quitar);

module.exports = router;
