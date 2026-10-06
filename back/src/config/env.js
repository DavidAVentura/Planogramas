/**
 * env.js — único punto de acceso a variables de entorno.
 * Todo el resto del código importa desde aquí; nunca lee process.env directamente.
 */

require('dotenv').config();

module.exports = {
  // Servidor
  PORT:     process.env.PORT     || 3000,
  NODE_ENV: process.env.NODE_ENV || 'development',

  // Base de datos — SQL Server
  db: {
    host:                 process.env.DB_HOST,
    port:                 Number(process.env.DB_PORT) || 1433,
    name:                 process.env.DB_NAME,
    user:                 process.env.DB_USER,
    password:             process.env.DB_PASSWORD,
    schema:               process.env.DB_SCHEMA               || 'dbo',
    encrypt:              process.env.DB_ENCRYPT               === 'true',
    trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true',
  },

  // CORS
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:5173',

  // Autenticación (Entra ID / Azure AD)
  jwt: {
    tenantId: process.env.JWT_TENANT_ID,
    audience: process.env.JWT_AUDIENCE,
  },

  // CAO — CemacoAllInOne: emite el JWT del usuario (el login ocurre en otra aplicación) y lo
  // valida vía GET {baseUrl}/auth/validar_token?cod_modulo={codModulo}. Ese mismo JWT es el que
  // se intercambia por el accessToken de CATI (ver infrastructure/cati/tokenManager.js).
  cao: {
    baseUrl:   process.env.CAO_BASE_URL,
    codModulo: process.env.CAO_COD_MODULO || 'SCRAPING',
  },

  // CATI — catálogo y jerarquía (segundo salto)
  cati: {
    baseUrl: process.env.CATI_BASE_URL,
    apiKey:  process.env.CATI_API_KEY,
  },

  // OpenAI — usado por los agentes de back/src/agents/
  openai: {
    apiKey: process.env.OPENIA_TOKEN,
    model:  process.env.OPENAI_MODEL || 'gpt-4o-mini',
    // Agente Importador de PDF de planograma: lee el layout completo de un PDF, necesita un
    // modelo grande con visión y entrada de archivos. El esfuerzo de razonamiento solo se envía
    // a modelos que lo soportan (familia gpt-5 / o-series).
    modelPdf:           process.env.OPENAI_MODEL_PDF || 'gpt-5',
    razonamientoPdf:    process.env.OPENAI_REASONING_PDF || 'medium',
  },

  // Soporte de pruebas Postman (POST /pruebas/fixtures y /pruebas/limpieza). Solo se monta con
  // PRUEBAS_HABILITADAS=true y nunca con NODE_ENV=production (ver routes/index.js).
  pruebas: {
    habilitadas: process.env.PRUEBAS_HABILITADAS === 'true',
  },

  // Azure Blob Storage — adjuntos de PlanogramaVersion. Contenedor privado (la cuenta tiene
  // deshabilitado el acceso anónimo al blob); la descarga real siempre pasa por el backend
  // (GET /adjuntos/:id/descargar), nunca se expone una URL directa del blob.
  azureStorage: {
    connectionString: process.env.AZURE_STORAGE_CONNECTION_STRING,
    container:        process.env.AZURE_STORAGE_CONTAINER_ADJUNTOS || 'adjuntos',
  },
};
