/**
 * posiciones.routes.js
 * Define las rutas del módulo Posiciones que cuelgan de /posiciones y las conecta al controller.
 * El listado y la creación cuelgan de /niveles/:id/posiciones (módulo niveles) — ver niveles.routes.js.
 */

const { Router } = require('express');
const controller = require('../../../application/posiciones/posiciones.controller');

const { requiereAnalista, requierePermiso, PERMISOS } = require('../middlewares/autorizacion');

// C: contenido de la versión (editor PLA005 o lienzo PLA006); siempre junto con la regla A
const editarContenido = requierePermiso(PERMISOS.EDITAR_VERSION, PERMISOS.EDITAR_LIENZO);

const router = Router();
router.use(requiereAnalista); // A transitoria: sin permiso propio en CAO (DT-11)

// GET    /posiciones/por-sku                          — busca posiciones de un SKU en una versión
// Debe registrarse antes de /:id para que "por-sku" no se interprete como un id.
router.get('/por-sku', controller.buscarPorSku);

// GET    /posiciones/:id                               — detalle completo (vista Analista)
router.get('/:id', controller.obtener);

// GET    /posiciones/:id/accesorios                    — lista los accesorios de montaje
router.get('/:id/accesorios', controller.listarAccesorios);

// POST   /posiciones/:id/accesorios                    — agrega un accesorio de montaje
router.post('/:id/accesorios', editarContenido, controller.agregarAccesorio);

// DELETE /posiciones/:id/accesorios/:accesorioId       — quita un accesorio de montaje
router.delete('/:id/accesorios/:accesorioId', editarContenido, controller.eliminarAccesorio);

// PATCH  /posiciones/:id/asignar-sku                     — asigna SKU confirmado a posición PENDIENTE
router.patch('/:id/asignar-sku', editarContenido, controller.asignarSku);

// PATCH  /posiciones/:id                               — partial update de atributos
router.patch('/:id', editarContenido, controller.editar);

// PATCH  /posiciones/:id/mover                         — mueve la posición a otro nivel/orden
router.patch('/:id/mover', editarContenido, controller.mover);

// POST   /posiciones/:id/copiar                        — duplica la posición en nivel/orden destino
router.post('/:id/copiar', editarContenido, controller.copiar);

// DELETE /posiciones/:id                               — elimina la posición
router.delete('/:id', editarContenido, controller.eliminar);

module.exports = router;
