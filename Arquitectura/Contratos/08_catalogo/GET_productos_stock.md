# Contrato: Obtener Stock de Producto

**Método:** `GET`  
**Ruta:** `/api/v1/catalog/productos/{sku}/stock`  
**Actor:** Analista  
**Caso de uso:** CU-04-14  

---

## Descripción

Retorna el stock SAP de un producto, desglosado por centro (tienda/bodega), tal como lo devuelve
CATI. Usado en el bloque de "Inventarios" de la ficha de producto, como segunda petición
independiente de la del detalle de catálogo (`GET_productos_detalle.md`).

---

## Parámetros de entrada

### Path Parameters

| Parámetro | Tipo | Requerido |
|-----------|------|-----------|
| `sku` | `string` | Sí |

---

## Reglas de negocio

1. Proxy a `CATI GET /api/Stock/sap/{sku}?profile=CEMACO`.
2. No se filtra por centro — se listan todos los centros que devuelva CATI, sin restringir al
   piloto de Cemaco Pradera. El filtrado, si hace falta, queda del lado del frontend o de un
   cambio posterior a este contrato.
3. Sin cache — a diferencia de `GET_productos_buscar.md`/`GET_productos_detalle.md` y de
   `11_jerarquia/`, el stock cambia constantemente y cachearlo daría información desactualizada
   para una decisión de surtido.
4. Si CATI responde `404` ("el sku no cuenta con inventario en sap"), este endpoint responde
   `200` con un arreglo vacío — la ausencia de inventario es un estado válido del producto, no un
   error. La ficha de producto debe poder distinguir "sin stock" de "no se pudo consultar".
   **Nota de implementación:** en la práctica, para un SKU que CATI no reconoce en absoluto (no
   solo "sin inventario", sino inexistente o mal formado), `Stock/sap` responde `500` en vez del
   `404` documentado en su swagger — ese caso cae en la regla 5 (`503`), no en esta. El `200` con
   arreglo vacío solo se observó, hasta ahora, para SKUs válidos sin fila de inventario.
5. Los 4 campos de cantidad (`stock`, `stockDaniado`, `stockBloqueado`, `stockAlterno`) se pasan
   tal cual vienen de CATI, sin castear a número — son strings nullable propios del formato SAP.

---

## Response — 200 OK

```json
[
  {
    "sku": "10012345",
    "centroId": "1181",
    "centro": "Cemaco Pradera",
    "stock": "12",
    "stockDaniado": "0",
    "stockBloqueado": "0",
    "stockAlterno": null
  },
  {
    "sku": "10012345",
    "centroId": "1190",
    "centro": "Cemaco Vista Hermosa",
    "stock": "3",
    "stockDaniado": null,
    "stockBloqueado": "1",
    "stockAlterno": null
  }
]
```

Arreglo vacío (`[]`) cuando el producto no tiene inventario registrado en SAP.

---

## Códigos de error

| Código | Condición |
|--------|-----------|
| `401 Unauthorized` | JWT ausente. |
| `503 Service Unavailable` | CATI no disponible o no responde dentro del timeout. |

---

## Anotaciones de arquitectura

> **[CLEAN CODE — Anti-corruption Layer]**  
> `mapInventarioSap(raw)` en `catiClient.js` traduce la forma de CATI a la forma interna — hoy es
> un passthrough de los mismos 7 campos, pero aísla al resto del código de un cambio de forma en
> CATI.

> **[HEXAGONAL]**  
> `catalogo.controller.js#obtenerStock` → `catiClient.obtenerStockSap(sku)` → CATI. Sin capa de
> dominio propia, igual que el resto del módulo `catalogo` (ver nota en
> `GET_productos_detalle.md` y `Arquitectura/ESTRUCTURA_BACKEND.md`).
