# CLAUDE.md

Este archivo da contexto a Claude Code (claude.ai/code) para trabajar en este repositorio.

## Proyecto

Herramienta interna de Cemaco: convierte fotos de un mueble/rack de tienda, tomadas con telefono,
en un planograma editable. Alcance piloto: categoria Autos, tienda Cemaco Pradera. Ver
`ALCANCE_PROYECTO.md` para el alcance funcional completo, `MEMORIA_PROYECTO.md` para decisiones e
historia, `PENDIENTES_PROYECTO.md` para el backlog, y `REUNION_TECNICA.md` para la arquitectura
objetivo y el roadmap. La documentacion del proyecto y los textos de la UI estan en espanol;
mantener ese idioma al editarlos.

## Comandos

```bash
npm install
npm run dev       # servidor de desarrollo Vite en http://127.0.0.1:5173
npm run build     # build de produccion a dist/
npm run preview   # sirve el build localmente
```

No hay backend, no hay tests ni configuracion de lint por ahora. No hay configuracion de entorno —
todo corre del lado del navegador.

La captura de camara requiere HTTPS o localhost (restriccion de la API de Canvas/camara) — para
probar la captura desde un telefono en la misma red se necesita `vite --host` (ya es el default del
script `dev`) o un tunel.

## Arquitectura

App de React de una sola pagina, practicamente en un solo archivo: `src/main.jsx` (~1700 lineas)
contiene toda la UI — las cuatro vistas (Captura/Revision/Editor/Performance), sus subcomponentes y
la logica de deteccion/scoring. `src/styles.css` tiene todos los estilos (sin framework de CSS). No
hay router; el estado `activeView` de `App` cambia entre vistas.

**Pipeline de datos**: `src/data/realData.js` (generado, no editar a mano — ver el comentario en su
encabezado) es data estatica compilada desde dos Excel fuente en `data-fuente/`: `Autos.xlsx`
(productos, con referencias a imagenes VTEX) y `Consolidado accesorios de merchandising.xlsx`
(muebles). Exporta `products`, `fixtureTypes`, `categories`, `starterPlanogram`, `dataStats`, todos
importados directamente en `main.jsx`. Todavia no existe un paso de build que regenere este archivo
automaticamente — es una exportacion manual desde los Excel fuente.

**Vistas y que es real vs. simulado** (importante antes de cambiar comportamiento — ver la tabla de
estado en `INSTRUCTIONS.md` seccion 6):
- **Captura**: funcional. `getFixtureCapturePlan` decide el plan de fotos por mueble (rack corto = 1
  foto, rack largo = varios modulos/lados), y `analyzeCapturedPhoto` hace analisis real de pixeles
  en el navegador (resolucion, luz, contraste, estructura) para rechazar fotos que no sirven.
- **Revision**: simulado. `makeDetectionRows` / `getAgentCandidates` fabrican detecciones a partir
  del catalogo filtrado (similitud de categoria/marca), no del contenido real de la foto. Mantener
  visible la etiqueta de modo demo en la UI al tocar esta parte — el principio del proyecto es
  "nunca fingir que una deteccion es real cuando no lo es".
- **Editor**: funcional (correccion de sku/facings, busqueda, export JSON/CSV). "Guardar" no
  persiste en ningun lado — no hay backend/BD.
- **Performance**: completamente sintetico. `getProductPerformance` / `getPlanogramPerformance`
  derivan numeros falsos de ventas/inventario de forma deterministica a partir de un hash del sku
  (`skuSeed`), no de data real. Performance debe mantenerse aislado de Captura/Revision/Editor
  (principio explicito del proyecto) — no dejar que ventas/inventario se filtren a esas vistas.

**Planeado pero no implementado** (contexto, no algo que construir sin que lo pidan): n8n como
orquestador, un agente de vision real (Claude Vision) que reemplace la simulacion de Revision,
persistencia en Postgres, e integraciones de solo lectura con VTEX/Microsoft Fabric/Stibo STEP. Ver
`REUNION_TECNICA.md` para el diagrama de arquitectura objetivo y los gates del rollout.

## Deployment

