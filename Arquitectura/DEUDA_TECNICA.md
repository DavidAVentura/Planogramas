# Deuda técnica

Registro de lo que sabemos que hay que corregir y decidimos no corregir todavía. Es la fuente única:
los agentes de `/desarrollo` reportan deuda nueva en sus entregables y el coordinador la consolida
aquí en la etapa de cierre.

**Reglas**
- Un ID por ítem (`DT-NN`, nunca se reutiliza). Al resolverlo, cambiar el estado a `Resuelta` con la
  fecha y el plan que lo cerró; no borrar la fila.
- Severidad: **Crítica** (riesgo de seguridad o pérdida de datos), **Alta** (bloquea crecer o publicar
  con confianza), **Media** (frena o genera inconsistencias), **Baja** (limpieza).
- Antes de planear un cambio, el arquitecto revisa si toca alguna deuda abierta y la incluye o la
  menciona en el plan.

| ID | Título | Severidad | Área | Detectada | Estado |
|----|--------|-----------|------|-----------|--------|
| DT-01 | Autorización por permisos/tiendas de CAO (permisos resueltos; falta el filtro por tienda) | Crítica | back | 2026-10-12 · configuración de `/desarrollo` | Parcial (permisos resueltos 2026-10-12, plan `2026-10-12-permisos-cao`); falta el filtro por tienda (DT-10) |
| DT-02 | 78 archivos CSS con valores fuera de los tokens (lista legacy en `front/.stylelintrc.json`) | Media | front | 2026-10-12 · reglas de stylelint | Abierta |
| DT-03 | `listarPlanogramas` devuelve `pageSize: NaN` si recibe un valor no numérico | Baja | back | 2026-10-12 · pruebas de dominio | Abierta |
| DT-04 | Sin tokens de escala tipográfica ni de espaciado | Media | front | 2026-10-12 · configuración de `/desarrollo` | Abierta |
| DT-05 | 26 errores de stylelint preexistentes y `npm run lint` no corre en CI | Media | front · CI | 2026-10-12 · configuración de `/desarrollo` | Abierta |
| DT-06 | Cobertura de pruebas mínima: sin pruebas del resto de entidades, casos de uso ni integración HTTP/BD | Media | back · front | 2026-10-12 · configuración de `/desarrollo` | Abierta |
| DT-07 | `adjuntos` (13) y `agente-extractor` sin carpeta de pruebas Postman | Media | back | 2026-10-12 · `CLAUDE.md` | Abierta |
| DT-08 | Estado de migraciones de PROD sin verificar | Alta | BD | 2026-10-12 · `CLAUDE.md` | Abierta |
| DT-09 | El workflow de API PROD instala devDependencies y usa `actions/setup-node@v3` (DEV usa `--omit=dev` y v4) | Baja | CI | 2026-10-12 · configuración de `/desarrollo` | Abierta |
| DT-10 | Sin filtro por tienda del usuario en los endpoints I | Alta | back · front | 2026-10-12 · plan `2026-10-12-permisos-cao` | Abierta |
| DT-11 | Acciones con la regla transitoria A sin permiso propio en CAO | Media | back · front | 2026-10-12 · plan `2026-10-12-permisos-cao` | Abierta |
| DT-12 | Evidencias de cualquier tienda: lectura, carga y borrado por el usuario de tienda | Media | back | 2026-10-12 · plan `2026-10-12-permisos-cao` | Abierta |
| DT-13 | Nombre provisional del perfil de tienda (`TIENDA-EST`) | Baja | back · docs | 2026-10-12 · plan `2026-10-12-permisos-cao` | Abierta |
| DT-14 | La revocación de permisos tarda hasta 2 min (caché de CAO) | Baja | back | 2026-10-12 · plan `2026-10-12-permisos-cao` | Abierta (aceptada) |
| DT-15 | `fetch` a CAO sin timeout y `details` del 503 con `causa.message` | Baja | back | 2026-10-12 · plan `2026-10-12-permisos-cao` | Abierta |
| DT-16 | `express.json` (8 MB / 21 MB) corre antes de la autenticación | Baja | back | 2026-10-12 · plan `2026-10-12-permisos-cao` | Abierta |
| DT-17 | Las consultas de lectura que fallan (403, 500) se muestran como lista vacía sin mensaje | Media | front | 2026-10-15 · revisión en navegador de `2026-10-12-permisos-cao` | Abierta |
| DT-18 | A 1024 px de ancho el `AppTopbar` del analista desborda y aparece scroll horizontal | Baja | front | 2026-10-15 · revisión en navegador de `2026-10-12-permisos-cao` | Abierta |
| DT-19 | Postman sin sub-carpeta de 403 con `TOKEN_CAO_TIENDA` | Baja | back · pruebas | 2026-10-15 · plan `2026-10-12-permisos-cao` (T15) | Abierta |
| DT-20 | Importación concurrente duplica SKUs: estado de la versión y `skusDeVersion` se leen fuera de la transacción (mitigado por el botón deshabilitado en vuelo) | Media | back | 2026-10-15 · plan `2026-10-15-importar-excel-tamano-accesorio` | Abierta |
| DT-21 | `mensajeDeError` ignora `details` de los 400 en todo el front (solo se resolvió en el modal de importar Excel) | Media | front | 2026-10-15 · plan `2026-10-15-importar-excel-tamano-accesorio` | Abierta |
| DT-22 | Campos legado `accesorio_codigo`/`tamano_accesorio_pulgadas` de importar-productos: retirarlos cuando el front nuevo esté en DEV y PROD | Baja | back | 2026-10-15 · plan `2026-10-15-importar-excel-tamano-accesorio` | Abierta |
| DT-23 | Resolución de accesorios en la importación con una consulta por código (tope de 200); falta `buscarPorCodigos` en lote | Baja | back | 2026-10-15 · plan `2026-10-15-importar-excel-tamano-accesorio` | Abierta |
| DT-24 | Sin índice en `PosicionAccesorio.posicion_id` | Baja | BD | 2026-10-15 · plan `2026-10-15-importar-excel-tamano-accesorio` | Abierta |
| DT-25 | `importarProductos` no registra quién importó | Baja | back | 2026-10-15 · plan `2026-10-15-importar-excel-tamano-accesorio` | Abierta |
| DT-26 | Importación de Excel sin caso de uso en `CASOS_DE_USO.md` | Baja | docs | 2026-10-15 · plan `2026-10-15-importar-excel-tamano-accesorio` | Abierta |
| DT-27 | Extractores de PDF e imagen numerada solo devuelven ganchos enteros: el PDF sí imprime `54E`, hoy se lee como 54 o no cruza con "Por ubicar" | Media | back · IA | 2026-10-15 · plan `2026-10-15-importar-excel-tamano-accesorio` | Resuelta 2026-10-15 · plan `2026-10-15-ganchos-exhibicion-pdf` |
| DT-28 | `Gancho = number \| string` (forma mixta) en vez de un tipo explícito | Baja | back · front | 2026-10-15 · plan `2026-10-15-importar-excel-tamano-accesorio` | Abierta |
| DT-29 | Reglas duplicadas entre back y front: ganchos y código de accesorio | Baja | back · front | 2026-10-15 · plan `2026-10-15-importar-excel-tamano-accesorio` | Abierta |
| DT-30 | La unicidad de ganchos solo se valida dentro de cada posición, no entre posiciones de la versión (preexistente) | Baja | back | 2026-10-15 · plan `2026-10-15-importar-excel-tamano-accesorio` | Abierta |
| DT-31 | Accesorio eliminado entre la verificación de catálogo y el `insert` de la importación termina en rollback y `500` genérico | Baja | back | 2026-10-15 · plan `2026-10-15-importar-excel-tamano-accesorio` | Abierta |
| DT-32 | `GondolaFrameLienzo`, `NivelFilaLienzo` y `PosicionLienzo` no se montan en ninguna página (solo `GondolaEscalaLienzo`): posible código muerto | Baja | front | 2026-10-15 · plan `2026-10-15-importar-excel-tamano-accesorio` | Abierta |
| DT-33 | Un texto de gancho `54. 5` (espacio tras el punto) se parte en `[54, 5]` en el lector del Excel | Baja | front | 2026-10-15 · plan `2026-10-15-importar-excel-tamano-accesorio` | Abierta |
| DT-34 | Reglas de entrada de ganchos distintas entre chips (`54 E` no se acepta), drawer y Excel (unión `\d\s+E` sin helper compartido) | Baja | front | 2026-10-15 · plan `2026-10-15-importar-excel-tamano-accesorio` | Abierta |
| DT-35 | Varios ganchos de exhibición en un facing angosto del lienzo a escala se recortan (el `title` los lista) | Baja | front | 2026-10-15 · plan `2026-10-15-importar-excel-tamano-accesorio` | Abierta |
| DT-36 | El front no aplica dos topes del back en la importación: 100 ganchos por producto y 100 facings implícitos (el lote falla con 400 de Joi sin fila de Excel) | Baja | front | 2026-10-15 · plan `2026-10-15-importar-excel-tamano-accesorio` | Abierta |
| DT-37 | Enteros de importación sin máximo (`unidades_por_facing`, `cantidad_apilable`, `capacidad_maxima`) pueden desbordar `INT` y terminar en `500` con rollback | Baja | back · front | 2026-10-15 · plan `2026-10-15-importar-excel-tamano-accesorio` | Abierta |
| DT-38 | El lector del Excel convierte en silencio un `0` explícito en `Cantidad_x_facing`/`cantidad_apilable` (a 1) y `capacidad_maxima` (a `null`) | Baja | front | 2026-10-15 · plan `2026-10-15-importar-excel-tamano-accesorio` | Abierta |
| DT-39 | El extractor de imagen numerada descarta los ganchos de exhibición `54E` (schema `integer[]`) | Baja | back · IA | 2026-10-15 · plan `2026-10-15-ganchos-exhibicion-pdf` | Abierta |
| DT-40 | `datos_vision` de `importar-layout` sin tope de tamaño y con `ganchos_pdf`/`moduleId` sin validar | Baja | back | 2026-10-15 · plan `2026-10-15-ganchos-exhibicion-pdf` | Abierta |
| DT-41 | `TIPO_TIENDA_META.EXPRESS` usa el color literal `#7a5900` en vez de un token | Baja | front | 2026-10-15 · plan `2026-10-15-importar-excel-bloque-tamano` | Abierta |
| DT-42 | En el Excel, un campo por bloque que venga sin sufijo (p. ej. `Facings` en vez de `Facings_TM`) se toma en silencio para TM/TE | Baja | front | 2026-10-15 · plan `2026-10-15-importar-excel-bloque-tamano` | Abierta |

