# Solicitud — Migración de datos DEV → PROD

- **Fecha**: 2026-10-16
- **Rama**: `feat/migracion-datos-dev-prod` · **Commit base**: `2f797523169207f5453174dc25ee0a900f32b5f6`
- **Tamaño**: M — operación de datos única contra PROD (sin endpoints ni UI), con escritura masiva y
  copia de blobs; el riesgo es de integridad, no de código.
- **Etapas**: arquitecto (1+3 en una llamada) · seguridad-integridad (2, 5) · desarrollador ·
  revisor-calidad. Sin disenador-ux (no hay front).

## Solicitud del usuario

ya está disponible el entorno de producción listo, hay archivos para la conexión, y tienes acceso a la
de dev, entonces mientras se publicaba la versión de prod, carol estuvo añadiendo toda la información
en la dev, ahora que ya está la de prod, hay que migrar toda la información de dev a prod, de la base
de datos completa, con todo todo todo

## Contexto adicional

Diagnóstico de solo lectura hecho por el coordinador (2026-10-16):

- DEV = BD `OTB`, PROD = BD `db-planogramas`, **mismo servidor** Azure SQL `comerciales.database.windows.net`.
  Azure SQL Database no permite consultas entre bases → la copia debe hacerse leyendo de una conexión
  y escribiendo en otra (Node + Knex).
- Conexión a PROD: `back/conexion.prod.json` (gitignored) vía `back/knexfile.prod.js`. Conexión a
  DEV: `.env` local vía `back/knexfile.js`. Nunca imprimir credenciales ni leer el `.env`.
- PROD tiene aplicadas las migraciones 001–017; falta `018_autor_nombre_evidencia_adjunto.js`
  (DEV ya la tiene). Hay que aplicarla antes de copiar.
- Filas por tabla (DEV / PROD): Accesorio 135/1, Adjunto 89/0, AsignacionAuditoria 88/0,
  EdicionAsignacion 46/0, EvidenciaImplementacion 2/0, Gondola 170/0, HistorialSustitucion 0/0,
  Nivel 200/0, Planograma 43/0, PlanogramaSubcategoria 287/0, PlanogramaVersion 46/0,
  Posicion 1819/0, PosicionAccesorio 1777/0, Producto 1734/0, Seccion 0/0, Tienda 45/1,
  VersionTienda 83/0, knex_migrations 18/17.
- Lo que hay hoy en PROD es de prueba: Tienda id 1 `T004 Cemaco zona 4` y Accesorio id 1
  `G-12-FIXTURE` (fixture de Postman). En DEV la tienda id 1 es `T0PC`.
- DEV no tiene restos de fixtures de Postman (sin tiendas región "Pruebas", sin productos/accesorios fixture,
  sin `fixture-sin-blob`).
- `OTB` contiene tablas ajenas a la app (Ventas, Presupuesto, Recompra, Transito, Transitos,
  EFGDepartamento, msg); el código de `back/src` no las usa.
- Adjunto y EvidenciaImplementacion guardan `blob_container = 'adjuntos-dev'`, `blob_path` y `blob_url`
  (`https://planogramasstorage.blob.core.windows.net/adjuntos-dev/...`). El backend descarga y elimina
  usando el `blob_container` de cada fila. PROD usa el contenedor `adjuntos` (misma cuenta
  `planogramasstorage`, según memoria del proyecto). La cadena de conexión del blob está en el `.env`
  (vía `back/src/config/env.js` → `env.blob`/storage).

## Preguntas resueltas

| Pregunta | Respuesta del usuario |
|---|---|
| ¿Qué tablas se copian? | Solo las de la app (las tablas de OTB ajenas no se copian). |
| ¿Qué hacer con lo que hay en PROD? | Vaciar PROD y dejarlo idéntico a DEV, con los mismos IDs. |
| ¿Archivos de adjuntos y evidencias? | Copiar los blobs de `adjuntos-dev` a `adjuntos` y actualizar `blob_container`/`blob_url` en PROD. |
| ¿El App Service de PROD usa `adjuntos` en la misma cuenta `planogramasstorage`? | Sí, misma cuenta. |
| ¿Carol ya dejó de editar en DEV? | Sí, ya terminó: se puede copiar. |
| ¿Se corren las pruebas de Postman contra PROD? | No, solo en DEV. |

## Cambios pedidos en la aprobación 1

