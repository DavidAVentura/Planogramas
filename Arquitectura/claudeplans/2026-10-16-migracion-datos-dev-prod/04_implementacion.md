# 04 — Implementación: migración de datos DEV → PROD

| ID | Estado | Archivos |
|---|---|---|
| T1 | Completa | `back/scripts/migracion-dev-prod/plan.js`, `back/test/scripts/migracion-dev-prod.test.js` |
| T2 | Completa | `back/scripts/migracion-dev-prod/bd.js` |
| T3 | Completa | `back/scripts/migracion-dev-prod/blobs.js` |
| T4 | Completa | `back/scripts/migracion-dev-prod/orquestador.js`, `index.js`, `back/package.json` (script `migrar:dev-a-prod`), pruebas en el mismo archivo de T1 |
| T5 | Completa | `Arquitectura/DESPLIEGUE_AZURE.md` (apartado "Migración de datos DEV → PROD") |

## Verificación

- `cd back && npm test`: 245 pruebas, 245 OK, 0 fallas (incluye 27 nuevas: T1 casos 1–12 y T4 casos 1–12).
- Greps de criterios: sin `NOCHECK`/`DISABLE TRIGGER`/`ALTER TABLE`/`TRUNCATE`; sin `delete`/`generateSas`/`sig=` en `blobs.js`; sin `console.*` con conexión/config/env; sin `console` en `bd.js`.
- Front y Postman: no aplican. No se ejecutó ningún paso operativo ni se tocó ninguna BD o blob; el script no se corrió.

## Desviaciones

- `insertarTabla` recibe además `pk` (columnas de la PK) para armar el `UPDATE` de autorreferencias; el plan no lo listaba.
- `leerEsquema(conexion)` no recibe `tablas`: devuelve todas las tablas de usuario (necesario para detectar "tablas extra").
- `blobs.propiedades(contenedor, ruta)` recibe el nombre real del contenedor (el orquestador usa `CONTENEDOR_ORIGEN/DESTINO` de `plan.js`).
- El orquestador lanza excepción en los abortos de precondición (identidad, esquema, blobs) y devuelve `{ ok: false }` en rollback por contenido inesperado o verificación no cuadrada; ambos dan salida 1.
- `log` es una función con propiedad `tabla` (usa `console.table` en `index.js`).

## Bloqueos

Ninguno.

## Deuda y puntos a revisar

- `DBCC CHECKIDENT ... RESEED` no es transaccional: el simulacro deja los identity de PROD en los valores de DEV (documentado en DESPLIEGUE_AZURE.md; inocuo con PROD casi vacío, C-09 lo muestra).
- Integración no cubierta por pruebas (solo con O4–O5): SQL de `bd.js` (`sys.*`, `snapshot` en OTB requiere `ALLOW_SNAPSHOT_ISOLATION`), copia de blobs sin SAS, y comparación de `blobDestino.url` con `BASE_URL_DESTINO + blobPath` (falla si hay rutas con caracteres codificados).
- DT-69 (retirar el script) y la condición de `/pruebas` dependiente solo de `NODE_ENV`: registrar en el cierre.

## Correcciones ronda 1

| Hallazgo | Corrección | Archivos |
|---|---|---|
| I-1 calidad (formatearError) | Se toma `err.number` antes que `code`; si el mensaje trae el formato de knex `<sql> - <causa>` se conserva solo lo posterior al último ` - `; el recorte final es `slice(-300)`. | `back/scripts/migracion-dev-prod/plan.js` |
| I-2 calidad / I-01 seguridad (Ctrl+C) | El manejador solo marca `estado.abortado` (ya no llama `rollback` con una consulta en curso). El orquestador lanza `Interrumpido` en cada tabla leída de DEV, tras la fase de blobs, antes de abrir la transacción PROD y antes de `vaciar`; `enParalelo` recibe `detener` y deja de tomar trabajos (también corta tras el primer fallo, M-6). El rollback lo hace el `catch` del orquestador. Mensaje sugiere `--verificar` si cayó en el COMMIT (M-03 seg.). | `index.js`, `orquestador.js`, `plan.js` |
| M-5 calidad (de paso) | El simulacro usa `blobYaIdentico`. | `orquestador.js` |
| M-01 seguridad / M-8 calidad | `DESPLIEGUE_AZURE.md` ya no afirma que el `RESEED` no se revierte: dice que los identity no son transaccionales y que se vea `IDENT PROD antes/después`; agrega nota sobre Ctrl+C. | `Arquitectura/DESPLIEGUE_AZURE.md` |

