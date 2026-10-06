# 20 — Importación de layout (Agente Importador de PDF)

Importa el layout completo de un mueble a partir de su ficha de montaje en PDF, en dos pasos:

1. `POST /agente-extractor/pdf-planograma` — el agente lee el PDF y devuelve una **propuesta**
   (cuerpos → secciones → niveles → espacios, con los productos identificados contra CATI). No
   persiste nada.
2. `POST /versiones/{id}/importar-layout` — después de que el usuario revisa la propuesta, crea o
   reemplaza las góndolas en **una sola transacción**.

| Archivo | Endpoint |
|---------|----------|
| [POST_agente_extractor_pdf_planograma.md](POST_agente_extractor_pdf_planograma.md) | `POST /agente-extractor/pdf-planograma` |
| [POST_versiones_importar_layout.md](POST_versiones_importar_layout.md) | `POST /versiones/{id}/importar-layout` |

Convenciones del lienzo que respeta la importación: nivel `orden` 1 = el de arriba; las alturas
desde el piso bajan a medida que sube el orden; los números de gancho no se guardan, se calculan
recorriendo hojas → niveles → posiciones → un número por facing (`skuVersion.entity.js`).