## Detalle

### DT-01 — Autorización por permisos y tiendas (Parcial)
**Permisos resueltos (2026-10-12, plan `2026-10-12-permisos-cao`)**: todos los endpoints validan la
regla de `Arquitectura/SEGURIDAD_PERMISOS.md` (guards A/I/C/PLA00X) y el front oculta lo no permitido.
**Falta el filtro por tienda** (DT-10): se cierra cuando CAO actualice las tiendas por usuario y los
repositorios las apliquen.

### DT-02 — Valores fuera de los tokens
312 colores hex, 37 `rgb()`, 62 radios y 32 sombras sueltos al activar las reglas. 92 de los hex son
`#fff` (equivale a `var(--white)`). Al tocar un archivo de la lista, migrarlo y quitarlo de la lista.

### DT-03 — `pageSize: NaN`
`domain/planograma/planograma.usecases.js` → `Math.max(1, parseInt('x'))` es `NaN`. Hoy no ocurre
porque el controller valida con Joi antes; corregir si el caso de uso se reutiliza sin ese controller.

### DT-04 — Escala tipográfica y de espaciado
Hay 8 tamaños de fuente distintos (de 9px a 15px, incluido 10.5px) y unos 674 `padding/gap/margin`
en px. Definir `--text-*` y `--space-*` en `tokens.css` y una regla de stylelint que los exija.
Propuesta a cargo del agente disenador-ux.

