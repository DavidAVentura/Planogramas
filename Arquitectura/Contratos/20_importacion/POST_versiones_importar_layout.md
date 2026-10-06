# Contrato: Importar layout en una versión

**Método:** `POST`  
**Ruta:** `/api/v1/versiones/{id}/importar-layout`  
**Actor:** Analista  

---

## Descripción

Crea o reemplaza una o más góndolas completas (secciones, niveles y posiciones) en una versión
editable, en **una sola transacción**: si algo falla no queda nada a medias. Lo usa el Agente
Importador de PDF después de la revisión del usuario.

---

## Request

```json
{
  "usar_por_ubicar": true,
  "cuerpos": [{
    "destino": "NUEVA",
    "nombre": "HERRAMIENTAS TG-27 · cuerpo 1/1",
    "ancho_cm": 121.9, "alto_cm": 229, "profundidad_cm": 55.9,
    "secciones": [
      { "clave": "raiz", "padre_clave": null, "es_division": true, "direccion": "FILAS", "orden": 1, "tam_cm": 229 },
      { "clave": "s1", "padre_clave": "raiz", "es_division": false, "direccion": null, "orden": 1, "tam_cm": 60 },
      { "clave": "s2", "padre_clave": "raiz", "es_division": false, "direccion": null, "orden": 2, "tam_cm": 169 }
    ],
    "niveles": [{
      "seccion_clave": "s1", "orden": 1, "altura_desde_piso_cm": 200, "tipo_accesorio": "GANCHO",
      "codigo_accesorio_id": null, "tamano_accesorio_pulgadas": 12, "notas": "R45-12-212P2 · ganchos 1-9",
      "posiciones": [
        { "orden_horizontal": 1, "sku": "1171592", "ancho_asignado_cm": 12, "facings_horizontal": 1,
          "nombre_detectado": null, "confidence": 100, "datos_vision": null, "ganchos": [1] }
      ]
    }]
  }]
}
```

| Campo | Regla |
|-------|-------|
| `destino` | `NUEVA` (se agrega al final de la versión) o `REEMPLAZAR` (requiere `gondola_id`). |
| `secciones` | Vacío = góndola sin dividir. Si viene: una sola raíz que es división; cada división con 2+ hijas y `direccion`; la última hija toma lo que sobre; mínimo 10 cm por sección. |
| `niveles[].seccion_clave` | `null` si la góndola no está dividida; si lo está, la clave de una hoja. |
| `niveles[].orden` | 1 = arriba. Se renumera 1..N para la góndola: hoja por hoja, en el orden recibido. |
| `usar_por_ubicar` | Opcional (default `false`). Llena los espacios con los productos de la góndola "Por ubicar" (Excel) que tengan sus mismos ganchos — ver regla 6. |
| `posiciones[].ganchos` | Números impresos en el PDF (enteros positivos, sin repetir). Se guardan en `Posicion.ganchos`: la numeración del lienzo es la del PDF. |
| `posiciones[].sku` | `null` = posición pendiente (`modo` PENDIENTE). `datos_vision` usa el mismo formato que las pendientes de IA visual, para que "Asignar SKU" muestre las alternativas. |

---

## Reglas de negocio

1. La versión debe estar en un estado editable (`borrador`, `en_desarrollo`, `piloto`).
2. `REEMPLAZAR` borra todo el contenido de la góndola (secciones, niveles, posiciones y sus
   accesorios) y le aplica nombre y medidas nuevas. Una góndola no puede reemplazarse dos veces en
   la misma importación.
3. `ancho_disponible_cm` de cada nivel = ancho de su hoja (o de la góndola si no está dividida).
4. Cada SKU se garantiza en el catálogo local (nutriéndolo desde CATI). Si no existe, la posición
   queda PENDIENTE con el SKU en `nombre_detectado` y una advertencia (no bloquea).
5. `capacidad_maxima` = `facings_horizontal` (apilable y unidades por facing = 1).
6. Con `usar_por_ubicar`: un espacio cuyos ganchos pertenecen **todos** a un mismo producto de
   "Por ubicar" toma ese producto (SKU, cantidades, mín./máx., perfil, modo, decisión,
   observaciones y accesorios del Excel), confirmado (`confidence` 100). El Excel manda sobre el SKU
   leído del PDF (si difieren, advertencia). Un producto con ganchos en varios espacios (ej.
   4, 9, 14, 19 en cuatro filas) se reparte: facings proporcionales a los ganchos de cada espacio y
   `capacidad_maxima` = facings × unidades × apilable. El producto sale de "Por ubicar"; si le
   quedan ganchos que no están en el PDF, se queda con esos (advertencia). Si "Por ubicar" queda
   vacía, se elimina. Todo en la misma transacción.
7. La góndola "Por ubicar" no se puede usar como destino `REEMPLAZAR`.

---

## Response — 201 Created

```json
{
  "desdePorUbicar": 30,
  "gondolas": [{ "id": 812, "nombre": "HERRAMIENTAS TG-27 · cuerpo 1/1", "destino": "NUEVA",
                 "totalSecciones": 3, "totalNiveles": 6, "totalPosiciones": 37 }],
  "advertencias": ["HERRAMIENTAS TG-27 · cuerpo 1/1: el SKU 628479 no existe en el catálogo; la posición quedó pendiente."]
}
```

---

## Códigos de error

| Código | `error.code` | Condición |
|--------|--------------|-----------|
| `400` | `VALIDATION_ERROR` | `id` no es un entero positivo o el body no cumple el esquema. |
| `400` | `VALIDATION_ERROR` | Dos cuerpos reemplazan la misma góndola. |
| `401` | — | JWT ausente o inválido. |
| `404` | `NOT_FOUND` | La versión no existe. |
| `404` | `NOT_FOUND` | La góndola a reemplazar no existe o no pertenece a la versión. |
| `404` | `NOT_FOUND` | Un `codigo_accesorio_id` no existe. |
| `422` | `UNPROCESSABLE` | La versión no es editable. |
| `422` | `UNPROCESSABLE` | El destino `REEMPLAZAR` es la góndola "Por ubicar". |
| `422` | `UNPROCESSABLE` | Árbol de secciones inválido (raíz que no es división, división con menos de 2 hijas, sección menor a 10 cm). |
| `422` | `UNPROCESSABLE` | Un nivel no indica una sección hoja (o indica sección en una góndola sin dividir). |
