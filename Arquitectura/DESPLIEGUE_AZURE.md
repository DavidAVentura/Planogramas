# Despliegue a Azure (dev y prod)

Guía operativa para publicar cambios. Está escrita para que cualquier agente o persona pueda
llevar un cambio a **dev** o a **prod** siguiendo solo este archivo.

## 1. Modelo: dos repos, un solo flujo

| Remoto git | Repo en GitHub | Rol |
|---|---|---|
| `origin` | `jdaetzcemaco/surtido-planogramas` | **Desarrollo.** Aquí se hacen todos los commits y merges. |
| `fork` | `DavidAVentura/Planogramas` | **Publicación.** Es el repo oficial mientras no exista un repo de organización. Solo recibe copias exactas de las ramas de `origin`, y sus GitHub Actions despliegan a Azure. |

**Regla de oro: el fork nunca tiene commits propios.** `fork/develop` y `fork/main` son siempre
copias de `origin/develop` y `origin/main`. Publicar = empujar la rama de `origin` al fork, sin
merge, sin ramas intermedias y **nunca con `--force`**.

```
origin (desarrollo)                             fork (publicación)
feature/xxx ─merge─▶ develop ── push ──▶ develop ──(GitHub Actions)──▶ Azure DEV
                        │
                        └─ff─▶ main ──── push ──▶ main ─────(GitHub Actions)──▶ Azure PROD
```

| Rama | Ambiente | Workflow (`.github/workflows/`) | Recurso de Azure |
|---|---|---|---|
| `develop` | DEV | `develop_planogramas-api-dev.yml` | App Service `planogramas-api-dev` (carpeta `back/`) |
| `develop` | DEV | `develop_planogramas-front-dev.yml` | Static Web App de DEV (carpeta `front/`) |
| `main` | PROD | `main_planogramas-api-prod.yml` | App Service `planogramas-api-prod` (carpeta `back/`) |
| `main` | PROD | `main_planogramas-front-prod.yml` | Static Web App de prod (`agreeable-forest-0c6b1160f.6.azurestaticapps.net`) |

Los cuatro workflows viven en **todas** las ramas. Cada uno filtra por su rama (`on: push:
branches`) y tiene el candado `if: github.repository == 'DavidAVentura/Planogramas'`, así que en
`origin` no se ejecutan. Para agregar o editar un workflow se hace en `develop` de `origin` y se
promueve como cualquier otro cambio, nunca editándolo solo en el fork o solo en una rama.

## 2. Preparación (una vez por clon)

```bash
git remote -v
# Debe listar origin y fork. Si falta fork:
git remote add fork https://github.com/DavidAVentura/Planogramas.git
```

Las ramas locales `develop` y `main` siguen a `origin` (`git branch -vv`). No se crea ninguna
rama local que siga al fork. La antigua rama `deploy-fork` ya se eliminó y no se debe recrear.

## 3. Publicar a DEV

Solo cuando el usuario lo pida.

```bash
# 1. El cambio ya está commiteado en develop (directo o por merge de una rama feature/...).
git checkout develop
git pull --ff-only origin develop
git push origin develop

# 2. Publicar: copia exacta de origin/develop en fork/develop.
git fetch origin
git push fork origin/develop:refs/heads/develop

# 3. Verificar que quedaron iguales (mismo SHA).
git fetch fork
git rev-parse --short origin/develop fork/develop
```

## 4. Publicar a PROD

Solo cuando el usuario lo pida **explícitamente para prod**. Prod siempre sale de lo que ya está en
`develop`; lo normal es haberlo publicado y probado en DEV antes.

```bash
# 1. Promover develop → main en origin (fast-forward: main queda idéntica a develop).
git checkout main
git pull --ff-only origin main
git merge --ff-only develop
git push origin main

# 2. Publicar: copia exacta de origin/main en fork/main.
git fetch origin
git push fork origin/main:refs/heads/main

# 3. Verificar y regresar a develop.
git fetch fork
git rev-parse --short origin/main fork/main
git checkout develop
```

Si `git merge --ff-only develop` falla, `main` tiene commits que `develop` no tiene (alguien
commiteó directo en `main`). Hay que hacer merge de `main` en `develop`, publicar `develop` y
repetir el paso 1. No se resuelve con un merge en sentido contrario ni con `--force`.

