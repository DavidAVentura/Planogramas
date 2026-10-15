# 04 — Implementación: Permisos CAO por perfil

Rama `feat/permisos-cao`, commit base `c3c97b9`. Sin commits. Sin `.env` ni migraciones.

## Tareas

| ID | Estado | Archivos |
|---|---|---|
| T1 | Completa | `back/src/domain/compartido/permisos.js`, `back/test/domain/permisos.test.js` |
| T2 | Completa | `back/src/infrastructure/cao/caoAuthClient.js` (sin `cao`, congelado, exporta `mapearUsuario`), `back/test/infrastructure/caoAuthClient.test.js` |
| T3 | Completa | `back/src/infrastructure/http/middlewares/autenticacion.js` (401 sin número de empleado) |
| T4 | Completa | `back/src/infrastructure/http/middlewares/autorizacion.js`, `back/test/http/autorizacion.test.js` |
| T5 | Completa | 18 `back/src/infrastructure/http/routes/*.routes.js` (todos menos `auth`) + comentario en `routes/index.js` |
| T6 | Completa | `back/src/application/auth/auth.controller.js`, `back/test/http/authSesion.test.js` |
| T7 | Completa | `back/test/http/rutasProtegidas.test.js` |
| T8 | Completa | `back/test/http/matrizPermisos.test.js` |
| T9 | Completa | `front/src/domain/permisos/permisos.ts` y `.test.ts`, `front/src/constants/navegacion.ts` |
| T10 | Completa | `front/src/types/usuario.ts`, `front/src/context/AuthContext.tsx` |
| T11 | Completa | `front/src/router/RequierePermiso.tsx`, `RedirigirInicio.tsx`, `routes.tsx`, `RequiereSesion.tsx`, `front/src/pages/SinAcceso/SinAcceso.tsx` |
| T12 | Completa | `AppTopbar.tsx`, `RoleSwitch.tsx`, `RoleSwitch.css` (`#fff` a `var(--bg-elevated)`), `front/.stylelintrc.json` (RoleSwitch.css fuera de la lista legacy) |
| T13 | Completa | `PlanogramasListado`, `PlanogramaDetalle`, `EditorPlanograma` (badge Solo lectura), `LienzoPlanograma`, `TiendasListado`, `AccesoriosListado`, `EstructuraAsignacion`, `SeleccionarVistaDisenoModal` (prop `puedeAbrirLienzo`), `VersionResumenModal` (prop `puedeAbrirLienzo`) |
| T14 | Completa | `front/src/utils/errors.ts`, `errors.test.ts` |
| T15 | Parcial (por indicación) | `postman/planogramas-import.postman_collection.json`: tests de `GET /auth/sesion` (PLA001–PLA010, `capacidades.analista`, sin `cao`/`token`) y nota en la descripción sobre `TOKEN_CAO`. Se omite `TOKEN_CAO_TIENDA` y su sub-carpeta (decisión de la aprobación 1) |
| T16 | No ejecutada (la hace el coordinador) | — |
| T17 | No ejecutada (solo al publicar) | `back/.env.example` sin tocar |

Además: `SesionRequerida` cambia "CemacoAllInOne" por "NOVA" (texto y botón), pedido en la aprobación 1.

## Verificación

- `cd back && npm test`: 62 pruebas, 62 OK (incluye permisos, caoAuthClient, autorizacion, authSesion, rutasProtegidas y matrizPermisos).
- `cd front && npm test`: 4 archivos, 21 pruebas OK. `npx tsc -b`: limpio. `npm run build`: OK.
- `npm run lint`: 26 errores y 444 advertencias, todos preexistentes (con los cambios en stash eran 26 y 445; baja una advertencia por quitar `#fff`). `RoleSwitch.css` pasa stylelint sin estar en la lista legacy.
- Postman: JSON válido (comando del estándar). No se corrió la colección contra DEV.
- Grep S-11 (nombres de perfil): solo `PERFILES` en `permisos.js`. Grep S-05: sin resultados. No queda `.cao` de usuario en back ni front.
- No hice la verificación manual en navegador ni la comprobación manual de T7 (quitar la regla a `DELETE /adjuntos/:id`).

## Desviaciones

- T7/T8: `matrizPermisos.test.js` sustituye por stubs `caoAuthClient`, `db/connection`, `catiClient` y `blobClient` en `require.cache`; fuera de la fase de requests los stubs devuelven el propio stub (no cuentan accesos), como pide el plan.
- T5: los comentarios `A transitoria` van en `router.use(requiereAnalista)` y, en `adjuntos`, `tiendas` y `versiones` (que no usan `router.use`), en un comentario único sobre el import en lugar de uno por ruta. Ese comentario cita `Arquitectura/SEGURIDAD_PERMISOS.md`, que crea T16.
- T13: `AccesoriosListado` usa `const { esAnalista: puedeEscribir } = useAuth()` y `EstructuraAsignacion` define `puedeEscribir` local a partir de `puede(...)` (props de componentes intactas, como pide el plan).
- Los archivos con fin de línea CRLF en la copia de trabajo conservaron CRLF; los que reescribí completos quedaron en LF (git los normaliza con `autocrlf`).

