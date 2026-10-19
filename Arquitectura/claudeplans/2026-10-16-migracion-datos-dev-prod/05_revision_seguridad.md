# 05 — Revisión de seguridad e integridad del diff: migración de datos DEV → PROD

Alcance: `git diff 2f79752` (`Arquitectura/DESPLIEGUE_AZURE.md`, `back/package.json`) y los archivos
nuevos `back/scripts/migracion-dev-prod/{index,orquestador,bd,blobs,plan}.js` y
`back/test/scripts/migracion-dev-prod.test.js`, contra `PLAN.md` y `02_seguridad.md`. No se ejecutó
el script, no se tocó ninguna BD ni blob, no se leyó `.env` ni `conexion.prod.json`.
`cd back && npm test`: 245/245 OK.

**Veredicto: aprobado sin bloqueantes.** Los 8 controles bloqueantes están cumplidos. Hay 1 hallazgo
Importante y 6 Menores.

## Controles bloqueantes

| Control | Estado | Evidencia |
|---|---|---|
| C-01 Identidad en vivo | Cumple | `plan.js:65-75` constantes `OTB` / `db-planogramas` / `comerciales` contra el `DB_NAME()` y el `@@SERVERNAME` reales; `--confirmar` se compara contra `destino.bd` real. `DB_NAME()` se repite sobre el `trx` (`orquestador.js:144-145`) y en cada escritura (`bd.js:157-160`, `asegurarDestino`). Pool PROD `max: 1` (`bd.js:24`): la sesión verificada es la que borra. Desde Kudu, el origen sería `db-planogramas` y se bloquea; además `knexfile.prod.js` falla sin `conexion.prod.json`. |
| C-02 DEV no escribe | Cumple | DEV solo pasa por `identidad`, `leerEsquema`, `leerMigraciones`, `leerTabla`, `ultimosIdentity`; la lectura va en snapshot y termina en `rollback`; `knexDev.destroy()` antes de abrir el `trx` PROD (`orquestador.js:49-56`). Las funciones de escritura rechazan cualquier conexión que no esté en `db-planogramas`. |
| C-05 Una transacción + `XACT_ABORT` | Cumple | `bd.js:162-166`; vaciado, carga, autorreferencias, reseed y verificación sobre el mismo `trx`; `commit` solo con `ejecutar && ok && !abortado` (`orquestador.js:178`). La prueba "falla en Posicion" lo cubre. |
| C-06 Señales | Cumple, con observación I-01 | `index.js:25-31`; `IDENTITY_INSERT OFF` en `finally` (`bd.js:186-190`); se destruyen los dos pools (`index.js:39-41`). |
| C-10 `blob_url` sin SAS | Cumple | `plan.js:151-162` valida el contenedor, la URL exacta de DEV y la ausencia de `?`/`sig=`; la copia va sin SAS (`blobs.js:51`). |
| C-11 Verificación que relee PROD | Cumple | `orquestador.js:94-95` hace un `SELECT` nuevo sobre el `trx` con el mismo `expresionSelect`; las filas se ordenan en Node y se serializan con `JSON.stringify` (null distinto de "null"). `verificarBlobsFilas` es independiente de `reescribirBlob` (`'adjuntos'` literal). |
| C-17 Sin secretos | Cumple | Solo se imprimen el servidor y la BD (y el host/BD de `knexfile.prod.js`); `formatearError` recorta a 300 caracteres y oculta las query strings; no hay `console` en `bd.js` ni escritura a disco. |
| C-18 PITR de ambas bases | Cumple (procedimiento) | `DESPLIEGUE_AZURE.md:137-138` (O3) con `db-planogramas` **y** `OTB`, hora UTC y casillas para anotarla. |

Importantes del diseño: C-03 (dentro del `trx`, antes del `DELETE`), C-07 (`--verificar`), C-08 (120 s
de `requestTimeout`, `LOCK_TIMEOUT` 30 s, App Service detenido en O3), C-12 (collation, filtros, FKs,
migraciones y lock), C-13 (sin `NOCHECK`/`ALTER`; `fksConfiables`), C-14, C-15 y C-16: todos cumplidos.
C-04: en el checklist O1.

## `DBCC CHECKIDENT RESEED` fuera del rollback en el simulacro (análisis pedido)

- **Qué persiste**: el `IDENT_CURRENT` que avanzan las inserciones con `IDENTITY_INSERT` no se revierte
  nunca. El `RESEED` dentro de una transacción revertida puede revertirse o no, y el documento no debe
  afirmarlo (ver M-01). En los dos casos, después del simulacro PROD queda con el identity de cada
  tabla en el máximo de DEV (o cerca de él).
- **¿Puede romper algo?** No en las condiciones que el código permite. El simulacro solo llega a
  `vaciar`/`reseed` si C-03 encontró en PROD exactamente los fixtures (`orquestador.js:152-157`);
  `--forzar-vaciado` exige `--ejecutar --confirmar`. Tras el rollback sobreviven solo `Tienda` id 1 y
  `Accesorio` id 1, y el valor de reseed sale de `sys.identity_columns.last_value` de DEV (≥ 1 si la
  tabla tuvo filas; se omite si es null, `bd.js:205`). Por eso no queda ningún identity por debajo de
  un id existente (no hay riesgo de PK duplicada en altas futuras). La ejecución real vuelve a hacer
  `DELETE` → `IDENTITY_INSERT` → `RESEED` y su verificación compara contra DEV, así que el estado que
  deja el simulacro no la afecta. Una vez que PROD tenga datos reales, un simulacro posterior se
  detiene en C-03 antes del `DELETE` y no reseedea nada.
