/**
 * permisos.js
 * Permisos CAO del módulo PLANOGRAMA (SIP) y las reglas de acceso derivadas. Dominio puro: sin
 * Express ni infraestructura.
 *
 * Reglas:
 *  - A (analista, transitoria): el usuario tiene TODOS los permisos PLA001–PLA008. Se usa para las
 *    acciones que CAO aún no tiene como permiso propio. Se reemplaza por el código de cada permiso
 *    cuando IT CAO los cree (DT-11).
 *  - I (lectura compartida): PLA009 o PLA010 o la regla A. Vistas del implementador.
 *  - C (contenido de la versión): PLA005 o PLA006, siempre junto con A (se arma en las rutas).
 * Todas las funciones fallan cerrado: ante datos ausentes o con forma inesperada responden false.
 */

const PERMISOS = Object.freeze({
  EDITAR_ESTRUCTURA: 'PLA001',
  CREAR_PLANOGRAMA:  'PLA002',
  EDITAR_PLANOGRAMA: 'PLA003',
  CREAR_VERSION:     'PLA004',
  EDITAR_VERSION:    'PLA005',
  EDITAR_LIENZO:     'PLA006',
  CREAR_TIENDA:      'PLA007',
  EDITAR_TIENDA:     'PLA008',
  MI_TIENDA:         'PLA009',
  PRODUCTOS_TIENDA:  'PLA010',
});

const CODIGOS_PERMISO        = Object.freeze(Object.values(PERMISOS));
const PERMISOS_ANALISTA      = Object.freeze(['PLA001', 'PLA002', 'PLA003', 'PLA004', 'PLA005', 'PLA006', 'PLA007', 'PLA008']);
const PERMISOS_IMPLEMENTADOR = Object.freeze(['PLA009', 'PLA010']);

// Solo para mostrar/documentar; NINGUNA regla decide por perfil. TIENDA-EST es provisional
// (IT CAO lo está validando; en la matriz original figura TIENDAS-EST). Ver DT-13.
const PERFILES = Object.freeze({ ADMIN: 'PCOMER-EST', CATEGORIA: 'CATEGORIA-EST', TIENDA: 'TIENDA-EST' });

function esCodigoPermiso(codigo) {
  return CODIGOS_PERMISO.includes(codigo);
}

function tieneAlguno(usuario, codigos) {
  if (!usuario || !Array.isArray(usuario.permisos)) return false;
  if (!Array.isArray(codigos) || codigos.length === 0) return false;
  return codigos.some((c) => usuario.permisos.includes(c));
}

function esAnalista(usuario) {
  if (!usuario || !Array.isArray(usuario.permisos)) return false;
  return PERMISOS_ANALISTA.every((c) => usuario.permisos.includes(c));
}

function esImplementador(usuario) {
  return tieneAlguno(usuario, PERMISOS_IMPLEMENTADOR);
}

function puedeLecturaCompartida(usuario) {
  return esImplementador(usuario) || esAnalista(usuario);
}

function capacidades(usuario) {
  return { analista: esAnalista(usuario), implementador: esImplementador(usuario) };
}

module.exports = {
  PERMISOS, CODIGOS_PERMISO, PERMISOS_ANALISTA, PERMISOS_IMPLEMENTADOR, PERFILES,
  esCodigoPermiso, tieneAlguno, esAnalista, esImplementador, puedeLecturaCompartida, capacidades,
};