Si en el futuro se instala la CLI `gh`, el paso 1 puede hacerse como PR `develop` → `main` en
`origin`. El paso 2 es igual.

### Migraciones en PROD

Los workflows no migran. Las migraciones de PROD se aplican a mano desde `back/`, con la conexión
en `back/conexion.prod.json`. Ese archivo está en `.gitignore` y no se versiona: se crea copiando
`back/conexion.prod.example.json` y lo llena quien migra. El `.env` local sigue apuntando a DEV.

```bash
cd back
npm run migrate:prod:status   # imprime el destino (host / BD) y el estado; revisar las pendientes
npm run migrate:prod          # aplica las pendientes en PROD
```

Antes de aplicar, confirmar que el destino impreso es `db-planogramas` y que las pendientes son las
esperadas. Después, actualizar la fila de PROD en la tabla de migraciones de `CLAUDE.md`.

### Migración de datos DEV → PROD (2026-10-16)

Deja `db-planogramas` idéntica a `OTB` en las 17 tablas de la app (mismos IDs) y copia los blobs
referenciados de `adjuntos-dev` a `adjuntos` (misma cuenta `planogramasstorage`). Es un script de un
solo uso en `back/scripts/migracion-dev-prod/` (retirarlo cuando PROD esté estable, DT-69). Corre desde
`back/` con `conexion.prod.json` (login de administración) y el `.env` local (DEV y Storage). Lee DEV
completo, cierra su conexión y escribe en PROD en **una sola transacción**: commit solo si conteos,
hashes por tabla, `IDENT_CURRENT`, FKs y URLs de blobs cuadran. Nunca imprime credenciales.

| Modo | Comando (desde `back/`) | Efecto |
|---|---|---|
| Simulacro (default) | `npm run migrar:dev-a-prod` | Todo el proceso y **ROLLBACK** siempre. |
| Solo blobs | `npm run migrar:dev-a-prod -- --solo-blobs --ejecutar --confirmar=db-planogramas` | Copia blobs (idempotente) y verifica destino; no abre transacción. |
| Ejecución real | `npm run migrar:dev-a-prod -- --ejecutar --confirmar=db-planogramas [--forzar-vaciado]` | Blobs, luego carga y **COMMIT** si todo cuadra. |
| Verificar | `npm run migrar:dev-a-prod -- --verificar` | Solo lectura: compara DEV y PROD. |

Salida `0` si terminó y cuadra; `1` en cualquier otro caso. Sin `--forzar-vaciado` el script aborta si
PROD tiene algo más que los fixtures (Tienda id 1 `T004`, Accesorio id 1 `G-12-FIXTURE`). Los
valores de identity no son transaccionales: tras el simulacro, PROD puede quedar con el identity en
los valores de DEV; el informe muestra `IDENT PROD antes/después`. Ctrl+C solo marca la interrupción:
el script se detiene en el siguiente punto seguro y revierte; si cayó durante el COMMIT, ejecutar
`--verificar`.

Checklist (solo tras aprobación del usuario):

1. **O1** Portal: `planogramas-api-prod` con `NODE_ENV=production`, sin `PRUEBAS_HABILITADAS=true`,
   `AZURE_STORAGE_CONTAINER_ADJUNTOS=adjuntos` en `planogramasstorage`. `conexion.prod.json` con el
   login de administración. Confirmar que nadie edita DEV durante la ventana.
2. **O2** `npm run migrate:prod` (aplica `018`) y `npm run migrate:prod:status`: sin pendientes.
3. **O3** Confirmar en el portal el punto de restauración (PITR) de `db-planogramas` **y de `OTB`**,
   anotar la hora UTC y detener el App Service `planogramas-api-prod`.
4. **O4** `--solo-blobs --ejecutar --confirmar=db-planogramas`: 91 blobs copiados o ya idénticos, 0 faltantes.
5. **O5** Simulacro: esquema idéntico, solo se borran fixtures, hashes iguales, FKs confiables, `ROLLBACK`.
6. **O6** Ejecución real: `COMMIT` y salida 0. Si falla, no reintentar a ciegas; si el commit es dudoso, O7.
7. **O7** `--verificar` ("Todas las tablas cuadran"), iniciar el App Service y probar en PROD un
   planograma, un adjunto y una evidencia. Actualizar la tabla de migraciones de `CLAUDE.md` (PROD → `018`).

