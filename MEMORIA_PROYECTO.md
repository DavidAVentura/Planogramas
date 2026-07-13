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