Sitio estatico en DigitalOcean App Platform, con redeploy automatico en cada push a `main` (build
command `npm run build`, output dir `dist`). Es una SPA sin rutas del lado del servidor; si en algun
momento se agregan rutas, se necesita un catchall a `index.html`. La alternativa manual (subir
`dist/` a `jcddash.com/surtido`) esta documentada en `DEPLOY_SURTIDO.md`.

## Convenciones de trabajo especificas de este repo

- No editar `src/data/realData.js` a mano; regenerarlo desde los Excel fuente en `data-fuente/`.
- No mezclar cambios solo de documentacion con cambios funcionales en el mismo paso sin avisar
  (segun `MEMORIA_PROYECTO.md`) — estos archivos `.md` en espanol se usan activamente como memoria
  del proyecto entre sesiones/agentes.
- Toda comunicacion, documentacion y contenido relacionado a este proyecto se lleva en espanol.

---

## Backend (`back/`)

### Stack

- **Runtime**: Node.js (CommonJS)
- **Framework**: Express 5
- **Base de datos**: SQL Server
- **Query builder**: Knex (con driver `tedious`)
- **Variables de entorno**: cargadas exclusivamente en `back/src/config/env.js`; ese archivo es el
  unico punto de acceso a `process.env`. El resto del codigo importa las variables desde ahi, nunca
  lee `process.env` directamente.

### Principios de diseño

- **Arquitectura hexagonal**: el dominio (entidades, casos de uso) no depende de Express ni de MySQL.
  Los adaptadores (HTTP, base de datos) dependen del dominio, nunca al reves.
- **SOLID**: cada modulo tiene una responsabilidad unica; se prefiere composicion sobre herencia.
- **Clean Code**: funciones cortas y con nombre descriptivo; sin logica compleja inline en rutas.
- **Patron Repository**: toda consulta a la BD pasa por un repositorio; los casos de uso reciben
  el repositorio por inyeccion de dependencia.
- **Simplicidad sobre ingenieria de mas**: preferir la solucion directa antes que la rebuscada.
  Agregar abstracciones solo cuando el problema real las justifica.

### Comandos del backend

```bash
cd back
npm install
npm run dev      # nodemon index.js — recarga en caliente
npm start        # node index.js — produccion
```

### Convencion de carpetas del backend

Ver la propuesta aprobada de estructura de carpetas en `Arquitectura/ESTRUCTURA_BACKEND.md`.
Los modulos siguen la nomenclatura en espanol para mantener coherencia con el dominio del proyecto
(planogramas, gondolas, niveles, posiciones, etc.).

### Convencion de errores HTTP

- `400` validacion de request
- `401` no autenticado
- `403` sin permiso
- `404` recurso no encontrado
- `409` conflicto de estado (ej. gondola con posiciones al intentar eliminar)
- `422` entidad no procesable (ej. desborde de nivel sin flag de confirmacion)

Toda respuesta de error usa la forma `{ error: { code, message, details? } }`.
Toda respuesta paginada usa `{ data: [], total, page, pageSize }`.

### Pruebas Postman

Cada módulo del backend debe tener su carpeta equivalente de pruebas manuales en
`postman/planogramas-import.postman_collection.json` (único archivo editable a mano — el resto de
`postman/` es un espejo auto-generado por Postman Cloud, no tocar). Reglas de estructura, cobertura
mínima y repetibilidad de estas pruebas: ver
[Arquitectura/ESTANDAR_PRUEBAS_POSTMAN.md](Arquitectura/ESTANDAR_PRUEBAS_POSTMAN.md).

### Estado de los módulos

El orden de desarrollo sigue `Arquitectura/ENDPOINTS.md` y las carpetas de
`Arquitectura/Contratos/{NN}_{modulo}/` (01 a 11; el 12, sesiones de captura, queda fuera del MVP).

- **Implementado end-to-end (código + pruebas Postman)**: `planogramas` (01), `versiones` (02),
  `gondolas` (03) y `niveles` (04). Cada uno sigue el mismo patrón de 4 capas descrito abajo:
  `back/src/domain/{entidad}/`, `back/src/infrastructure/repositories/{entidad}.repository.js`,
  `back/src/application/{modulo}/{modulo}.controller.js` y
  `back/src/infrastructure/http/routes/{modulo}.routes.js`. `planogramas` sigue siendo la
  referencia más simple; `gondolas`/`niveles` muestran el patrón de entidad hija (listar/crear/
  reordenar cuelgan de la ruta del padre, ver comentarios en `gondolas.routes.js`).