Vuelta atrás: restaurar `db-planogramas` con PITR a la hora anotada (crea una BD nueva: renombrarla o
cambiar la cadena de conexión del App Service), o volver a correr con `--forzar-vaciado`. Los blobs
de `adjuntos-dev` no se tocan.

Puntos de restauración (UTC): `db-planogramas` ____ · `OTB` ____

## 5. Verificar el despliegue

- Ejecuciones: https://github.com/DavidAVentura/Planogramas/actions
- Qué dispara cada workflow:
  - `develop_planogramas-api-dev.yml`: push a `develop` que toque `back/**` o el propio workflow.
  - `develop_planogramas-front-dev.yml`: push a `develop` que toque `front/**` o el propio workflow.
  - `main_planogramas-front-prod.yml`: push a `main` que toque `front/**` o el propio workflow.
  - `main_planogramas-api-prod.yml`: **cualquier** push a `main` (no tiene filtro de rutas).
- Si un push no toca la carpeta de un workflow, ese workflow no se ejecuta; eso es normal.
- Todos admiten `workflow_dispatch`: para relanzar un despliegue sin commit nuevo, usar
  "Run workflow" en la pestaña Actions del fork.

## 6. Configuración por ambiente

### Backend (App Service → Configuración → Variables de entorno)

Se leen en `back/src/config/env.js` (único punto de acceso a `process.env`). Cambiar una variable
reinicia la app y no requiere redeploy.

| Variable | Notas |
|---|---|
| `NODE_ENV` | `production` en prod, `development` en dev. Con `development` los errores 500 devuelven `details` con el mensaje interno; nunca usar ese valor en prod. No usar `prod`: Express y las librerías solo reconocen `production`. |
| `PORT` | La asigna Azure; no configurarla. |
| `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_SCHEMA`, `DB_ENCRYPT`, `DB_TRUST_SERVER_CERTIFICATE` | SQL Server del ambiente. |
| `CORS_ORIGIN` | URL del Static Web App del mismo ambiente. |
| `JWT_TENANT_ID`, `JWT_AUDIENCE` | Entra ID. |
| `CAO_BASE_URL`, `CAO_COD_MODULO` | Validación del token de usuario (CAO, `/auth/validar_token`) y renovación de su sesión (`/auth/keepalive`). `CAO_COD_MODULO` debe ser `PLANOGRAMA` (de él salen los permisos PLA001–PLA010); ver el orden obligatorio abajo. |
| `CATI_BASE_URL`, `CATI_API_KEY` | Catálogo y jerarquía. |
| `OPENIA_TOKEN`, `OPENAI_MODEL` | Agentes de `back/src/agents/`. |
| `AZURE_STORAGE_CONNECTION_STRING`, `AZURE_STORAGE_CONTAINER_ADJUNTOS` | Adjuntos en Azure Blob. La connection string debe incluir `AccountKey`: con ella el backend firma las URLs SAS de subida y descarga de adjuntos. |
| `PRUEBAS_HABILITADAS` | `true` solo en DEV: monta `/pruebas/fixtures` y `/pruebas/limpieza` para la colección Postman. En prod no se define (y con `NODE_ENV=production` no se monta aunque esté). |

### `CAO_COD_MODULO=PLANOGRAMA`: orden obligatorio (S-06)

**Primero el código, después el setting; nunca al revés.** Con el código viejo y `PLANOGRAMA`, un
usuario de tienda tendría escritura total; con el código nuevo y el valor anterior (`SCRAPING`)
todos reciben 403 (falla cerrado, es seguro). Pasos por ambiente (DEV primero; PROD solo si el
usuario lo pide):

1. Publicar el código (sección 3 o 4) y esperar que los workflows del API y del Static Web App
   terminen en verde.
2. **Recién entonces**: App Service (`planogramas-api-dev` o `planogramas-api-prod`) → Variables de
   entorno → `CAO_COD_MODULO=PLANOGRAMA` → guardar (reinicia la app).
