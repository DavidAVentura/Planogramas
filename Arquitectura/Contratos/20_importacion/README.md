# 20 — Importación (layout del PDF y productos del Excel)

Dos importadores **independientes y complementarios**, desde el chat del lienzo ("Extraer de otra
fuente"):

- **Excel de productos** → `POST /versiones/{id}/importar-productos`: todos los productos con sus
  datos de montaje (ganchos, cantidades, mín./máx., accesorio) a la góndola
  "Por ubicar". El analista los arrastra a su lugar; el Implementador ya los ve con sus ganchos.
- **PDF Planograma**: el layout (góndolas, secciones, niveles, espacios). Los productos que el
  agente identifica se colocan **sin confirmar** (`confidence` < 100): en el lienzo, clic derecho →
  "Confirmar producto" o "Reasignar producto…".

El PDF se importa en dos pasos:

1. `POST /agente-extractor/pdf-planograma` — el agente lee el PDF y devuelve una **propuesta**
   (cuerpos → secciones → niveles → espacios, con los productos identificados contra CATI). No
   persiste nada.
2. `POST /versiones/{id}/importar-layout` — después de que el usuario revisa la propuesta, crea o
   reemplaza las góndolas en **una sola transacción**.

| Archivo | Endpoint |
|---------|----------|
| [POST_agente_extractor_pdf_planograma.md](POST_agente_extractor_pdf_planograma.md) | `POST /agente-extractor/pdf-planograma` |
| [POST_versiones_importar_layout.md](POST_versiones_importar_layout.md) | `POST /versiones/{id}/importar-layout` |
| [POST_versiones_importar_productos.md](POST_versiones_importar_productos.md) | `POST /versiones/{id}/importar-productos` |

Convenciones del lienzo que respeta la importación: nivel `orden` 1 = el de arriba; las alturas
desde el piso bajan a medida que sube el orden; los números de gancho se calculan recorriendo
hojas → niveles → posiciones → un número por facing (`skuVersion.entity.js`), salvo que la posición
tenga `ganchos` guardados (Excel), que mandan y no son necesariamente correlativos.
