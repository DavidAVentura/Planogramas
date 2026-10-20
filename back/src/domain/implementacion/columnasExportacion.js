/**
 * columnasExportacion.js
 * Columnas, encabezados y constantes del libro "Productos por planograma" (Lista y Pivote por
 * versión). Todo es literal fijo del dominio: ningún encabezado, título de hoja ni nombre sale de
 * la petición. Los encabezados del Pivote son los del Excel de categorías (`Facings_TG`, `TG1`…)
 * para poder reimportarlo; el front duplica el literal y ambas pruebas lo comparan.
 * Sin dependencias externas.
 */

const { COLUMNAS_CONSOLIDADO } = require('../consolidado/columnas');

// Incluye `archivado`: la pantalla permite elegir una versión archivada que llega por enlace.
const ETIQUETA_ESTADO_TODOS = Object.freeze({
  borrador: 'Borrador', en_desarrollo: 'En desarrollo', piloto: 'Piloto', publicado: 'Publicada', archivado: 'Archivada',
});
const ORDEN_ESTADO = Object.freeze({ publicado: 0, piloto: 1, en_desarrollo: 2, borrador: 3, archivado: 4 });
const ESTADOS_EXPORTABLES = Object.freeze(Object.keys(ETIQUETA_ESTADO_TODOS));

const SIGLAS_BLOQUE = Object.freeze(['TG', 'TM', 'TE']);
const TIPO_POR_SIGLA = Object.freeze({ TG: 'GRANDE', TM: 'MEDIANA', TE: 'EXPRESS' });
const SIGLA_POR_TIPO = Object.freeze({ GRANDE: 'TG', MEDIANA: 'TM', EXPRESS: 'TE' });

const NOMBRE_HOJA_LISTA = 'Lista';
const NOMBRE_HOJA_PIVOTE = 'Pivote por versión';
const NOMBRE_HOJA_VERSIONES = 'Versiones';
const MOTIVO_ESPECIAL = 'Especial de tienda: no va en el Pivote';

const ENCABEZADOS_COMUNES_PIVOTE = Object.freeze(['SKU', 'Descripcion', 'Nombre_planograma', 'Estado_version', 'Modo', 'SKU_sustituto']);
const CAMPOS_BLOQUE_PIVOTE = Object.freeze([
  'Planograma', 'Facings', 'Cantidad_x_facing', 'Cantidad_facing_vertical', 'Min_estetico', 'Capacidad_maxima',
  'Nombre_accesorio', 'Tamano_accesorio', 'Perfil_redondeo', 'Min_final', 'Max_final', 'Decision_final', 'Observaciones',
]);
const ANCHOS_COMUNES_PIVOTE = Object.freeze([14, 36, 28, 14, 12, 14]);
const ANCHOS_CAMPOS_BLOQUE = Object.freeze([18, 12, 12, 12, 12, 12, 18, 14, 12, 12, 12, 12, 40]);
const ANCHO_GANCHO = 8;

/** Encabezados de un bloque: los 13 campos con sufijo y `S1`…`Sn` (n = máximo de ganchos del bloque). */
function encabezadosBloque(sigla, nGanchos) {
  return [
    ...CAMPOS_BLOQUE_PIVOTE.map((campo) => `${campo}_${sigla}`),
    ...Array.from({ length: nGanchos }, (_, i) => `${sigla}${i + 1}`),
  ];
}

/** Anchos (caracteres) de un bloque con `nGanchos` columnas de gancho. */
function anchosBloque(nGanchos) {
  return [...ANCHOS_CAMPOS_BLOQUE, ...Array.from({ length: nGanchos }, () => ANCHO_GANCHO)];
}

const ENCABEZADOS_VERSIONES = Object.freeze(['Id', 'Código', 'Planograma', 'Tipo', 'Estado', 'Especial de tienda', 'Incluida', 'Motivo']);
const ANCHOS_VERSIONES = Object.freeze([8, 18, 28, 8, 14, 18, 10, 40]);

// ─── Hoja Lista ──────────────────────────────────────────────────────────────

const columna = (etiqueta, tipo, ancho, valor) => Object.freeze({ etiqueta, tipo, ancho, valor });

/** Reutiliza la definición del consolidado (mismo texto de celda) con el ancho propio de la Lista. */
const delConsolidado = (clave, ancho) => {
  const { etiqueta, tipo, valor } = COLUMNAS_CONSOLIDADO[clave];
  return columna(etiqueta, tipo, ancho, valor);
};

/**
 * Columnas de la Lista, en el orden del libro. `valor(fila, grupo)` recibe la fila agregada
 * (versión–SKU–modo) y `{ sku, producto, area, departamento }` del SKU.
 */
const COLUMNAS_LISTA = Object.freeze([
  delConsolidado('sku', 14),
  delConsolidado('producto', 36),
  columna('Área', 'texto', 18, (_f, g) => g.area ?? null),
  columna('Departamento', 'texto', 18, (_f, g) => g.departamento ?? null),
  columna('Planograma', 'texto', 28, (f) => f.planogramaNombre ?? null),
  columna('Versión', 'texto', 18, (f) => f.codigoVersion ?? null),
  columna('Tipo (TG/TM/TE)', 'texto', 8, (f) => SIGLA_POR_TIPO[f.tipoVersion] ?? null),
  columna('Estado de la versión', 'texto', 14, (f) => ETIQUETA_ESTADO_TODOS[f.estadoVersion] ?? f.estadoVersion ?? null),
  columna('Especial de tienda', 'texto', 12, (f) => (f.esEspecial ? 'Sí' : 'No')),
  delConsolidado('modo', 12),
  delConsolidado('gondola', 14),
  delConsolidado('seccion', 14),
  delConsolidado('nivel', 14),
  delConsolidado('orden', 14),
  delConsolidado('ganchos', 14),
  delConsolidado('accesorio', 18),
  delConsolidado('montaje', 24),
  delConsolidado('facings', 12),
  delConsolidado('apilable', 12),
  delConsolidado('capacidadFacing', 12),
  delConsolidado('capacidadMaxima', 12),
  delConsolidado('minEstetico', 12),
  delConsolidado('minFinal', 12),
  delConsolidado('maxFinal', 12),
  delConsolidado('perfil', 12),
  delConsolidado('decision', 12),
  delConsolidado('observaciones', 40),
  delConsolidado('sustituto', 20),
]);

module.exports = {
  ETIQUETA_ESTADO_TODOS,
  ESTADOS_EXPORTABLES,
  ORDEN_ESTADO,
  SIGLAS_BLOQUE,
  TIPO_POR_SIGLA,
  SIGLA_POR_TIPO,
  NOMBRE_HOJA_LISTA,
  NOMBRE_HOJA_PIVOTE,
  NOMBRE_HOJA_VERSIONES,
  MOTIVO_ESPECIAL,
  ENCABEZADOS_COMUNES_PIVOTE,
  CAMPOS_BLOQUE_PIVOTE,
  ANCHOS_COMUNES_PIVOTE,
  ENCABEZADOS_VERSIONES,
  ANCHOS_VERSIONES,
  COLUMNAS_LISTA,
  encabezadosBloque,
  anchosBloque,
};
