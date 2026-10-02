# Memoria Del Proyecto

## Contexto General

Este proyecto es un prototipo para Cemaco orientado a convertir fotos de racks o muebles en un planograma editable. El piloto esta enfocado en la categoria Autos y debe funcionar desde un telefono normal en tienda.

La idea surgio como "foto a planograma con IA", pero se ha ido aterrizando a un flujo mas creible:

- seleccionar contexto.
- capturar fotos guiadas.
- validar si la foto sirve.
- generar propuesta asistida.
- corregir manualmente.
- separar construccion del planograma de analisis comercial.

## Decisiones Tomadas

- El MVP es "foto a planograma", no auditoria completa.
- La app debe rechazar fotos que no parezcan rack/mueble.
- La demo no debe fingir reconocimiento real.
- Stibo queda como fuente futura; por ahora se usa catalogo disponible y VTEX.
- Performance debe estar separado de Captura, Revision y Editor.
- El comprador/merchant debe poder ver ventas e inventario, pero no durante la construccion basica.
- La toma de fotos debe ser guiada por tipo de mueble.
- En racks largos se deben tomar multiples fotos por modulo.
- El reconocimiento debe mostrar confianza y candidatos alternos.
- La etiqueta de precio puede ayudar, pero no debe ser la fuente principal de reconocimiento.
- Jerarquia de productos (2026-09-25): familia y categoria no se guardan en la tabla local `Producto`. En la vista `/productos` el filtro por jerarquia se resuelve en vivo: CATI devuelve los sku del nivel elegido y se cruzan con la tabla local. Asi no hay copias desactualizadas cuando la jerarquia cambia en CATI.
- La vista `/productos` lista solo los sku de la tabla local (los ya usados en alguna posicion), con cuantos planogramas los incluyen y como: planograma, cross o impulso.
- `Posicion.modo` admite `IMPULSO` (exhibicion de compra por impulso, ej. cajas) ademas de `PLANOGRAMA`, `CROSS` y `PENDIENTE`. Sin migracion: la columna es varchar(20) sin CHECK.
- Promocion a piloto (2026-10-02): se hace en Estructura (`/estructura?planogramaId=&versionId=&modo=promover`), no en un modal del detalle. Durante la promocion solo se edita esa version (su pincel y "Quitar") y al guardar se hace una sola llamada atomica a `POST /versiones/:id/promover` con las tiendas y el motivo. Se eliminaron `PromoverPilotoModal`, `TiendasAsignadasModal` y `TiendasSelector`; sumar o sacar tiendas piloto tambien se hace en Estructura (`&modo=piloto`).
- Tipo de tienda (2026-10-02): se permite asignar un piloto (y publicar) en tiendas de otro tipo que la version. El backend no valida tipo; el front muestra el aviso "tipo distinto". Se elimino la regla de "mismo tipo" del contrato de promover.
- Publicar (2026-10-02): el resultado es la union de las tiendas del piloto y las que montaban la publicada anterior del mismo tipo, sin repetir (una tienda monta una sola version por planograma). No se puede publicar un piloto sin tiendas (422). Se acepta `motivo` opcional para piloto y publicado, que queda en la edicion auditada.
- Simulacion de publicacion (2026-10-02): `GET /versiones/:id/publicacion/simular` no duplica logica: la publicacion real y la simulacion usan la misma funcion de solo lectura `calcularPlanPublicacion` (`version.repository.js`), asi que siempre coinciden. Responde 200 aun con errores bloqueantes para que `PublicarVersionModal` los muestre.
- Paleta (2026-10-02): se adopta la del prototipo de diseno. Versiones: TG rojo, TM morado, TE azul, especial naranja, piloto verde (antes TG indigo, TM verde, TE amarillo, piloto morado). Badge de estado: en desarrollo azul, piloto ambar, publicado verde. Tokens `--version-*` y `--estado-*` en `front/src/styles/tokens.css`.
- Sesion CAO (2026-10-02): despues de validar el JWT, el backend dispara sin esperar `POST {CAO_BASE_URL}/auth/keepalive` para renovar la sesion del usuario (ventana deslizante), maximo uno por token cada 60 s. Nunca bloquea ni hace fallar el request; si CAO responde 401 el token sale del cache de validacion.

## Estado Actual Del Prototipo

- App web en React/Vite.
- Deploy en DigitalOcean App Platform.
- Repo GitHub:
  - `jdaetzcemaco/surtido-planogramas`
- URL de prueba:
  - `https://surtido-planogramas-6rewk.ondigitalocean.app`
- Datos cargados desde archivos reales:
  - productos de Autos.
  - muebles/accesorios de merchandising.
- La app tiene tabs:
  - Captura.
  - Revision.
  - Editor.
  - Performance.
- Performance ya muestra data demo de ventas/ecommerce/inventario.
- Captura guiada por rack y agente simulado ya commiteados y desplegados.
- Agente real de vision implementado: workflow n8n (`n8n/planograma-vision-workflow.json`) + integracion frontend via `VITE_AGENT_WEBHOOK_URL`; falta importarlo en n8n y configurar la variable.
- Revision etiqueta honestamente: "Propuesta simulada" cuando no hay agente, "Realogram detectado" solo con respuesta real del agente.
- Probado en tienda (julio 2026): validacion de fotos funciono en condiciones reales; hallazgos en PENDIENTES_PROYECTO.md.

## Archivos Importantes

- `src/main.jsx`
  - flujo principal de la app.
  - captura.
  - revision.
  - editor.
  - performance.
- `src/styles.css`
  - estilos visuales y responsive.
- `src/data/realData.js`
  - productos, categorias, muebles y datos generados desde Excel.
- `DEPLOY_SURTIDO.md`
  - notas de deployment.
- `ALCANCE_PROYECTO.md`
  - alcance funcional.
- `PENDIENTES_PROYECTO.md`
  - backlog y proximos pasos.

## Conversaciones Y Criterios Relevantes

- Cemaco es mas parecido a Home Depot que a supermercado tradicional.
- La categoria piloto es Autos: pulidoras, accesorios, aceites, cuidado vehicular.
- La app debe usar la palabra `sku`.
- La demo debe sentirse real con datos de Cemaco, VTEX y muebles reales.
- El usuario quiere poder probarlo en tienda desde celular.
- Se busca eventualmente conectar:
  - Stibo.
  - VTEX.
  - BI/POS.
  - n8n.
- Stibo es vital a futuro para catalogo oficial, imagenes, dimensiones y jerarquia.
- Si Stibo es dificil, VTEX puede servir como fuente temporal para imagenes y datos ecommerce.

## Proxima Conversacion Sugerida

Antes de seguir desarrollando, revisar:

1. Si los cambios actuales de captura guiada ya estan commiteados y desplegados.
2. Si se hara prueba en Pradera con 2 o 3 muebles reales.
3. Si se quiere integrar un agente real de vision o mantener simulacion para la primera prueba.
4. Que datos de VTEX/BI se pueden obtener rapido via n8n.

## Nota Para Futuro Agente

No mezclar cambios de documentacion con cambios funcionales sin avisar. Actualmente pueden existir cambios pendientes en `src/main.jsx` y `src/styles.css` relacionados con captura guiada por rack y agente simulado.