### DT-05 — Lint en CI
Corregir los 26 errores (15 se arreglan con `--fix`) y agregar `npm run lint` a los workflows del front.

### DT-10 — Sin filtro por tienda del usuario
Cualquier usuario con PLA009/PLA010 consulta implementación y productos de cualquier `tiendaId` y
elige cualquier tienda en el chip. Depende de que CAO actualice `tiendas` por usuario (ya llega en
la sesión). Al resolverlo, DT-01 se cierra.

### DT-11 — Acciones con la regla transitoria A
Solicitar a IT CAO permisos para: archivar planograma; promover, archivar y guardar (cambio de
estado) de versión; gestionar adjuntos; gestionar accesorios; editar dimensiones de producto; agente
extractor (foto/PDF/IA); voz. Mientras tanto un perfil con un subconjunto de PLA001–PLA008 queda
fuera de todas las vistas de analista, y cualquier perfil con los 8 puede archivar/promover. Al
llegar los códigos: reemplazar A en la ruta, en `matrizPermisos.test.js`, en `puede(...)` del front y
en `SEGURIDAD_PERMISOS.md`. **Condición de cierre**: al reemplazar A, la prueba de rutas debe comparar
la regla de cada ruta contra una tabla declarativa (hoy los `PLA00X` por ruta quedan tapados por A y
la prueba no detectaría que se quite uno; hallazgo M-03 de `05_revision_seguridad.md`).