3. Checklist en el ambiente:
   - [ ] Usuario PCOMER-EST o CATEGORIA-EST: `GET /auth/sesion` con PLA001–PLA010,
     `capacidades.analista: true`, sin `cao`; ningún código `SCP*` en `permisos`.
   - [ ] La app abre en Planogramas con el switch de modo; crear y editar funciona.
   - [ ] Usuario sin perfil en PLANOGRAMA: anotar si CAO responde `200` con `perfiles: []`
     (se ve `SinAcceso`) o `401` (se ve `SesionRequerida`, sin bucle) en `SEGURIDAD_PERMISOS.md`.
   - [ ] Si hay usuario de tienda: navbar Mi tienda/Productos, sin switch; `/planogramas` por URL redirige con toast.
   - [ ] Corrida Postman completa en verde.
   - [ ] En el log stream, los `[autorizacion] 403` no muestran tokens.

Matrices y reglas en `Arquitectura/SEGURIDAD_PERMISOS.md`.

### Azure Blob Storage: CORS para adjuntos

Los adjuntos se suben con un `PUT` directo del navegador a Azure Blob, usando una URL SAS que firma
el backend. Sin CORS en la cuenta de storage, el navegador bloquea la subida (el front muestra "No
se pudo subir el archivo"). Abrir o descargar un adjunto es navegación normal y no necesita CORS,
pero **"Utilizar adjuntos"** (modales de Excel de productos y PDF Planograma) baja el archivo con un
`GET` vía `fetch` para reusarlo como entrada, y ese sí lo necesita (sin él, el front muestra "No se
pudo descargar el adjunto").

Configurarlo una vez en la cuenta (Portal → cuenta de storage → Configuración → Uso compartido de
recursos (CORS) → Blob service), con una regla que incluya los orígenes de los dos Static Web Apps
y el de desarrollo local:

| Campo | Valor |
|---|---|
| Orígenes permitidos | URL del Static Web App de DEV, URL del de PROD, `http://localhost:5173` |
| Métodos permitidos | `GET`, `PUT`, `OPTIONS` |
| Encabezados permitidos | `*` |
| Encabezados expuestos | `*` |
| Antigüedad máxima | `3600` |

Equivalente con Azure CLI:

```bash
az storage cors add --services b --methods GET PUT OPTIONS \
  --origins "https://<swa-dev>" "https://<swa-prod>" "http://localhost:5173" \
  --allowed-headers "*" --exposed-headers "*" --max-age 3600 \
  --account-name <cuenta-storage>
```

### Frontend (GitHub del fork → Settings → Secrets and variables → Actions)

Las variables `VITE_*` se incrustan al compilar, así que un cambio **requiere volver a ejecutar el
workflow** del front (`workflow_dispatch`).

| Ambiente | Secret | Variables |
|---|---|---|
| DEV | `AZURE_STATIC_WEB_APPS_API_TOKEN_DEV` | `VITE_API_URL_DEV`, `VITE_N8N_VISION_WEBHOOK_URL` |
| PROD | `AZURE_STATIC_WEB_APPS_API_TOKEN` | `VITE_API_URL`, `VITE_N8N_VISION_WEBHOOK_URL` |

Los workflows del backend se autentican en Azure con OIDC (secrets `AZUREAPPSERVICE_*`). La
identidad necesita una credencial federada por rama (`refs/heads/develop` y `refs/heads/main`).

## 7. Lo que nunca se hace

- `git push --force` al fork o a `origin`.
- Commits, merges o ediciones directas en el fork (incluida la edición de workflows desde la web
  de GitHub).
- Ramas puente tipo `deploy-fork`.
- Un workflow presente solo en `develop` o solo en `main`.
- Publicar a prod sin que el usuario lo pida explícitamente.

## 8. Retirado

- **DigitalOcean App Platform** y la publicación manual en `jcddash.com/surtido`
  (`DEPLOY_SURTIDO.md`) eran del prototipo conceptual y ya no se usan. Las menciones en otros
  documentos (`INSTRUCTIONS.md`, `DEPLOY_SURTIDO.md`) son históricas.

## 9. Futuro

Cuando exista el repo de la organización de Cemaco en GitHub, ese repo reemplaza a `origin` y al
fork: se desarrolla y se publica en el mismo repo, los workflows migran tal cual cambiando el
nombre del candado `github.repository`, y se reconfiguran secrets, variables y credenciales
federadas.