## Bloqueos

Ninguno.

## Deuda detectada

- `AppTopbar.css` conserva la clase `.app-topbar__nav-opcion--deshabilitada`, ya sin uso (archivo en la lista legacy de stylelint).
- La verificación manual de UI (modos, redirección con toast, `SinAcceso`, 403) queda pendiente para el usuario; no hay pruebas de componentes.
- Contratos/ENDPOINTS/ESTADO_MODULOS/DESPLIEGUE y DT-10…DT-16 quedan para T16 (coordinador).

## Correcciones ronda 1

- **I-1 / I-01** (`back/test/http/rutasProtegidas.test.js`): la prueba ahora calcula la protección por ruta. Un guard de router solo cuenta si es una capa `use` sin prefijo (`capa.slash === true`) con índice menor que el de la ruta; si no, la ruta necesita un guard propio. Se agregaron 3 casos negativos/positivos dentro de la suite con routers de prueba: guard al final (falla la detección), guard con prefijo `/sub` (falla) y guard válido previo o por ruta (pasa).
- **I-2**: `back/.env.example` → `CAO_COD_MODULO=PLANOGRAMA` (`back/.env` intacto).
- Verificación: `cd back && npm test` → 65 pruebas, 65 OK. No se tocó front. Menores sin corregir, según lo indicado.

## Correcciones ronda 3

- **Menor ronda 2 (S-06)**: comentario de orden de despliegue sobre `CAO_COD_MODULO` en `back/.env.example` (en Azure, cambiar el setting después de desplegar el código).
- **M-3**: eliminado el CSS muerto `.app-topbar__nav-opcion--deshabilitada` de `AppTopbar.css` (sin usos en `front/src`).
- **M-1**: `back/test/http/matrizPermisos.test.js`, el caso `'pasa'` ya no acepta 404 (ni 401/403).
- **M-01**: `caoAuthClient.js` mapea cada tienda a `{ cod_tienda, nombre, cod_tipo }` y congela cada elemento; nueva prueba en `caoAuthClient.test.js`.
- Verificación: `cd back && npm test` → 66 pruebas, 66 OK; `cd front && npx tsc -b` sin errores.
- **Hallazgo navegador**: `Autenticacion.tsx` usa `RUTA_INICIO = '/'` (antes `/planogramas`); `RedirigirInicio` resuelve la primera pantalla del modo activo y se evita el toast falso a usuarios de tienda. `consumirRutaDestino` puede devolver una ruta de otro modo; ahí el toast se mantiene.

## T16 — Documentación

Solo documentación; sin código ni commit.

**Archivos creados**: `Arquitectura/SEGURIDAD_PERMISOS.md`, `Arquitectura/Contratos/00_auth/GET_auth_sesion.md`.
**Archivos modificados**: `Arquitectura/ENDPOINTS.md` (columna `Permiso` en cada tabla y nota de autorización/403),
`Arquitectura/ESTADO_MODULOS.md` (apartado "Autorización"), `Arquitectura/DESPLIEGUE_AZURE.md` §6
(`CAO_COD_MODULO=PLANOGRAMA`, orden S-06 y checklist), `Arquitectura/DISENO_SISTEMA.md` §4.4 (sin permiso:
redirección + toast, texto del 403, un modo sin `RoleSwitch`, badge "Solo lectura" en la barra de acciones del
editor), `Arquitectura/DEUDA_TECNICA.md`, `CLAUDE.md` (solo la línea de deudas críticas/altas).

**IDs de deuda asignados** (el último existente era DT-09, DT-10…DT-16 libres como asumía el PLAN):
- DT-01 pasa a Parcial.
- DT-10 filtro por tienda (Alta) · DT-11 acciones con regla A, con la condición de cierre de M-03 (Media) ·
  DT-12 evidencias de cualquier tienda (Media) · DT-13 nombre `TIENDA-EST` (Baja) · DT-14 revocación 2 min (Baja) ·
  DT-15 timeout a CAO (Baja) · DT-16 body antes de autenticar (Baja).
- Nuevas: DT-17 errores de lectura como lista vacía, sin `isError` (Media, front) · DT-18 `AppTopbar` desborda a
  1024 px (Baja, front) · DT-19 Postman sin sub-carpeta de 403 con `TOKEN_CAO_TIENDA` (Baja).

**Diferencias PLAN vs código**: ninguna en la matriz endpoint → regla (verificada fila por fila contra
`routes/*.routes.js`). Matiz documentado: `pruebas.routes.js` solo se monta con `PRUEBAS_HABILITADAS`; el front
exige A también en el editor y A + PLA006 en el lienzo (igual que el PLAN). En `ENDPOINTS.md` los endpoints que el
inventario lista pero no existen en el código (sustituciones, exportación, sesiones de captura,
`validar-publicacion`, `capacidad`) llevan `—` en `Permiso`. La verificación de `matrizPermisos.test.js` se hizo
por lectura de su arranque y de las rutas, no se reejecutó (no se tocó código).
