# Contrato: Listar Áreas de Jerarquía

**Método:** `GET`  
**Ruta:** `/api/v1/jerarquia/areas`  
**Actor:** Analista  
**Caso de uso:** CU-01-01 / CU-01-04  

---

## Descripción

Lista las áreas del catálogo de jerarquía de Cemaco, obtenidas desde CATI. Usado para poblar el primer nivel del selector de jerarquía en el formulario de planograma.

---

## Reglas de negocio

1. Proxy a `CATI GET /api/Jerarquia/Area` con Bearer token obtenido vía `POST /api/Auth/exchange`.
2. El backend cachea la respuesta por 30 minutos (la jerarquía cambia raramente).
3. No requiere parámetros de entrada.

---

## Response — 200 OK

```json
[
  { "id": "1", "name": "Hogar" },
  { "id": "2", "name": "Ferretería" },
  { "id": "3", "name": "Jardín" }
]
```

---

## Códigos de error

| Código | Condición |
|--------|-----------|
| `401 Unauthorized` | JWT ausente. |
| `503 Service Unavailable` | CATI no disponible. |

---

## Anotaciones de arquitectura

> **[HEXAGONAL — Puerto externo]**  
> `IJerarquiaService.obtenerAreas(): Promise<Area[]>`. La implementación `CatiJerarquiaService` hace el proxy y aplica el cache.

> **[CLEAN CODE — Cache]**  
> La jerarquía es referencial y cambia poco. Cache con TTL de 30 minutos es razonable. Usar Redis o in-memory con `node-cache`.