- **Pendiente**: el resto de módulos de `back/src/infrastructure/http/routes/index.js` están
  comentados (`posiciones`, `accesorios`, `tiendas`, `jerarquia`, `catalog`, `sustituciones`,
  `exportacion`). El contrato de cada uno ya existe en `Arquitectura/Contratos/`; falta implementar
  código y pruebas. Siguiente en el orden: `posiciones` (05).
- Solo hay una migración (`001_esquema_inicial.js`) — antes de implementar un módulo nuevo, revisa
  si el esquema de esa migración ya cubre las tablas que necesita o si hace falta una migración
  adicional (`002_...`, ver convención de nombres en `ESTRUCTURA_BACKEND.md`).

### Método de trabajo para implementar un módulo nuevo

Flujo end-to-end para llevar un módulo de "contrato documentado" a "código + pruebas
funcionando", tomando `planogramas` como plantilla:

1. **Leer el contrato.** `Arquitectura/Contratos/{NN}_{modulo}/{ARCHIVO}.md` por endpoint —
   define request/response, reglas de negocio y tabla de códigos de error. `Arquitectura/ENDPOINTS.md`
   da el resumen de todos los endpoints del módulo y su caso de uso (`CU-XX-XX`, ver
   `Arquitectura/CASOS_DE_USO.md`).
2. **Verificar el esquema de BD.** Confirmar en `back/src/infrastructure/db/migrations/` que las
   tablas/columnas que el módulo necesita ya existen; si no, agregar una migración nueva siguiendo
   la convención `{NNN}_{descripcion_snake}.js`.
3. **Construir las 4 capas, de adentro hacia afuera**, respetando las reglas de dependencia de
   `Arquitectura/ESTRUCTURA_BACKEND.md` (dominio nunca importa de infraestructura ni Express):
   - `domain/{entidad}/{entidad}.entity.js` — reglas de negocio puras (transiciones de estado,
     validaciones), sin dependencias externas.
   - `domain/{entidad}/{entidad}.repository.js` — contrato/interfaz del repositorio (métodos que
     lanzan `No implementado`); es documentación ejecutable del contrato, no lógica real.
   - `domain/{entidad}/{entidad}.usecases.js` — un caso de uso por operación (crear, editar,
     listar, etc.), recibe el repositorio por inyección de dependencia, lanza errores con
     `err.status` + `err.code` (ver convención de errores HTTP arriba).
   - `infrastructure/repositories/{entidad}.repository.js` — implementación concreta con Knex
     contra SQL Server, mismo contrato que el archivo de dominio.
   - `application/{modulo}/{modulo}.controller.js` — valida el request con Joi, llama al usecase
     inyectando el repositorio de infraestructura, formatea la respuesta (`res.json` /
     `res.status(...).json`), delega errores a `next(err)`.
   - `infrastructure/http/routes/{modulo}.routes.js` — define las rutas Express y las conecta al
     controller; sin lógica.
   - Montar el router nuevo en `back/src/infrastructure/http/routes/index.js` (descomentar o
     agregar la línea `router.use('/{modulo}', require('./{modulo}.routes'));`).
4. **Agregar las pruebas Postman del módulo** en el mismo cambio, siguiendo
   [Arquitectura/ESTANDAR_PRUEBAS_POSTMAN.md](Arquitectura/ESTANDAR_PRUEBAS_POSTMAN.md): una carpeta
   por módulo, una sub-carpeta por endpoint, cobertura mínima de éxito + cada error implementado,
   fixtures dinámicos (`{{$timestamp}}`) o patrón `Setup - datos de prueba` para que la colección
   corra repetidamente sin edición manual. Validar el JSON de la colección antes de terminar
   (comando en la sección 1 de ese estándar).
5. **No mezclar** el cambio de código con cambios de documentación de proyecto (`.md` en español)
   sin avisar explícitamente — ver convención ya existente en este archivo y en
   `MEMORIA_PROYECTO.md`.
