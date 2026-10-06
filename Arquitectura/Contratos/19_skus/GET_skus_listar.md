# Contrato: Listar SKU de la versión

**Método:** `GET`  
**Ruta:** `/api/v1/versiones/{versionId}/skus`  
**Actor:** Analista  
**Caso de uso:** CU-04-16  

---

## Descripción

Devuelve cada SKU de la versión con sus ubicaciones y totales, más la numeración de ganchos
calculada para cada posición (incluidos los espacios pendientes).

---

## Parámetros de entrada

| Parámetro | Ubicación | Tipo | Requerido |
|-----------|-----------|------|-----------|
| `versionId` | path | `integer` | Sí |

---

## Reglas de negocio

1. Los SKU aparecen en el orden en que se recorren por primera vez (ver README del módulo).
2. `facings` = suma de `facings_horizontal` de sus ubicaciones.
3. `capacidadTotal` = suma de `capacidad_maxima` de sus ubicaciones; `null` si alguna no la tiene.
4. `minFinal` / `maxFinal` = el valor común a todas sus ubicaciones; `null` si varía (`minVaria` /
   `maxVaria` = `true`) o si ninguna lo tiene.
5. Alertas (no bloquean nada, solo informan):
   - `MINMAX_VARIA`: las ubicaciones tienen mín./máx. distintos.
   - `MIN_MAYOR_MAX`: mín. final mayor que máx. final.
   - `MAX_SUPERA_CAPACIDAD`: máx. final mayor que la capacidad total.
6. `ubicaciones[].seccion` es el índice de la sección (null si la góndola no está dividida) y
   `ubicaciones[].nivel` el nivel dentro de su sección, contando de arriba hacia abajo.
7. Disponible en cualquier estado de la versión (solo lectura).

---

## Response — 200 OK

```json
{
  "versionId": 13,
  "totalGanchos": 3,
  "ganchosPorPosicion": { "64": [1, 2], "65": [3] },
  "skus": [
    {
      "sku": "125041",
      "nombre": "PEGA INSTAN LOCTITE 3G ORIGINAL",
      "ubicaciones": [
        { "posicionId": 64, "gondolaId": 23, "gondola": "Góndola 1", "seccion": 1, "nivelId": 36, "nivel": 1, "facings": 2, "ganchos": [1, 2] }
      ],
      "facings": 2,
      "capacidadTotal": 20,
      "minFinal": 5,
      "maxFinal": 40,
      "minVaria": false,
      "maxVaria": false,
      "ganchos": [1, 2],
      "alertas": [
        { "codigo": "MAX_SUPERA_CAPACIDAD", "mensaje": "Máx. final (40) supera la capacidad total (20)" }
      ]
    }
  ]
}
```

---

## Códigos de error

| Código | `error.code` | Condición |
|--------|--------------|-----------|
| `400` | `VALIDATION_ERROR` | `versionId` no es un entero positivo. |
| `401` | — | JWT ausente o inválido. |
| `404` | `NOT_FOUND` | La versión no existe. |
