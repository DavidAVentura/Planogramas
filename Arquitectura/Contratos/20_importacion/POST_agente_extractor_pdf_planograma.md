# Contrato: Leer PDF de planograma

**Método:** `POST`  
**Ruta:** `/api/v1/agente-extractor/pdf-planograma`  
**Actor:** Analista  

---

## Descripción

El Agente Importador de PDF (OpenAI, modelo `OPENAI_MODEL_PDF`) lee la ficha de montaje y
reconstruye el layout de cada cuerpo:

- **Capa 1 — layout:** medidas de la góndola (regla en pies, accesorios tipo `SUS 4*22` = 4' × 22"),
  árbol de secciones, niveles (altura, tipo y código de accesorio) y espacios (ancho, números de
  gancho impresos, SKU impreso, descripción visual).
- **Capa 2 — productos:** cada espacio se busca en CATI por su SKU impreso (`IDENTIFICADO`); si no
  hay o no existe, se buscan candidatos por la descripción (`CANDIDATOS`); si no, `NO_ENCONTRADO`.
  Un candidato nunca se asigna solo.

No persiste nada. El body admite hasta ~21 MB (PDF de hasta 15 MB en base64).

---

## Request

```json
{ "pdf_base64": "JVBERi0xLjcK...", "nombre_archivo": "HERRAMIENTAS TG-27.pdf" }
```

---

## Response — 200 OK

```json
{
  "archivo": "HERRAMIENTAS TG-27.pdf",
  "modelo": "gpt-5",
  "advertencias": ["El número 36 aparece dos veces"],
  "cuerpos": [{
    "clave": "c1", "nombre": "HERRAMIENTAS TG-27 · cuerpo 1/1", "codigo_mueble": "TG-27",
    "categoria": "CINTAS METRICAS", "pagina": 1,
    "ancho_cm": 121.9, "alto_cm": 229, "profundidad_cm": 55.9,
    "secciones": [],
    "niveles": [{
      "clave": "n1", "seccion_clave": null, "orden": 1, "altura_desde_piso_cm": 200,
      "ancho_disponible_cm": 121.9, "tipo_accesorio": "GANCHO", "codigo_accesorio": "R45-12-212P2",
      "codigo_accesorio_id": 9, "tamano_accesorio_pulgadas": 12,
      "espacios": [{
        "orden_horizontal": 1, "ganchos": [1], "numeros_sistema": [1], "facings": 1, "ancho_cm": 12,
        "sku_impreso": "1171592", "descripcion_visual": "cinta métrica", "confianza": 90,
        "producto": { "sku": "1171592", "nombre": "...", "marca": "...", "ancho_cm": null, "imagen_url": null },
        "candidatos": [], "estado_producto": "IDENTIFICADO"
      }]
    }],
    "accesorios_montaje": [{ "codigo": "SUS 4*22", "tipo": "BANDEJA", "medida_pulgadas": 22, "cantidad": 4, "especificaciones": "...", "accesorio_id": null }],
    "notas": null,
    "advertencias": ["1 espacio(s) quedarán con un número de gancho distinto al impreso en el PDF ..."]
  }]
}
```

- `numeros_sistema`: números de gancho que asignará el sistema al importar (uno por facing). Si
  difieren de `ganchos` (los impresos), se advierte.
- Las advertencias de un cuerpo (accesorio fuera de catálogo, anchos reescalados, secciones
  inválidas, numeración distinta) van en `cuerpos[].advertencias`; las generales del PDF y de CATI,
  en `advertencias`.

---

## Códigos de error

| Código | `error.code` | Condición |
|--------|--------------|-----------|
| `400` | `VALIDATION_ERROR` | Falta `pdf_base64` o `nombre_archivo`, el nombre no termina en `.pdf`, el archivo no empieza con `%PDF-` o supera 15 MB. |
| `401` | — | JWT ausente o inválido. |
| `503` | `SERVICE_UNAVAILABLE` | OpenAI no respondió, rechazó el archivo o devolvió un JSON inválido. |
