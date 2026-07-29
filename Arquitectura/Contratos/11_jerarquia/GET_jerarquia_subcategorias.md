# Contrato: Listar Subcategorías por Categoría

**Método:** `GET`
**Ruta:** `/api/v1/jerarquia/subcategorias`
**Actor:** Analista
**Caso de uso:** CU-01-01 / CU-01-04

---

## Descripción

Lista las subcategorías de una categoría específica, obtenidas desde CATI. Es el quinto y último
nivel del selector de jerarquía (Área → Departamento → Familia → Categoría → Subcategoría); el id
de subcategoría resultante es el que se usa como filtro en `GET /catalog/productos/buscar`.

---

## Parámetros de entrada

### Query Parameters

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `categoria` | `string` | Sí | ID de la categoría (obtenido de `GET /jerarquia/categorias`). |

---

## Reglas de negocio

1. Proxy a `CATI GET /api/Jerarquia/Subcategoria?categoria={categoriaId}&profile=CEMACO`.
2. Cachear por `categoriaId` con TTL de 30 minutos.

---

## Response — 200 OK

```json
[
  { "id": "03-0011-864-922144-23021", "name": "Aceite Sintético 10W30" },
  { "id": "03-0011-864-922144-23022", "name": "Aceite Mineral 20W50" }
]
```

---

## Códigos de error

| Código | Condición |
|--------|-----------|
| `400 Bad Request` | `categoria` ausente. |
| `401 Unauthorized` | JWT ausente. |
| `503 Service Unavailable` | CATI no disponible. |

---

## Anotaciones de arquitectura

> **[CLEAN CODE — Cache por clave compuesta]**
> La clave de cache incluye el `categoriaId`: `subcategorias:{categoriaId}`. Mismo patrón que
> `GET_jerarquia_departamentos.md`.
