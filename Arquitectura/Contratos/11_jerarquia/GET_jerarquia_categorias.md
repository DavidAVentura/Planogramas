# Contrato: Listar Categorías por Familia

**Método:** `GET`
**Ruta:** `/api/v1/jerarquia/categorias`
**Actor:** Analista
**Caso de uso:** CU-01-01 / CU-01-04

---

## Descripción

Lista las categorías de una familia específica, obtenidas desde CATI. Usado para el cuarto nivel
del selector de jerarquía (Área → Departamento → Familia → Categoría → Subcategoría).

---

## Parámetros de entrada

### Query Parameters

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `familia` | `string` | Sí | ID de la familia (obtenido de `GET /jerarquia/familias`). |

---

## Reglas de negocio

1. Proxy a `CATI GET /api/Jerarquia/Categoria?familia={familiaId}&profile=CEMACO`.
2. Cachear por `familiaId` con TTL de 30 minutos.

---

## Response — 200 OK

```json
[
  { "id": "03-0011-864-922144", "name": "Aceite de Motor" },
  { "id": "03-0011-864-922145", "name": "Aditivos" }
]
```

---

## Códigos de error

| Código | Condición |
|--------|-----------|
| `400 Bad Request` | `familia` ausente. |
| `401 Unauthorized` | JWT ausente. |
| `503 Service Unavailable` | CATI no disponible. |

---

## Anotaciones de arquitectura

> **[CLEAN CODE — Cache por clave compuesta]**
> La clave de cache incluye el `familiaId`: `categorias:{familiaId}`. Mismo patrón que
> `GET_jerarquia_departamentos.md`.
