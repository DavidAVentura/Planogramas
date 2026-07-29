# Contrato: Buscar Posiciones por SKU en Versión

**Método:** `GET`  
**Ruta:** `/api/v1/posiciones/por-sku`  
**Actor:** Analista  
**Caso de uso:** CU-05-01 (paso inicial)  

---

## Descripción

Retorna todas las posiciones de un SKU dentro de una versión específica, con contexto de ubicación (góndola, nivel, orden horizontal). También retorna el SKU sustituto recomendado si existe en el catálogo SQL.

---

## Parámetros de entrada

### Query Parameters

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `sku` | `string` | Sí | SKU a buscar. |
| `versionId` | `integer` | Sí | Versión donde buscar. |

---

## Response — 200 OK

```json
{
  "sku": "10012345",
  "totalPosicionesEnVersion": 3,
  "skuSustitutoRecomendado": "10098765",
  "posiciones": [
    {
      "id": 55,
      "gondolaNombre": "Góndola A",
      "nivelOrden": 3,
      "orden_horizontal": 1
    },
    {
      "id": 56,
      "gondolaNombre": "Góndola A",
      "nivelOrden": 2,
      "orden_horizontal": 2
    }
  ]
}
```

---

## Códigos de error

| Código | Condición |
|--------|-----------|
| `400 Bad Request` | `sku` o `versionId` ausentes. |
| `401 Unauthorized` | JWT ausente. |
| `404 Not Found` | Versión no existe. |

---

## Anotaciones de arquitectura

> **[CLEAN CODE]**  
> `skuSustitutoRecomendado` se obtiene de la tabla `Producto` local (si existe caché del catálogo), no de CATI en tiempo real. Puede ser `null`.