Pruebas nuevas (`back/test/scripts/migracion-dev-prod.test.js`): formatearError con mensaje largo de knex; `enParalelo` con `detener`; interrupción durante la copia de blobs (no se llama `transaction`/`vaciar`/`commit`); interrupción previa (sin transacción). `cd back && npm test`: 249/249 OK. Pendientes menores no tocados: M-1..M-4, M-7, M-02, M-04..M-06 de seguridad.

## Correcciones ronda 2

- **I-3**: `formatearError` (`plan.js`) corta por el último `' - '` solo si el error viene del driver (`err.number` definido o `code === 'EREQUEST'`), y entonces recorta por el final; los errores propios se muestran íntegros (recorte por el inicio, 300). El `COMMIT dudoso` (`orquestador.js`) arma su texto con `formatearError(err)` sin recorte posterior, de modo que `--verificar` siempre queda.
- Pruebas nuevas en `migracion-dev-prod.test.js`: error propio con `'\n - a\n - b'` conserva el encabezado; commit dudoso con causa `'Connection lost - …'` conserva `--verificar`. `cd back && npm test`: 251/251 OK.

## Ejecución operativa (coordinador, 2026-10-16)

- **O1**: App Service `planogramas-api-prod` verificado con `az`: `NODE_ENV=production`, sin `PRUEBAS_HABILITADAS`,
  `AZURE_STORAGE_CONTAINER_ADJUNTOS=adjuntos`, cuenta `planogramasstorage`, `DB_NAME=db-planogramas`.
- **O2**: `npm run migrate:prod` aplicó `018_autor_nombre_evidencia_adjunto.js` (batch 12); sin pendientes.
- **O3**: el usuario detuvo el App Service. Los puntos de restauración de Azure SQL **no se pudieron confirmar** (el
  usuario no tiene lectura sobre el servidor `comerciales`); se dejó respaldo JSON de las 17 tablas de DEV y PROD en
  `C:/Users/dventura/respaldos-planogramas/2026-10-16/` (fuera del repo).
- **O4**: `--solo-blobs`: 91 copiados, 0 faltantes.
- **O5**: el simulacro destapó dos errores, corregidos por el coordinador en `85873b5` (sin ronda de revisión; el
  simulacro hizo de prueba):
  1. `SET IDENTITY_INSERT ON` en una llamada aparte se revertía: knex ejecuta cada consulta por `sp_executesql`. Ahora
     el ON, el INSERT y el OFF van en el mismo lote.
  2. `ultimosIdentity` devolvía también tablas ajenas de OTB (`msg`) y el reseed las rechazaba. Ahora filtra a `dbo` y a
     `ORDEN_TABLAS`.
  Tercer simulacro: 17 tablas con hash igual, FKs confiables, ROLLBACK, salida 0.
- **O6**: `--ejecutar --confirmar=db-planogramas` con el sí explícito del usuario: COMMIT, 6564 filas, identity de
  PROD igual a DEV en todas las tablas (Tienda 53, Seccion 61…).
- **O7**: `--verificar` → "Todas las tablas cuadran"; App Service iniciado; `/api/v1/health` 200. Falta la prueba en la
  app con usuario CAO (abrir un planograma, descargar un adjunto y una evidencia).
