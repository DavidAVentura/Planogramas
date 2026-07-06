# Brief Tecnico — Reunion IT

Version presentable: https://claude.ai/code/artifact/df15d0eb-b13d-4d22-8d49-e3d0b04c66a0

Proyecto del trimestre Q3 2026. Salida antes de fin de septiembre 2026.
Piloto: categoria Autos, Cemaco Pradera.

- Demo: https://surtido-planogramas-6rewk.ondigitalocean.app
- Repo: jdaetzcemaco/surtido-planogramas

## 1. Como corre hoy

SPA React/Vite en DigitalOcean App Platform. Todo vive en el navegador; el catalogo va embebido en el build (generado de `Autos.xlsx` + imagenes VTEX). No hay backend todavia — es la pieza central del trimestre.

Flujo: telefono en tienda → app web (validacion de foto, propuesta, editor) → export JSON/CSV.

1. Seleccionar tienda, categoria y tipo de mueble.
2. Captura guiada: rack corto = 1 foto, rack largo = 2 modulos.
3. Validacion de calidad en el navegador (resolucion, luz, contraste, estructura de mueble).
4. Propuesta → revision → correccion → export.

## 2. Modulos y su estado real

| Modulo | Estado | Detalle |
|---|---|---|
| Captura | **Funcional** | Plan de fotos por mueble (>=180cm pide 2 modulos), analisis real de pixeles, rechaza fotos de producto individual, retake por modulo |
| Revision | **Simulado** | UI y flujo reales; las detecciones se generan del catalogo filtrado, no de la foto. Confianza y alternos por similitud categoria/marca |
| Editor | **Funcional** | Reasignar sku, facings, duplicar, busqueda por sku/GTIN/marca, export JSON/CSV. "Guardar" no persiste aun (falta BD) |
| Performance | **Datos demo** | Toda la data es sintetica (formula deterministica). El diseno ya refleja el dataset objetivo |

## 3. Arquitectura objetivo

```
App web  ⇄  n8n (orquestador: webhooks, credenciales, batch nocturno)  ⇄  Postgres
                          │
        ┌─────────────────┼──────────────────┬─────────────────┐
   Claude Vision      VTEX API          Microsoft Fabric    Stibo STEP
   (reconocimiento)   (credenciales ya  (ventas tienda      (dimensiones,
                       en mano)          via SQL endpoint)   jerarquia, GTIN)
```

El frontend nunca toca credenciales. Todas las integraciones son solo lectura, acotadas a Autos y Motos, batch nocturno.

## 4. Roadmap Q3

| Semanas | Entregable | Gate |
|---|---|---|
| 1–2 (jul) | Validacion en Pradera + envio de asks a IT | Flujo se entiende sin explicacion externa |
| 2–5 (jul–ago) | Backend minimo (n8n) + agente de vision real + Postgres | La propuesta reduce trabajo manual |
| 5–8 (ago) | VTEX + Fabric en produccion; Performance con datos reales | Cero datos sinteticos en Performance |
| 8–11 (ago–sep) | Stibo lectura + segundo piloto formal | Criterios de PENDIENTES cumplidos |
| 11–13 (sep) | Hardening: auth Entra ID, dominio, documentacion | Salida antes de fin de septiembre |

## 5. Asks por equipo

### Stibo STEP — Miguel Angel (pendiente)

- Cuenta de servicio (Basic Auth, no personal) con lectura sobre Products, Classifications y Assets — workspace `Main`, contexto `ES`.
- Base URL de la instancia + confirmacion de REST v2 habilitada; whitelist de IP de n8n si aplica.
- Sesion de 30 min para mapear attributeIds: sku, EAN/GTIN, marca, jerarquia de Autos, alto/ancho/profundidad, estado activo, asset de imagen frontal.
- Patron de consumo: solo GET, paginacion 100–200, batch nocturno.
- No se necesita: escritura, staging, background processes, Extension API.

### Microsoft Fabric — Jose Wirtz (pendiente)

- Opcion A (recomendada): vista `vw_planogramas_ventas_sku_tienda` (sku, tienda, fecha, unidades, monto, inventario) filtrada a Autos, ventana 90 dias + service principal de Entra ID read-only al SQL endpoint.
- Opcion B: export diario CSV/Parquet a blob de Azure con SAS token de lectura.
- Radar: registro de aplicacion Entra ID para SSO de la app antes de mostrar ventas reales.
- No se necesita: acceso al workspace completo ni a Power BI.

### VTEX — Juan (resuelto, credenciales en mano)

- Validar scopes del AppKey existente: `catalog`, `inventory`, `pricing`, `oms` (test de 10 min desde n8n; 403 = falta scope).
- Mapear `warehouseId` → tienda fisica (Pradera, Zona 10, Cayala, Peri-Roosevelt).

### Infraestructura — Juan / IT interno

- API key de Anthropic para el agente de vision (credencial de n8n, nunca frontend) + presupuesto del piloto.
- Postgres pequeno (DigitalOcean Managed / Supabase) para planogramas versionados y correcciones humanas.
- Autenticacion de la app antes de conectar ventas reales (URL hoy es publica).
- Decision de dominio final.

## 6. Riesgos

| Riesgo | Mitigacion |
|---|---|
| Accesos tardan mas que el desarrollo | Asks enviados semana 1. Orden VTEX → Fabric → Stibo: si Stibo se atora, VTEX cubre imagenes/precios/inventario |
| Precision del agente decepciona | Medicion con fotos reales en semana 3–4. Fallback: propuesta asistida por catalogo + correccion rapida |
| Confusion demo vs datos reales | Etiqueta "datos demo" en Performance hasta conectar Fabric. Revision ya separa modo demo del modo agente |
