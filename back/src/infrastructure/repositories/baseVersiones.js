/**
 * baseVersiones.js  (infraestructura)
 * Carga en bloque la estructura de un conjunto de versiones (góndolas, secciones, niveles,
 * posiciones con su producto, accesorios y productos) con 5 consultas de columnas explícitas.
 * La comparten el Consolidado Tiendas (versiones montables, por subconsulta) y la exportación de
 * productos por planograma (≤ 50 ids de versión).
 *
 * `filtroVersiones` es una función que devuelve una subconsulta Knex (así no se reutiliza el mismo
 * constructor en las 5 consultas) o un arreglo de ids de versión; siempre entra por `whereIn`,
 * parametrizado: nunca se interpola en SQL. Se cargan TODAS las posiciones de esas versiones
 * (también las sin SKU y las PENDIENTE): la numeración de ganchos de `recorrerVersion` las
 * necesita; el dominio las descarta.
 */

const db = require('../db/connection');
const { mapearGondola, mapearSeccion, mapearNivel, mapearPosicionBase } = require('./mapeadoresVersion');

const TABLA_GONDOLA  = 'Gondola';
const TABLA_SECCION  = 'Seccion';
const TABLA_NIVEL    = 'Nivel';
const TABLA_POSICION = 'Posicion';
const TABLA_PRODUCTO = 'Producto';

const numero = (v) => (v === null || v === undefined ? null : Number(v));

/**
 * @param {Function|number[]} filtroVersiones  `() => subconsulta` o ids de versión
 * @returns {Promise<{ gondolas, secciones, niveles, posiciones, accesorios, productos }>}
 */
