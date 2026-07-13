# Instrucciones — Surtido Planogramas (Foto a Planograma con IA)

Herramienta web de Cemaco para armar planogramas desde fotos tomadas con un telefono en tienda.
Piloto: categoria Autos, Cemaco Pradera. Proyecto del trimestre Q3 2026.

- Demo actual: https://surtido-planogramas-6rewk.ondigitalocean.app
- Repo original: https://github.com/jdaetzcemaco/surtido-planogramas
- Contacto: Juan Daetz (juan.daetz@cemaco.com)

---

## 1. Requisitos

- Node.js 18 o superior (probado con npm)
- Navegador moderno (la validacion de fotos usa Canvas API)
- No requiere backend ni base de datos; sin configurar nada la propuesta es simulada
- Opcional: `VITE_AGENT_WEBHOOK_URL` conecta el agente real de vision (ver seccion 8)

## 2. Levantar el proyecto en local

```bash
npm install
npm run dev
```

Abre `http://127.0.0.1:5173`. Para probar la captura con camara desde un telefono en la misma red, usar `vite --host` o un tunel (la camara requiere HTTPS o localhost).

Otros comandos:

```bash
npm run build     # genera dist/ para produccion
npm run preview   # sirve el build localmente
```

## 3. Crear el repositorio desde este zip

```bash
unzip surtido-planogramas.zip -d surtido-planogramas
cd surtido-planogramas
git init
git add .
git commit -m "Initial import: surtido planogramas prototype"
git remote add origin <URL-del-repo-nuevo>
git push -u origin main
```

El zip NO incluye `node_modules/`, `dist/` ni el historial `.git` (el historial completo vive en el repo original de GitHub; si se quiere conservar, hacer fork o `git clone --mirror` en lugar de partir del zip).

## 4. Estructura del proyecto

```
├── index.html               Entry point de Vite
├── vite.config.js           Config minima de Vite + React
├── package.json             Scripts y dependencias (react, lucide-react)
├── src/
│   ├── main.jsx             TODA la app: vistas Captura, Revision, Editor y Performance
│   ├── styles.css           Estilos y responsive
│   └── data/
│       └── realData.js      Catalogo generado desde Autos.xlsx + muebles del consolidado.
│                            NO editar a mano; se regenera desde los Excel fuente.
├── data-fuente/
│   ├── Autos.xlsx           Excel fuente de productos (base de realData.js)
│   └── Consolidado accesorios de merchandising.xlsx   Excel fuente de muebles
├── ALCANCE_PROYECTO.md      Alcance funcional del MVP
├── MEMORIA_PROYECTO.md      Contexto, decisiones tomadas y estado
├── PENDIENTES_PROYECTO.md   Backlog priorizado y criterios de salida
├── REUNION_TECNICA.md       Brief tecnico: arquitectura objetivo, roadmap Q3, asks por equipo
├── DEPLOY_SURTIDO.md        Notas de publicacion manual en jcddash.com/surtido
└── *.png                    Capturas de referencia del prototipo
```

## 5. Deploy

**DigitalOcean App Platform (actual):** app estatica conectada al repo de GitHub con
redeploy automatico en cada push a `main`.

- Build command: `npm run build`
- Output directory: `dist`
- Es una SPA sin rutas de servidor; si se agregan rutas, configurar catchall a `index.html`.

**Alternativa manual:** ver `DEPLOY_SURTIDO.md` (subir `dist/` a la carpeta publica del servidor).

## 6. Estado real del prototipo (importante para quien lo tome)

| Modulo | Estado |
|---|---|
| Captura | Funcional: captura guiada por mueble (rack largo = 2 modulos) y validacion real de imagen en navegador (resolucion, luz, contraste, estructura) |
| Revision | Simulado por defecto (etiquetado "Propuesta simulada"); con `VITE_AGENT_WEBHOOK_URL` configurado llama al agente real de vision via n8n y etiqueta "Realogram detectado" |
| Editor | Funcional: correccion de sku/facings, busqueda, export JSON/CSV. "Guardar" no persiste (no hay BD) |
| Performance | Datos demo: toda la data de ventas/inventario es sintetica (formula deterministica sobre el sku) |

No hay backend. Las siguientes piezas del trimestre (ver `REUNION_TECNICA.md`):
n8n como orquestador, agente de vision real (Claude Vision API), Postgres para
persistencia, e integraciones de solo lectura con VTEX, Microsoft Fabric y Stibo STEP.

## 7. Regenerar el catalogo

`src/data/realData.js` se genero desde los Excel fuente incluidos en `data-fuente/`:
`Autos.xlsx` (productos, con imagenes VTEX) y `Consolidado accesorios de merchandising.xlsx`
(muebles). El plan es reemplazar esta generacion estatica por un batch nocturno de n8n
contra VTEX/Stibo que produzca un JSON consumido por la app.

## 8. Agente de vision (n8n + Claude)

El agente real vive en n8n: la app manda las fotos (reescaladas a 1568px) con el
contexto y el catalogo filtrado a un webhook; n8n llama al API de Anthropic con
salida estructurada y devuelve el realogram.

Pasos para activarlo:

1. Importar `n8n/planograma-vision-workflow.json` en n8n.
2. Crear una credencial **Header Auth** llamada `Anthropic API Key` con
   Name = `x-api-key` y Value = la API key de Anthropic. Asignarla al nodo
   "Claude Vision API".
3. Activar el workflow y copiar la URL de produccion del webhook
   (`https://<tu-n8n>/webhook/planograma-vision`).
4. Configurar `VITE_AGENT_WEBHOOK_URL` con esa URL:
   - Local: archivo `.env` con `VITE_AGENT_WEBHOOK_URL=https://...`
   - DigitalOcean: App Settings → Environment Variables (es build-time; dispara
     un redeploy al guardarla).
5. Probar: tomar fotos en la app y presionar "Usar esta foto". Si el webhook
   falla, la app cae a la propuesta simulada y lo avisa con un toast.

Contrato del webhook (POST JSON):

```json
{
  "store": "Cemaco Pradera",
  "category": "Todos autos",
  "fixture": { "name": "...", "width": 122, "depth": 56, "levels": 4, "category": "..." },
  "photos": [{ "id": "front", "label": "Foto frontal", "dataUrl": "data:image/jpeg;base64,..." }],
  "catalog": [{ "sku": "sku 00989055", "name": "...", "brand": "...", "category": "...", "price": 219.99 }]
}
```

Respuesta esperada:

```json
{
  "fixtureSummary": "...",
  "rows": [{
    "name": "Nivel 1", "confidence": 82,
    "items": [{ "sku": "sku 00989055", "detectedName": "...", "facings": 2,
                "confidence": 85, "moduleId": "front", "reason": "...",
                "alternatives": [{ "sku": "...", "name": "...", "confidence": 60 }] }]
  }]
}
```

## 9. Principios del proyecto (no negociables)

- No inventar detecciones si la foto no sirve; la app rechaza fotos de producto individual.
- Separar demo de reconocimiento real (etiquetas visibles de "modo demo").
- Mantener revision humana: mostrar confianza y candidatos alternos siempre.
- Performance (ventas) separado de Captura/Revision/Editor.
- Disenado para tienda: rapido, claro y usable desde movil.
