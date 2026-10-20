/**
 * consolidado.controller.js
 * Consolidado Tiendas (Arquitectura/Contratos/21_consolidado/): valida la query de forma estricta,
 * llama a los casos de uso inyectando repositorio, catálogo (CATI) y generador del libro, y
 * formatea la respuesta. Sin lógica de negocio ni acceso directo a BD o CATI.
 *
 * Se exporta una fábrica (`crearControllerConsolidado`) para inyectar dependencias falsas en las
 * pruebas, y el controller por defecto construido con las dependencias reales.
 */

const usecases = require('../../domain/consolidado/consolidado.usecases');
const consolidadoRepo = require('../../infrastructure/repositories/consolidado.repository');
const catiClient = require('../../infrastructure/cati/catiClient');
const { escribirLibroXlsx } = require('../../infrastructure/exportacion/libroXlsx');
const env = require('../../config/env');
const { validarQueryEstricta } = require('../compartido/validacion');
const { semaforoExportacion } = require('../compartido/semaforo');
const { schemaListado, schemaFiltros, schemaExportar, verificarColumnas } = require('./consolidado.schemas');

const CONTENT_TYPE_XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const NOMBRE_POR_FORMATO = Object.freeze({ DETALLADO: 'detallado', AGREGADO: 'minmax', HOJAS: 'hojas' });

/** Campos de filtro comunes de la query ya validada. */
function extraerFiltros(q) {
  const { tiendaIds, versionIds, estados, area, departamento, familia, categoria, subcategoria, busqueda, soloDuplicados } = q;
  return { tiendaIds, versionIds, estados, area, departamento, familia, categoria, subcategoria, busqueda, soloDuplicados };
}

/** AAAAMMDD con la fecha del servidor. */
function fechaCompacta(fecha) {
  const dos = (n) => String(n).padStart(2, '0');
  return `${fecha.getFullYear()}${dos(fecha.getMonth() + 1)}${dos(fecha.getDate())}`;
}

function crearControllerConsolidado({ repo, catalogo, escribirLibro, semaforo, maximoFilas, ahora = () => new Date() }) {
  // `req.query` de Express 5 puede no tener prototipo: se copia antes de validar.
  const consulta = (req) => ({ ...req.query });

  async function listar(req, res, next) {
    try {
      const inicio = Date.now();
      const q = validarQueryEstricta(schemaListado, consulta(req));
      const resultado = await usecases.listarConsolidado(
        { repo, catalogo, maximoExportacion: maximoFilas },
        extraerFiltros(q),
        { vista: q.vista, page: q.page, pageSize: q.pageSize, orden: q.orden, direccion: q.direccion },
      );
      console.info(`[consolidado] listado ms=${Date.now() - inicio} filas=${resultado.resumen.filas} grupos=${resultado.resumen.conteos.AGREGADO}`);
      res.json(resultado);
    } catch (err) {
      next(err);
    }
  }

  async function filtros(req, res, next) {
    try {
      validarQueryEstricta(schemaFiltros, consulta(req));
      res.json(await usecases.obtenerFiltros({ repo }));
    } catch (err) {
      next(err);
    }
  }

  async function exportar(req, res, next) {
    try {
      const inicio = Date.now();
      const q = validarQueryEstricta(schemaExportar, consulta(req));
      const columnas = verificarColumnas(q.columnas);

      // El libro se genera completo ANTES de fijar cabeceras: si falla, el error sale como JSON.
      const { buffer, filas } = await usecases.exportarConsolidado(
        { repo, catalogo, escribirLibro, semaforo, maximoFilas },
        extraerFiltros(q),
        { formato: q.formato, hojas: q.hojas, columnas },
      );

      console.info(
        `[consolidado] exportacion numeroEmpleado=${req.usuario?.numeroEmpleado} formato=${q.formato} `
        + `hojas=${q.hojas ? q.hojas.join('+') : '-'} filas=${filas} ms=${Date.now() - inicio}`,
      );

      const nombre = `consolidado-tiendas-${NOMBRE_POR_FORMATO[q.formato]}-${fechaCompacta(ahora())}.xlsx`;
      res.set({
        'Content-Type':        CONTENT_TYPE_XLSX,
        'Content-Disposition': `attachment; filename="${nombre}"`,
        'Cache-Control':       'no-store',
        'Content-Length':      String(buffer.length),
      });
      res.send(buffer);
    } catch (err) {
      next(err);
    }
  }

  return { listar, filtros, exportar };
}

// Semáforo único del proceso, compartido con la exportación de productos por planograma.
const controllerPorDefecto = crearControllerConsolidado({
  repo: consolidadoRepo,
  catalogo: catiClient,
  escribirLibro: escribirLibroXlsx,
  semaforo: semaforoExportacion,
  maximoFilas: env.consolidado.exportacionMaxFilas,
});

module.exports = { ...controllerPorDefecto, crearControllerConsolidado };
