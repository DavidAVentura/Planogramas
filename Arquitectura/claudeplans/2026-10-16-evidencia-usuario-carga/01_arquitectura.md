# 01 — Arquitectura: registro de quién cargó evidencias y adjuntos (código de empleado y nombre)

- **Fecha**: 2026-10-16 · **Rama**: `feat/evidencia-usuario-carga` · **Base**: `aab40fc`
- **Módulos**: 17 Evidencias (`Arquitectura/Contratos/17_evidencias/`) y 13 Adjuntos
  (`Arquitectura/Contratos/13_adjuntos/`). Adjuntos entró al alcance con las respuestas del usuario.

## 1. Entendimiento

Cada foto de evidencia de implementación y cada adjunto de versión deben registrar quién los cargó,
con **código de empleado y nombre**, y mostrar ambos donde hoy aparece el autor. En las dos tablas,
`subido_por` ya guarda el **número de empleado** sin el nombre, y el front muestra solo ese número.
El nombre queda **fijo al momento de la carga** porque es un registro histórico.

Casos de uso: el módulo 17 no tiene `CU-XX` en `CASOS_DE_USO.md`. Lo más cercano es **CU-07**
(consulta para implementadores), donde se registran `CU-07-03 Subir evidencia de montaje`,
`CU-07-04 Consultar evidencia de montaje` y `CU-07-05 Quitar evidencia propia`. Adjuntos:
**CU-09** (adjuntos de versión de planograma), en sus casos de agregar, reemplazar y listar.

### Qué se guarda hoy como autor y de dónde sale

- Los controllers de los dos módulos pasan `usuarioActual(req)`, que resuelve
  `req.usuario.numeroEmpleado ?? usuario ?? id`.
- `caoAuthClient.mapearUsuario` (`back/src/infrastructure/cao/caoAuthClient.js:52-77`) toma de
  `validar_token` dos datos: **`user` = número de empleado** (`numeroEmpleado`) y
  **`username` = nombre completo** (`nombre`). **Confirmado por el usuario: el código de empleado es
  el `user` de CAO.**
- `middlewares/autenticacion.js:34` rechaza toda sesión sin `numeroEmpleado` (S-07), así que el
  código siempre está presente. El nombre puede faltar.
- **Evidencia** (`EvidenciaImplementacion.subido_por`, string 100): la escribe `agregarEvidencia`
  con el número. `puedeEliminar` compara contra ese número.
- **Adjunto** (`Adjunto.subido_por`, string 100, migración 009): lo escriben `agregarAdjunto` y
  también `reemplazarAdjunto`, con `userId ?? 'sistema'`. El reemplazo **sobrescribe** el autor: el
  registro refleja a quien subió el archivo vigente. El dominio no lo usa en ninguna regla de
  permiso. La respuesta sale de `mapAdjunto` en camelCase (`subidoPor`).
- Filas viejas: entre `7f6cf4d` y `8f38fa3` el valor podía ser el nombre completo, `sistema` o un
  fixture. **Decisión del usuario: las filas existentes se quedan sin nombre, sin relleno.**
- El patrón número + nombre ya existe en `EdicionAsignacion.usuario_numero/usuario_nombre`
  (migración 010), alimentado por `usuarioAuditoria(req)` en `application/compartido/validacion.js`.

## 2. Flujo de proceso

El proceso de negocio no cambia y no hay estados nuevos.
- **Evidencia**: el Implementador sube la foto (`EvidenciaModal`). El Analista la ve en
  `MontajeTiendaModal`. Solo quien la subió puede quitarla, y la comparación sigue siendo por
  **número**.
- **Adjunto**: el Analista agrega o reemplaza el archivo en 3 pasos (solicitar SAS → subir directo a
  Azure → confirmar). El autor se registra en el paso 3 (`POST`/`PUT` de confirmación). Al
  reemplazar se actualizan **código y nombre** con los de quien reemplaza, igual que hoy pasa con
  `subido_por`. El adjunto se ve en `UsarAdjuntos` y en `VersionResumenModal`.
- En los dos módulos la identidad sale **solo del token CAO**: el cliente nunca la envía y
  `validarConJoi` descarta los campos desconocidos con `stripUnknown`.

## 3. Impacto por capa

