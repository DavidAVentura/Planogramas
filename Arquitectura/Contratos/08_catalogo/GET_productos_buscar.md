# Contrato: Buscar Productos del Catálogo

**Método:** `GET`  
**Ruta:** `/api/v1/catalog/productos/buscar`  
**Actor:** Analista  
**Casos de uso:** CU-04-01 / CU-05-02  

---

## Descripción

Busca productos en el catálogo CATI. El backend actúa como proxy/caché — el frontend nunca llama a CATI directamente. Retorna resultados paginados con los campos necesarios para mostrar en el buscador del editor.

---

## Parámetros de entrada

### Query Parameters

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `q` | `string` | Sí | Texto de búsqueda: SKU, nombre o marca. Mínimo 2 chars. |
| `subcategoria` | `string` | No | Filtra por subcategoría. |
| `page` | `integer` | No | Default: `1`. |
| `pageSize` | `integer` | No | Default: `20`. Máximo: `50`. |

---

## Reglas de negocio

1. El backend hace proxy a `CATI GET /api/Product/search?Sku={q}&Descripcion={q}&Marca={q}&Subcategoria={sub}&Profile=CEMACO`.
2. Si CATI no responde en < 5s, retornar `503` con mensaje de timeout.
3. Los resultados pueden cachearse por hasta 5 minutos para reducir carga en CATI.
4. Solo retorna productos con `estado = ACTIVO` en CATI.

---

## Response — 200 OK

```json
[
  {
    "sku": "10012345",
    "nombre": "Aceite Motor 10W30 1L",
    "marca": "Castrol",
    "subcategoria": "Aceites y lubricantes",
    "ancho_cm": 9.0,
    "alto_cm": 22.0,
    "profundidad_cm": 9.0,
    "imagen_url": "https://vtex.cemaco.com/productos/10012345_XL.jpg",
    "precio": 85.00
  }
]
```

---

## Códigos de error

| Código | Condición |
|--------|-----------|
| `400 Bad Request` | `q` ausente o menor a 2 chars. |
| `401 Unauthorized` | JWT ausente. |
| `503 Service Unavailable` | CATI no disponible. |

```json
// 503
{
  "error": "El catálogo de productos no está disponible en este momento. Intenta de nuevo.",
  "retry_after": 30
}
```

---

## Anotaciones de arquitectura

> **[HEXAGONAL — Puerto externo]**  
> Definir `ICatalogoService.buscarProductos(query: BusquedaProductosQuery): Promise<ProductoCatalogo[]>`. La implementación `CatiCatalogoService` hace la llamada HTTP a CATI con el Bearer token obtenido vía `POST /api/Auth/exchange`.

> **[CLEAN CODE — Anti-corruption Layer]**  
> El mapper `CatiProductoMapper.toProductoCatalogo(catiResponse)` transforma la respuesta de CATI al modelo interno. Si CATI cambia su schema, solo cambia el mapper — no el resto del sistema.

> **[SOLID — SRP]**  
> La gestión del Bearer token de CATI (obtención + renovación) es responsabilidad de un `CatiAuthProvider` separado, no del servicio de búsqueda.

> **[CLEAN CODE — Cache]**  
> El cache de resultados de búsqueda se implementa en el `CatiCatalogoService` con TTL de 5 minutos (Redis o in-memory). La clave de cache es el hash de los query params.
