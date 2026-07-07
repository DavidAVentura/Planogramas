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