async function cargarEstructura(filtroVersiones) {
  const versiones = () => (typeof filtroVersiones === 'function' ? filtroVersiones() : filtroVersiones);

  const [gondolas, secciones, niveles, posiciones, accesorios] = await Promise.all([
    db(TABLA_GONDOLA)
      .whereIn('planograma_version_id', versiones())
      .select('id', 'planograma_version_id', 'nombre', 'orden', 'ancho_cm', 'alto_cm', 'por_ubicar'),

    db(TABLA_SECCION)
      .join(TABLA_GONDOLA, `${TABLA_SECCION}.gondola_id`, `${TABLA_GONDOLA}.id`)
      .whereIn(`${TABLA_GONDOLA}.planograma_version_id`, versiones())
      .select(
        `${TABLA_SECCION}.id`, `${TABLA_SECCION}.gondola_id`, `${TABLA_SECCION}.padre_id`,
        `${TABLA_SECCION}.es_division`, `${TABLA_SECCION}.direccion`, `${TABLA_SECCION}.orden`, `${TABLA_SECCION}.tam_cm`,
      ),

    db(TABLA_NIVEL)
      .join(TABLA_GONDOLA, `${TABLA_NIVEL}.gondola_id`, `${TABLA_GONDOLA}.id`)
      .whereIn(`${TABLA_GONDOLA}.planograma_version_id`, versiones())
      .select(`${TABLA_NIVEL}.id`, `${TABLA_NIVEL}.gondola_id`, `${TABLA_NIVEL}.seccion_id`, `${TABLA_NIVEL}.orden`),

    db(TABLA_POSICION)
      .join(TABLA_NIVEL, `${TABLA_POSICION}.nivel_id`, `${TABLA_NIVEL}.id`)
      .join(TABLA_GONDOLA, `${TABLA_NIVEL}.gondola_id`, `${TABLA_GONDOLA}.id`)
      .leftJoin(`${TABLA_PRODUCTO} as producto`, `${TABLA_POSICION}.sku`, 'producto.sku')
      .leftJoin(`${TABLA_PRODUCTO} as sustituto`, 'producto.sku_sustituto', 'sustituto.sku')
      .whereIn(`${TABLA_GONDOLA}.planograma_version_id`, versiones())
      .select(
        `${TABLA_POSICION}.id`,
        `${TABLA_POSICION}.nivel_id`,
        `${TABLA_POSICION}.orden_horizontal`,
        `${TABLA_POSICION}.sku`,
        `${TABLA_POSICION}.facings_horizontal`,
        `${TABLA_POSICION}.cantidad_apilable`,
        `${TABLA_POSICION}.unidades_por_facing`,
        `${TABLA_POSICION}.capacidad_maxima`,
        `${TABLA_POSICION}.min_estetico`,
        `${TABLA_POSICION}.min_final`,
        `${TABLA_POSICION}.max_final`,
        `${TABLA_POSICION}.perfil_redondeo`,
        `${TABLA_POSICION}.modo`,
        `${TABLA_POSICION}.decision`,
        `${TABLA_POSICION}.observaciones`,
        `${TABLA_POSICION}.cross_externo`,
        `${TABLA_POSICION}.montar_en_display`,
        `${TABLA_POSICION}.desborda_gondola`,
        `${TABLA_POSICION}.nota_desborde`,
        `${TABLA_POSICION}.ganchos`,
        'producto.nombre as nombre',
        'producto.marca as marca',
        'producto.categoria_nivel1 as area',
        'producto.categoria_nivel2 as departamento',
        'producto.sku_sustituto as sku_sustituto',
        'sustituto.nombre as sustituto_nombre',
      ),

    db('PosicionAccesorio')
      .join('Accesorio', 'PosicionAccesorio.accesorio_id', 'Accesorio.id')
      .join(TABLA_POSICION, 'PosicionAccesorio.posicion_id', `${TABLA_POSICION}.id`)
      .join(TABLA_NIVEL, `${TABLA_POSICION}.nivel_id`, `${TABLA_NIVEL}.id`)
      .join(TABLA_GONDOLA, `${TABLA_NIVEL}.gondola_id`, `${TABLA_GONDOLA}.id`)
      .whereIn(`${TABLA_GONDOLA}.planograma_version_id`, versiones())
      .select('PosicionAccesorio.posicion_id', 'PosicionAccesorio.orden', 'Accesorio.codigo', 'PosicionAccesorio.tamano_pulgadas'),
  ]);

  const productos = new Map();
  posiciones.forEach((p) => {
    if (p.sku === null || p.sku === undefined || productos.has(String(p.sku))) return;
    productos.set(String(p.sku), {
      sku: String(p.sku), nombre: p.nombre ?? null, marca: p.marca ?? null,
      area: p.area ?? null, departamento: p.departamento ?? null,
      skuSustituto: p.sku_sustituto ?? null, nombreSustituto: p.sustituto_nombre ?? null,
    });
  });

  return {
    gondolas: gondolas.map((g) => ({ ...mapearGondola(g), versionId: g.planograma_version_id })),
    secciones: secciones.map(mapearSeccion),
    niveles: niveles.map(mapearNivel),
    posiciones: posiciones.map((p) => ({
      ...mapearPosicionBase(p),
      sku:              p.sku === null || p.sku === undefined ? null : String(p.sku),
      facings:          numero(p.facings_horizontal),
      capacidadMaxima:  numero(p.capacidad_maxima),
      minFinal:         numero(p.min_final),
      maxFinal:         numero(p.max_final),
      modo:             p.modo,
      cantidadApilable: numero(p.cantidad_apilable),
      capacidadFacing:  numero(p.unidades_por_facing),
      minEstetico:      numero(p.min_estetico),
      perfil:           p.perfil_redondeo ?? null,
      decision:         p.decision ?? null,
      observaciones:    p.observaciones ?? null,
      crossExterno:     Boolean(p.cross_externo),
      montarEnDisplay:  Boolean(p.montar_en_display),
      desbordaGondola:  Boolean(p.desborda_gondola),
      notaDesborde:     p.nota_desborde ?? null,
    })),
    accesorios: accesorios.map((a) => ({
      posicionId: a.posicion_id, orden: a.orden, codigo: a.codigo, tamanoPulgadas: numero(a.tamano_pulgadas),
    })),
    productos: [...productos.values()],
  };
}

module.exports = { cargarEstructura };
