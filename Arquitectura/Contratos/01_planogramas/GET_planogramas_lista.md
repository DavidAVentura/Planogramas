# Contrato: Listar Planogramas

**Método:** `GET`  
**Ruta:** `/api/v1/planogramas`  
**Actor:** Analista / Implementador  
**Caso de uso:** CU-01-04  

---

## Descripción

Retorna una lista paginada de planogramas. Permite filtrar por departamento, estado y búsqueda por nombre. Cada ítem del listado incluye conteo de versiones para dar contexto rápido sin cargar el detalle completo.

---

## Parámetros de entrada

### Query Parameters

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `departamento` | `string` | No | Filtra por código de departamento CATI. Si se omite, retorna todos los departamentos. |
| `estado` | `string` | No | Filtra por estado del planograma. Valores: `borrador`, `publicado`, `archivado`. |
| `search` | `string` | No | Búsqueda parcial por nombre (LIKE `%search%`). Mínimo 2 caracteres si se envía. |
| `page` | `integer` | No | Número de página. Default: `1`. Mínimo: `1`. |
| `pageSize` | `integer` | No | Elementos por página. Default: `20`. Máximo: `100`. |

### Headers

| Header | Valor | Requerido |
|--------|-------|-----------|
| `Authorization` | `Bearer {jwt}` | Sí |

---

## Reglas de negocio

1. Solo retorna planogramas visibles para el rol del usuario autenticado.
2. El campo `total_versiones` cuenta **todas** las versiones sin importar su estado.
3. Si `search` tiene menos de 2 caracteres, se ignora el filtro (no retorna error).
4. El orden por defecto es `created_at DESC` (más recientes primero).
5. Un planograma archivado **sí aparece** en la lista a menos que se filtre explícitamente por `estado`.

---

## Comportamiento esperado

- **Sin filtros:** retorna todos los planogramas paginados.
- **Con `departamento`:** retorna solo los del departamento indicado.
- **Con `estado=archivado`:** retorna solo los archivados.
- **Con `search=AUTOS`:** retorna planogramas cuyo nombre contiene "AUTOS" (case-insensitive).

---

## Response — 200 OK

```json
{
  "data": [
    {
      "id": 1,
      "nombre": "AUTOS 01",
      "departamento": "AUTOS",
      "estado": "borrador",
      "totalVersiones": 2,
      "createdAt": "2026-07-01T10:00:00Z"
    },
    {
      "id": 2,
      "nombre": "AUTOS PREMIUM",
      "departamento": "AUTOS",
      "estado": "publicado",
      "totalVersiones": 1,
      "createdAt": "2026-06-15T08:30:00Z"
    }
  ],
  "total": 2,
  "page": 1,
  "pageSize": 20
}
```

---

## Ejemplos de request

```
GET /api/v1/planogramas?departamento=AUTOS&estado=borrador&page=1&pageSize=20
Authorization: Bearer eyJ...
```

```
GET /api/v1/planogramas?search=PREM&page=1&pageSize=10
Authorization: Bearer eyJ...
```

---

## Códigos de error

| Código | Condición |
|--------|-----------|
| `401 Unauthorized` | JWT ausente, expirado o inválido. |
| `403 Forbidden` | El usuario no tiene permiso para listar planogramas. |
| `400 Bad Request` | `pageSize` supera 100 o `page` es menor a 1. |

```json
// 400 Bad Request
{
  "error": "pageSize no puede superar 100",
  "campo": "pageSize"
}
```

---

## Anotaciones de arquitectura

> **[HEXAGONAL — Puerto de entrada]**  
> Este endpoint es el punto de entrada del caso de uso `ListarPlanogramas`. La lógica de filtros y paginación pertenece al **Application Service** (`PlanogramaService.listar(filtros, paginacion)`), no al controlador. El controlador solo mapea query params → DTO y llama al servicio.

> **[SOLID — SRP]**  
> El repositorio `PlanogramaRepository` solo se encarga de consultar datos. La transformación de filas SQL al DTO de respuesta debe ocurrir en un **Mapper** separado (`PlanogramaMapper.toListItemDTO`), no dentro del repositorio ni del controlador.

> **[CLEAN CODE — Nombrado]**  
> Nombrar el método del repositorio como `findAll(filtros: PlanogramaFiltros, paginacion: Paginacion): Promise<PaginatedResult<Planograma>>`. Evitar nombres genéricos como `get()` o `query()`.

> **[SOLID — OCP]**  
> Diseñar el objeto `PlanogramaFiltros` como un value object extensible. Nuevos filtros (ej. `area`, `tienda`) se agregan como campos opcionales sin modificar la firma del repositorio.
