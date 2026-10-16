/**
 * columnas.js
 * Lista blanca de columnas del Consolidado Tiendas (tabla y Excel): clave → etiqueta, tipo y
 * texto de la celda. Es la única fuente de qué claves acepta la exportación: nunca se usa una
 * clave de la query como propiedad sin pasar por `esClaveColumna`. Sin dependencias externas.
 *
 * El front duplica el catálogo (DT-43); ambas pruebas comparan el mismo literal de 24 claves.
 */

const { textoGancho } = require('../compartido/gancho');

const CLAVES_COLUMNAS_CONSOLIDADO = Object.freeze([
  'sku', 'producto', 'tienda', 'version', 'estadoVersion', 'seccion', 'gondola', 'nivel', 'orden',
  'ganchos', 'accesorio', 'montaje', 'facings', 'apilable', 'capacidadFacing', 'capacidadMaxima',
  'minEstetico', 'minFinal', 'maxFinal', 'perfil', 'modo', 'decision', 'observaciones', 'sustituto',
]);

const TEXTO_VARIA = 'Varía';

const ETIQUETA_ESTADO = Object.freeze({ publicado: 'Publicada', piloto: 'Piloto' });
const ETIQUETA_MODO = Object.freeze({ PLANOGRAMA: 'Planograma', CROSS: 'Cross', IMPULSO: 'Impulso' });
const ETIQUETA_DECISION = Object.freeze({ ACTIVO: 'Activo', INACTIVO: 'Inactivo' });

/** Une los textos no vacíos con `separador`; `null` si no queda ninguno. */
function unir(partes, separador) {
  const utiles = partes.filter((p) => p !== null && p !== undefined && String(p) !== '');
  return utiles.length ? utiles.join(separador) : null;
}

/** Número finito o `null` (nunca NaN/Infinity). */
function numero(valor) {
  if (valor === null || valor === undefined) return null;
  const n = Number(valor);
  return Number.isFinite(n) ? n : null;
}

function conMapa(mapa, clave) {
  return typeof clave === 'string' && Object.hasOwn(mapa, clave) ? mapa[clave] : (clave ?? null);
}

/** `codigo (12")`, o solo el código si no hay tamaño. */
function textoAccesorios(fila) {
  if (!fila) return null;
  return unir(fila.accesorios.map((a) => (a.tamanoPulgadas === null || a.tamanoPulgadas === undefined
    ? a.codigo
    : `${a.codigo} (${a.tamanoPulgadas}")`)), ', ');
}

/** Accesorios + banderas de montaje (colgante externo, display, desborde con su nota). */
function textoMontaje(fila) {
  if (!fila) return null;
  const m = fila.montaje;
  return unir([
    textoAccesorios(fila),
    m.colganteExterno ? 'Colgante externo' : null,
    m.display ? 'Display' : null,
    m.desborda ? `Desborda la góndola${m.notaDesborde ? `: ${m.notaDesborde}` : ''}` : null,
  ], ', ');
}

const porUbicaciones = (fila, campo) => (fila ? unir(fila.ubicaciones.map((u) => u[campo]), ', ') : null);

const columna = (etiqueta, tipo, valor) => Object.freeze({ etiqueta, tipo, valor });

const definiciones = {
  sku:             columna('SKU', 'texto', (_f, g) => g.sku),
  producto:        columna('Producto', 'texto', (_f, g) => unir([g.producto.nombre, g.producto.marca], ' · ')),
  tienda:          columna('Tienda', 'texto', (_f, g) => unir([g.tienda.codigo, g.tienda.nombre], ' · ')),
  version:         columna('Planograma versión', 'texto', (f) => (f ? unir([f.codigoVersion, f.planogramaNombre], ' · ') : null)),
  estadoVersion:   columna('Estado de la versión', 'texto', (f) => (f ? conMapa(ETIQUETA_ESTADO, f.estadoVersion) : null)),
  seccion:         columna('Sección', 'texto', (f) => porUbicaciones(f, 'seccion')),
  gondola:         columna('Góndola', 'texto', (f) => (f ? unir([...new Set(f.ubicaciones.map((u) => u.gondola))], ', ') : null)),
  nivel:           columna('Nivel', 'texto', (f) => porUbicaciones(f, 'nivel')),
  orden:           columna('Posición en nivel', 'texto', (f) => porUbicaciones(f, 'orden')),
  ganchos:         columna('Ganchos', 'texto', (f) => (f ? unir(f.ubicaciones.flatMap((u) => u.ganchos.map(textoGancho)), ', ') : null)),
  accesorio:       columna('Accesorio de montaje', 'texto', (f) => textoAccesorios(f)),
  montaje:         columna('Montaje', 'texto', (f) => textoMontaje(f)),
  facings:         columna('Facing horizontal', 'numero', (f) => (f ? numero(f.facings) : null)),
  apilable:        columna('Cantidad apilable', 'numero', (f) => (f ? numero(f.cantidadApilable) : null)),
  capacidadFacing: columna('Capacidad del facing', 'numero', (f) => (f ? numero(f.capacidadFacing) : null)),
  capacidadMaxima: columna('Capacidad máxima', 'numero', (f) => (f ? numero(f.capacidadMaxima) : null)),
  minEstetico:     columna('Mín. estético', 'numero', (f) => (f ? numero(f.minEstetico) : null)),
  minFinal:        columna('Mín. final', 'numero', (f) => (f ? (f.minVaria ? TEXTO_VARIA : numero(f.minFinal)) : null)),
  maxFinal:        columna('Máx. final', 'numero', (f) => (f ? (f.maxVaria ? TEXTO_VARIA : numero(f.maxFinal)) : null)),
  perfil:          columna('Perfil de redondeo', 'texto', (f) => (f ? f.perfil ?? null : null)),
  modo:            columna('Modo', 'texto', (f) => (f ? conMapa(ETIQUETA_MODO, f.modo) : null)),
  decision:        columna('Decisión', 'texto', (f) => (f ? conMapa(ETIQUETA_DECISION, f.decision) : null)),
  observaciones:   columna('Observaciones', 'texto', (f) => (f ? f.observaciones ?? null : null)),
  sustituto:       columna('SKU sustituto', 'texto', (_f, g) => unir([g.producto.skuSustituto, g.producto.nombreSustituto], ' · ')),
};

const COLUMNAS_CONSOLIDADO = Object.freeze(Object.assign(Object.create(null), definiciones));

function esClaveColumna(clave) {
  return typeof clave === 'string' && Object.hasOwn(COLUMNAS_CONSOLIDADO, clave);
}

/** Claves recibidas que no están en la lista blanca. */
function columnasInvalidas(claves) {
  return claves.filter((c) => !esClaveColumna(c));
}

function etiquetaColumna(clave) {
  return COLUMNAS_CONSOLIDADO[clave].etiqueta;
}

module.exports = {
  CLAVES_COLUMNAS_CONSOLIDADO,
  COLUMNAS_CONSOLIDADO,
  TEXTO_VARIA,
  esClaveColumna,
  columnasInvalidas,
  etiquetaColumna,
  textoMontaje,
  textoAccesorios,
};
