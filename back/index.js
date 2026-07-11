/**
 * index.js — entry point del backend.
 * Solo responsable de arrancar el servidor HTTP.
 * La configuración de Express vive en src/infrastructure/http/app.js.
 */

const env = require('./src/config/env');
const app = require('./src/infrastructure/http/app');

const PORT = env.PORT;

app.listen(PORT, () => {
  console.log(`[server] escuchando en http://localhost:${PORT}`);
  console.log(`[server] entorno: ${env.NODE_ENV}`);
});