| Capa | Archivo / módulo | Tipo de cambio |
|---|---|---|
| BD | `back/src/infrastructure/db/migrations/018_autor_nombre_evidencia_adjunto.js` (nueva) | Columna `subido_por_nombre nvarchar(150) NULL` en `EvidenciaImplementacion` y en `Adjunto`, en una sola migración. Sin relleno |
| Dominio compartido | `back/src/domain/compartido/autor.js` (nuevo) | Función pura `normalizarAutor({ numero, nombre })` → `{ subido_por, subido_por_nombre }`: hace `trim`, recorta el nombre a 150, y deja `null` si el nombre viene vacío o es igual al número. La usan los dos módulos, para no duplicar la lógica |
| Dominio evidencia | `back/src/domain/evidencia/evidencia.usecases.js` | `agregarEvidencia(..., datos, autor)` recibe `{ numero, nombre }` y persiste lo que devuelve `normalizarAutor`. `formatearEvidencia` agrega `subido_por_nombre`. `listarEvidencias` y `eliminarEvidencia` siguen recibiendo el número como string. `puedeEliminar` no cambia |
| Dominio evidencia | `back/src/domain/evidencia/evidencia.repository.js` | JSDoc de `crear` con el campo nuevo |
| Dominio adjunto | `back/src/domain/adjunto/adjunto.usecases.js` | `agregarAdjunto` y `reemplazarAdjunto` reciben `autor` `{ numero, nombre }` en lugar de `userId`. Se quita el respaldo `'sistema'`: la autenticación garantiza el número |
| Dominio adjunto | `back/src/domain/adjunto/adjunto.repository.js` | JSDoc de `crear` y `actualizarArchivo` con el campo nuevo |
| Infraestructura | `back/src/infrastructure/repositories/evidencia.repository.js` | `mapEvidencia` agrega `subidoPorNombre` |
| Infraestructura | `back/src/infrastructure/repositories/adjunto.repository.js` | `mapAdjunto` agrega `subidoPorNombre`, que se expone tal cual en la respuesta |
| Infraestructura | `back/src/infrastructure/repositories/pruebas.repository.js` | El fixture `evidenciaIdDeOtroUsuario` lleva `subido_por_nombre` |
| Aplicación | `back/src/application/evidencias/evidencias.controller.js` | `agregar` usa `usuarioAuditoria(req)`. `listar` y `eliminar` no cambian |
| Aplicación | `back/src/application/adjuntos/adjuntos.controller.js` | `agregar` y `reemplazar` usan `usuarioAuditoria(req)` |
| Pruebas back | `back/test/domain/autor.test.js`, `back/test/domain/evidencia.test.js`, `back/test/domain/adjunto.test.js` (nuevas) | `normalizarAutor`; `agregarEvidencia`, `agregarAdjunto` y `reemplazarAdjunto` con repositorio y blob falsos (persisten número y nombre; el reemplazo los sobrescribe); `puedeEliminar` por número. `back/test/http/matrizPermisos.test.js` no cambia |
| Front | `front/src/types/evidencia.ts` | `subido_por_nombre: string \| null` |
| Front | `front/src/types/adjunto.ts` | `subidoPorNombre: string \| null` |
| Front | `front/src/utils/autorCarga.ts` (+ `.test.ts`) (nuevo) | `formatearAutor(numero, nombre)`, compartido por los dos módulos. El formato lo define UX |
| Front | `EvidenciaModal.tsx`, `MontajeTiendaModal.tsx`, `UsarAdjuntos.tsx:98`, `VersionResumenModal.tsx:205` (+ CSS si UX lo pide) | Mostrar el autor con nombre y código |
| Postman | `postman/planogramas-import.postman_collection.json`, carpeta 17 | Asserts de `subido_por_nombre` en el GET de la lista y en el POST |
| Docs | `Contratos/17_evidencias/*`, `Contratos/13_adjuntos/*`, `MODELO_DATOS_V3.mmd`, `ESTADO_MODULOS.md`, `CASOS_DE_USO.md`, tabla de migraciones de `CLAUDE.md` | Actualización en un commit de docs aparte |

No se tocan: `implementacion.repository.listarGondolasConEvidencias` (solo cuenta), Consolidado,
`agente-extractor` (no crea filas en `Adjunto`).