### DT-12 — Evidencias de cualquier tienda
Sin filtro por tienda, un implementador lista y descarga evidencias de otra tienda (IDs secuenciales
en `/evidencias/:id/descargar`), sube evidencias a otra tienda (contamina su avance) y borra las que
él mismo subió en cualquier tienda (el dominio limita el borrado al autor). El borrado es físico, sin
auditoría. Se resuelve con DT-10 y, si se requiere trazabilidad, con borrado lógico.

### DT-13 — Nombre provisional del perfil de tienda
IT CAO está validando el nombre (en la matriz original aparece `TIENDAS-EST`; hoy `TIENDA-EST`). Vive
solo en `PERFILES.TIENDA` de `back/src/domain/compartido/permisos.js` y en la doc; no afecta reglas.
Actualizar cuando el usuario confirme.

### DT-14 — Revocación de permisos con retraso
TTL de 2 min del caché por token en `caoAuthClient`; el keepalive no refresca permisos. Aceptado.

### DT-15 — Timeout de `fetch` a CAO
`caoAuthClient.js`: expone nombres de host internos en `details` del 503 y un CAO colgado deja
colgado el request. Preexistente.

### DT-16 — Parseo de body antes de autenticar
`app.js`: `express.json` (8 MB / 21 MB) corre antes de la autenticación; un cliente sin token fuerza
el parseo de cuerpos grandes. Preexistente.

### DT-17 — Errores de lectura se ven como lista vacía
Las consultas de lectura que fallan (p. ej. 403 o 500) se muestran como lista vacía sin mensaje:
ninguna página usa `isError` de React Query. Comprobado en navegador: Accesorios con 403 muestra
"0 accesorios que coinciden". Incumple el estado "Error" de `DISENO_SISTEMA.md` §4. Corregir con un
estado de error por página o un componente común.

### DT-18 — `AppTopbar` desborda a 1024 px
A 1024 px de ancho el `AppTopbar` del analista desborda ~74 px y aparece scroll horizontal en la
página (`scrollWidth` 1098 vs 1024). Ajustar el layout (agrupar o compactar la navegación).

### DT-19 — Postman: 403 con usuario de tienda
La sub-carpeta de 403 con `TOKEN_CAO_TIENDA` se omitió porque no existe usuario de tienda (el caso
lo cubren los stubs de `back/test/http/matrizPermisos.test.js`). Agregarla a la carpeta `auth` de la
colección cuando exista el usuario.

### DT-20 — Importación concurrente
`importarProductos` lee el estado de la versión y `skusDeVersion` fuera de la transacción: dos importaciones
simultáneas del mismo archivo pueden duplicar SKUs. El botón deshabilitado en vuelo lo mitiga. Mover ambas
lecturas dentro de la transacción.

### DT-21 — `mensajeDeError` y `details`
El toast global ignora `details` de los 400. Solo `ImportarExcelProductosModal` lo resuelve por su cuenta.

### DT-22 — Campos legado de importar-productos
`accesorio_codigo`/`tamano_accesorio_pulgadas` se aceptan solo si `accesorios` viene vacío. Retirarlos
cuando el front nuevo esté publicado en DEV y PROD.

### DT-23 — Resolución de accesorios sin consulta en lote
Una consulta `buscarPorCodigo` por código (tope de 200). Agregar `buscarPorCodigos`.

### DT-24 — Índice en `PosicionAccesorio.posicion_id`
Sin índice; se nota al leer accesorios de muchas posiciones.

### DT-25 — Sin auditoría de la importación
`importarProductos` no registra quién importó ni cuándo.

### DT-26 — Caso de uso de la importación
La importación del Excel de productos no tiene caso de uso en `CASOS_DE_USO.md`. Al escribirlo, notar que
la elección del bloque TG/TM/TE vive solo en el front: el back no valida que los productos vengan del bloque
de la versión (plan `2026-10-15-importar-excel-bloque-tamano`).

### DT-27 — Extractores sin ganchos de exhibición
El PDF imprime `54E` y los extractores (PDF e imagen numerada) solo devuelven enteros; el espacio se lee como
54 o el producto `54E` no cruza con "Por ubicar" y se arrastra a mano. Requiere un plan aparte.

**Resuelta 2026-10-15** (plan `2026-10-15-ganchos-exhibicion-pdf`): el extractor de PDF pide los ganchos como
texto y los normaliza con `normalizarGancho` (`ganchosDelEspacio`); `importar-layout` con `usar_por_ubicar` cruza
`54E` con `54E`. El extractor de imagen numerada pasa a DT-39.

### DT-28 — `Gancho` como forma mixta
`number | string` (`54` normal, `"54E"` exhibición). Si aparecen otras variantes, migrar a `{ numero, tipo }`
con migración de datos.