- **C-09 (Menor)**: cumple. `orquestador.js:198-199` relee `IDENT_CURRENT` después del rollback y lo
  muestra junto a "IDENT PROD antes" (solo en el camino sin excepción, ver M-02).
- **Divergencia inocua**: en una tabla que en DEV tiene 0 filas pero `last_value` = N y que en PROD
  nunca tuvo filas, `RESEED N` hace que el próximo id de PROD sea N y el de DEV N+1 (regla de SQL
  Server para tablas sin inserciones). La verificación omite esa tabla porque tiene 0 filas. No hay
  ninguna referencia a ese id, así que no afecta la integridad.

## Hallazgos

### Importante

**I-01 · `back/scripts/migracion-dev-prod/orquestador.js:81-85` y `:138-159` · Un Ctrl+C antes de la
transacción no detiene el flujo.**
Escenario: en O6 (`--ejecutar`), el operador pulsa Ctrl+C durante la copia de ~430 MB de blobs.
`alInterrumpir` (`index.js:25-29`) marca `estado.abortado = true`, pero en ese momento todavía no hay
`trx` y el orquestador no consulta la marca hasta terminar la primera tabla (`:169`). El script sigue:
abre la transacción de PROD, toma bloqueos exclusivos, ejecuta `DELETE` de las 17 tablas, inserta
`Tienda` y recién ahí aborta y hace rollback. No hay commit, así que no se pierden datos. Pero el
operador quiso detener el proceso y aun así se escribe en PROD, y el informe no muestra el
`IDENT PROD después`. Lo mismo pasa con una señal recibida durante la lectura de DEV o durante el
simulacro de blobs.
Corrección: agregar `if (estado.abortado) throw new Error('Interrumpido.')` después de la fase de
blobs (antes de `:137`) y justo antes de `bd.vaciar` (`:159`). Opcionalmente, que `enParalelo` deje
de tomar trabajos nuevos cuando `estado.abortado` sea verdadero. Prueba: un doble de `blobs.copiar`
que dispara `estado.abortado = true` y la aserción de que `knexProd.transaction` y `bd.vaciar` no se
llaman.

### Menores

**M-01 · `Arquitectura/DESPLIEGUE_AZURE.md:127-129` · Afirmación no verificada.** El documento dice
"El reseed (`DBCC CHECKIDENT`) no se revierte con el rollback". Lo que persiste con seguridad es el
avance por `IDENTITY_INSERT`; que el `RESEED` se revierta o no depende del motor. Redactarlo así: "Los
valores de identity no son transaccionales: tras el simulacro PROD puede quedar con el identity en
los valores de DEV; ver la columna IDENT PROD después". El impacto es el mismo.

**M-02 · `orquestador.js:192-196` · Sin informe de identity cuando la transacción falla.** Si el
simulacro falla con excepción (FK, timeout o lote), no se imprime `IDENT PROD antes/después`. Es
justo el caso en que el identity quedó avanzado a medias. Imprimir `identCurrent(knexProd)` en el
`catch` antes de relanzar, o al menos `identAntes`.

**M-03 · `orquestador.js:178-181` · Carrera entre la señal y el commit.** Si la señal llega después
de la comprobación de `!estado.abortado` y antes de que termine `commit()`, se emiten `COMMIT` y
`ROLLBACK` a la vez sobre la misma sesión. El resultado es ambiguo y la salida es 1. El documento ya
indica O7 (`--verificar`); basta con añadir al mensaje de interrupción "si ocurrió durante el COMMIT,
ejecutar --verificar".

**M-04 · `blobs.js:51` y `orquestador.js:81` · La copia ocurre antes de C-03 y sobrescribe.** En
`--ejecutar`, los blobs se copian a `adjuntos` (contenedor de PROD) antes de evaluar el contenido de
PROD. `beginCopyFromURL` sobrescribe cualquier blob destino con el mismo `blob_path` y un MD5
distinto. El riesgo es teórico (rutas con id/uuid; PROD sin adjuntos reales hoy), pero si C-03
aborta, los blobs ya copiados quedan huérfanos en `adjuntos`. Aceptable; anotarlo en la vuelta atrás.

**M-05 · `orquestador.js:125-129` · `--verificar` compara solo el tamaño de los blobs.** No compara
el MD5, cuando la copia sí lo exige (C-16). Para alinear los dos criterios, usar `blobYaIdentico` si
ambos tienen MD5.

**M-06 · `plan.js:156` y `blobs.js:58` · Rutas con caracteres codificados.** La app guarda
`blobClient.url` (`src/infrastructure/storage/blobClient.js:47`), que el SDK codifica. Un
`blob_path` con espacios o acentos hace fallar la comparación con `BASE_URL + blob_path`. Falla del
lado seguro (aborta antes de la transacción), pero en O5 detendría la ventana. Revisar en el
simulacro de blobs (O4) que ninguna ruta tenga caracteres fuera de `[A-Za-z0-9/._-]`, o comparar
contra la URL que arma el SDK.

## Pruebas

Los casos de abuso 1–12 de `02_seguridad.md` están cubiertos con dobles. Quedan sin prueba
automatizada (aceptable en un script de un solo uso, porque se cubren en O4–O5): que se ejecute
`IDENTITY_INSERT OFF` en `bd.insertarTabla` cuando falla un lote, y el SQL real de `bd.js`
(snapshot en `OTB` que requiere `ALLOW_SNAPSHOT_ISOLATION`; si no está activo, falla antes de
escribir).

## Deuda (para el cierre)

- DT-69: retirar el script cuando PROD esté estable (se despliega con `back/`).
- `/pruebas` depende solo de `NODE_ENV` (propuesta Baja de `02_seguridad.md`).
- DT-10 sube de prioridad: PROD pasa a tener datos reales de las 45 tiendas sin filtro por tienda.
