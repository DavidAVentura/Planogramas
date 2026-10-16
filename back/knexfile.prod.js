/**
 * knexfile.prod.js — migraciones contra PROD con la conexión de `conexion.prod.json`.
 * Uso (desde back/):
 *   npm run migrate:prod:status  → estado de cada migración en PROD
 *   npm run migrate:prod         → aplica las migraciones pendientes en PROD
 *
 * `conexion.prod.json` está en .gitignore y lo llena a mano quien migra, copiando
 * `conexion.prod.example.json`. No se leen variables de entorno para la conexión, así el `.env`
 * local (que apunta a DEV) no se toca. Nunca se imprimen usuario ni contraseña.
 */

const fs = require('fs');
const path = require('path');
const base = require('./knexfile');

const ARCHIVO = path.join(__dirname, 'conexion.prod.json');
const OBLIGATORIOS = ['host', 'database', 'user', 'password'];

function leerConexion() {
  if (!fs.existsSync(ARCHIVO)) {
    throw new Error('Falta back/conexion.prod.json: copia conexion.prod.example.json y llena las credenciales de PROD.');
  }
  const datos = JSON.parse(fs.readFileSync(ARCHIVO, 'utf8'));
  const faltan = OBLIGATORIOS.filter((c) => !datos[c] || String(datos[c]).startsWith('<'));
  if (faltan.length) throw new Error(`conexion.prod.json incompleto: falta ${faltan.join(', ')}.`);
  return datos;
}

const conexion = leerConexion();
// Solo el destino, para confirmar a qué BD se va a migrar.
console.error(`[migrate:prod] destino: ${conexion.host} / ${conexion.database}`);

/** @type {import('knex').Knex.Config} */
module.exports = {
  ...base,
  connection: {
    host:     conexion.host,
    port:     Number(conexion.port) || 1433,
    database: conexion.database,
    user:     conexion.user,
    password: conexion.password,
    options: {
      encrypt:                conexion.encrypt !== false,
      trustServerCertificate: conexion.trustServerCertificate === true,
    },
  },
};