## 4. Contratos

Los dos cambios son **aditivos**: un campo nuevo en la respuesta, sin cambios en request, rutas ni
errores. Cada módulo conserva su convención de nombres (17 en snake_case, 13 en camelCase); no se
unifican aquí.

**Módulo 17 — Evidencias**

| Método | Ruta | Cambio |
|---|---|---|
| `GET` | `/tiendas/{tiendaId}/versiones/{versionId}/evidencias` | Cada elemento de `evidencias[]` agrega `subido_por_nombre: string \| null` |
| `POST` | `/tiendas/{tiendaId}/versiones/{versionId}/evidencias` | La respuesta 201 agrega `subido_por_nombre`. El request no acepta campos de autor |
| `GET` / `DELETE` | `/evidencias/{id}/descargar`, `/evidencias/{id}` | Sin cambio (`403 FORBIDDEN` si `subido_por` ≠ número del JWT) |

**Módulo 13 — Adjuntos**

| Método | Ruta (según `Contratos/13_adjuntos/`) | Cambio |
|---|---|---|
| `GET` | lista de adjuntos de la versión (`GET_adjuntos_lista.md`) | Cada adjunto agrega `subidoPorNombre: string \| null` |
| `POST` | confirmación de alta (`POST_adjuntos_agregar.md`) | La respuesta agrega `subidoPorNombre` con el nombre de CAO |
| `PUT` | confirmación de reemplazo (`PUT_adjuntos_reemplazar.md`) | `subidoPor` y `subidoPorNombre` pasan a ser los de quien reemplaza |
| Resto | solicitar subida, URL de descarga, eliminar | Sin cambio |

Ejemplos:

```json
{ "id": 12, "subido_por": "10234", "subido_por_nombre": "JUAN LÓPEZ", "puedeEliminar": true, "...": "..." }
{ "id": 7,  "subidoPor": "10234",  "subidoPorNombre": "JUAN LÓPEZ", "...": "..." }
```

Correcciones de documentación: `17_evidencias/README.md` dice `req.usuario.usuario` (debe decir
`numeroEmpleado`, el `user` de CAO) y los ejemplos usan `"jlopez"`. En `13_adjuntos`, los ejemplos
usan `"sistema"` y `"usuario@cemaco.com"`; deben mostrar un número de empleado y quitar el respaldo
`sistema`.

## 5. Datos

- **Una sola migración, `018_autor_nombre_evidencia_adjunto.js`** (siguiente número libre; la
  última es `017_indices_consolidado.js`). Agrega `subido_por_nombre nvarchar(150) NULL` a
  `EvidenciaImplementacion` y a `Adjunto`. Es idempotente (`hasColumn` por tabla) y el `down`
  elimina las dos columnas. Se usa `nvarchar` por las tildes y la ñ. El cambio es atómico y del
  mismo concepto, así que una sola migración resulta más simple que dos.
- **Sin relleno** (decisión del usuario): las filas existentes quedan con `NULL` y el front muestra
  solo el código. Las filas cuyo `subido_por` no es un número (nombre completo, `sistema`, fixtures)
  quedan como están.
- **Retrocompatible**: la columna es nullable y `subido_por` no cambia de semántica ni de tamaño.
- **Sin índices nuevos**: no se filtra ni se ordena por autor.
- **PROD**: por DT-08, la 018 no se aplica en PROD hasta verificar el estado de las migraciones.
  Se anota como pendiente en la tabla de `CLAUDE.md`.

## 6. Rendimiento y escalabilidad

No hay impacto. Es una columna más en `SELECT` ya acotados (evidencias por tienda + versión,
adjuntos por versión: decenas de filas), sin joins ni N+1. El nombre se persiste al cargar y no se
consulta a CAO en cada lectura. La migración solo agrega columnas y no recorre datos.

## 7. Alternativas descartadas y decisión

- Renombrar a `subido_por_numero` + `subido_por_nombre`: rompe contratos, `puedeEliminar`, Postman y
  fixtures sin aportar valor.
- Resolver el nombre al leer, consultando CAO o CATI: no existe un directorio de usuarios, sumaría
  latencia y contradice que el nombre quede fijo.