### DT-29 — Reglas duplicadas back/front
Ganchos (`back/src/domain/compartido/gancho.js` ↔ `front/src/domain/ganchos/gancho.ts`) y código de accesorio
(`normalizarCodigo` ↔ `normalizarCodigoAccesorio`). Se mantienen con las mismas pruebas en ambos lados.

### DT-30 — Unicidad de ganchos entre posiciones
Dos posiciones de la misma versión pueden guardar el mismo `54`/`54E`; solo los chips del front lo impiden.
Un cliente directo de `importar-layout` puede mandar el mismo gancho en dos espacios: el extractor de PDF solo lo
advierte, y `cruzarConPorUbicar` **no** lo evita (`usados` solo limpia "Por ubicar"), así que llena ambos espacios
con el mismo producto (prueba en `back/test/domain/importacion.test.js`, también con ganchos enteros).

### DT-31 — Carrera accesorio eliminado
Si un accesorio se elimina entre la verificación del catálogo y el `insert`, la FK falla: rollback y `500`.
Si ocurre en la práctica, mapear el error de FK a `409`.

### DT-32 — Componentes del lienzo sin montar
`GondolaFrameLienzo`, `NivelFilaLienzo` y `PosicionLienzo` no los monta ninguna página. Revisar si son
código muerto; si se eliminan, mover los tipos compartidos de `GondolaFrameLienzo`.

### DT-33 — Gancho `54. 5` en el Excel
`ganchosCelda` rechaza decimales con `/\d\.\d/`; con espacio tras el punto se parte en `[54, 5]`. Usar
`/\d\s*\.\s*\d/`.

### DT-34 — Reglas de ganchos distintas entre chips, drawer y Excel
`leerGancho('54 e')` en los chips da error, mientras `leerListaGanchos` (drawer) y `ganchosCelda` (Excel) unen
`54 E`; además la regla de unión difiere (lookahead). Compartir un helper en `domain/ganchos/gancho.ts`.

### DT-35 — Ganchos `E` recortados en facings angostos
`.gondola-escala__facing` tiene `overflow: hidden`; `54E, 55E, 56E` se corta (el `title` lista todos).
Mostrar `+nE` o un solo span por facing.

### DT-36 — Topes de ganchos y facings implícitos en el front
`interpretarHojaProductos` no bloquea más de 100 ganchos ni facings implícitos > 100; el back responde 400 con
el mensaje de Joi sin la fila. Registrar un `ErrorLectura` en la columna de gancho o Facings.

### DT-37 — Enteros de importación sin máximo
Un valor como `Cantidad_x_facing = 3000000000` pasa el front y Joi y el `insert` falla por desbordar `INT`
(rollback, `500` sin fila ni columna). Poner un máximo razonable en `importacion.schemas.js` y en `enteroCelda`.

### DT-38 — `0` explícito convertido en silencio
`unidades || 1`, `apilable || 1`, `capacidad || null` en el lector del Excel contradicen "el front no convierte
inválidos". Que `0` sea `ErrorLectura` ("debe ser al menos 1") y dejar `?? 1`/`?? null` solo para vacíos.

### DT-39 — Imagen numerada sin ganchos de exhibición
El extractor de imagen numerada (`extractorImagenNumerada.js`, schema `integer[]`) descarta los ganchos `54E`. Hoy
solo afecta el texto que se manda al chat del Agente Extractor (no se persisten ganchos). Atender si ese flujo llega
a guardar `Posicion.ganchos`: reutilizar `ganchosDelEspacio` del extractor de PDF.

### DT-40 — `datos_vision` sin tope ni validación
`datos_vision` en `importar-layout` (`importacion.schemas.js`, `Joi.object().unknown(true)`) no tiene tope de tamaño,
y `ganchos_pdf`/`moduleId` no se validan. Validar `ganchos_pdf` con `schemaGanchos` y limitar el tamaño del objeto
cuando se toque ese esquema.

### DT-41 — Color literal en `TIPO_TIENDA_META.EXPRESS`
`front/src/constants/tiendas.ts` usa `#7a5900` para el texto de Express en vez de un token semántico. Ahora
también se ve en el Badge del bloque del modal de importación. Moverlo a un token de `tokens.css`.

### DT-42 — Columna común sin sufijo en archivos de tres bloques
Para mantener los archivos antiguos, una columna sin sufijo vale para cualquier tipo. Si un archivo de tres
bloques trae un campo sin sufijo (`Facings` en vez de `Facings_TM`), una versión TM/TE lo importa sin aviso.
Si aparece, avisar cuando el archivo tiene bloques y el campo del bloque falta pero existe el común.