- Responder con un objeto `subido_por: { numero, nombre }`: no es compatible con el front actual.
- Concatenar el nombre dentro de `subido_por`: mezcla identidad con presentación y rompe la
  comparación de `puedeEliminar`.
- Dos migraciones, una por tabla: más archivos para un cambio del mismo concepto.
- Rellenar desde `EdicionAsignacion`: el usuario decidió no hacerlo.

**Decisión**: se agrega `subido_por_nombre nvarchar(150) NULL` a `EvidenciaImplementacion` y a
`Adjunto` en la migración 018. `subido_por` sigue siendo el número de empleado (el `user` de CAO).
Al cargar o reemplazar, el nombre (`username` de CAO) se toma con `usuarioAuditoria(req)`, se
normaliza con `domain/compartido/autor.js` y queda fijo. Se expone como campo aditivo:
`subido_por_nombre` en el módulo 17 y `subidoPorNombre` en el 13.

## 8. Preguntas abiertas

Todas están resueltas (ver "Preguntas resueltas" en `00_solicitud.md`).

| Pregunta | Resolución |
|---|---|
| ¿Rellenar el nombre en las evidencias existentes? | No. Quedan sin nombre y muestran solo el código |
| ¿El código de empleado es el `user` de CAO? | Sí |
| ¿Aplica también a Adjuntos (13)? | Sí, con el mismo registro de código y nombre en `Adjunto` |
| ¿El nombre queda fijo al momento de la carga? | Sí, es un registro histórico |

## 9. Para UX y para Seguridad

**UX**
1. Formato único del autor (nombre y `#código`) para los cuatro puntos de la UI: pie de
   `EvidenciaModal`, miniatura y visor de `MontajeTiendaModal`, línea de `UsarAdjuntos` y de
   `VersionResumenModal`.
2. Qué mostrar cuando el nombre es `null` (registros viejos): solo el código, sin un texto que
   parezca un error.
3. Nombres de hasta 150 caracteres en pies y líneas estrechas: truncado con `title` y comportamiento
   en móvil.
4. Mayúsculas: CAO puede mandar el nombre en mayúsculas. Definir si se muestra tal cual o en tipo
   título.
5. En adjuntos reemplazados, el autor es quien hizo el último reemplazo. Definir si el texto lo
   aclara ("Reemplazado por…").

**Seguridad**
1. La identidad sale solo de `req.usuario`. Confirmar que ningún body (evidencias, adjuntos
   agregar/reemplazar) puede inyectar `subido_por` ni `subido_por_nombre`.
2. Exposición de datos personales: el nombre completo se suma al número en las respuestas. Con
   DT-12 y DT-10 abiertas, un usuario de tienda puede ver nombres de empleados de otras tiendas.
   Evaluar si es aceptable.
3. Normalización del nombre en el dominio (recorte, `trim`, caracteres de control) y render solo
   como texto en React.
4. `puedeEliminar` de evidencias sigue comparando por número de empleado, nunca por nombre.
5. No registrar el nombre en los logs; solo el número, como en el resto del backend.

## 10. Deuda detectada

- **Nueva, Media (datos/back)**: filas heredadas de `EvidenciaImplementacion` y `Adjunto` con un
  `subido_por` que no es número de empleado (nombre completo, `sistema`, fixtures). No se pueden
  atribuir, y en evidencias nadie las puede eliminar. Se aceptan por decisión del usuario (sin
  relleno); se registran para una limpieza posterior.
- **Nueva, Baja (back)**: `usuarioActual` todavía cae a `usuario`, `id` o `'sistema'` aunque el
  middleware garantiza `numeroEmpleado`. Este cambio elimina el respaldo `'sistema'` en adjuntos,
  pero el helper sigue igual.
- **Nueva, Baja (docs)**: el módulo 17 no tiene casos de uso y sus contratos documentan
  `req.usuario.usuario`. Se corrige en este cambio.
- **Relacionadas abiertas**: **DT-07** (adjuntos sin carpeta Postman): queda fuera de alcance porque
  el alta de adjuntos sube el archivo directo a Azure con SAS, lo que no es repetible en Postman, y
  la cobertura del campo nuevo en adjuntos queda en las pruebas de dominio. **DT-12/DT-10** aumentan
  el impacto de exponer el nombre. **DT-08** condiciona aplicar la 018 en PROD.
