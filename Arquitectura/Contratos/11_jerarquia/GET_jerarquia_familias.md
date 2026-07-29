# Contrato: Listar Familias por Departamento

**Método:** `GET`
**Ruta:** `/api/v1/jerarquia/familias`
**Actor:** Analista
**Caso de uso:** CU-01-01 / CU-01-04

---

## Descripción

Lista las familias de un departamento específico, obtenidas desde CATI. Usado para el tercer nivel
del selector de jerarquía (Área → Departamento → Familia → Categoría → Subcategoría).

---

## Parámetros de entrada

### Query Parameters

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `departamento` | `string` | Sí | ID del departamento (obtenido de `GET /jerarquia/departamentos`). |

---

## Reglas de negocio

1. Proxy a `CATI GET /api/Jerarquia/Familia?departamento={departamentoId}&profile=CEMACO`.
2. Cachear por `departamentoId` con TTL de 30 minutos.

---

## Response — 200 OK

```json
[
  { "id": "03-0011-864", "name": "Aceites y Lubricantes" },
  { "id": "03-0011-865", "name": "Accesorios de Motor" }
]
```

---

## Códigos de error

| Código | Condición |
|--------|-----------|
| `400 Bad Request` | `departamento` ausente. |
| `401 Unauthorized` | JWT ausente. |
| `503 Service Unavailable` | CATI no disponible. |

---

## Anotaciones de arquitectura

> **[CLEAN CODE — Cache por clave compuesta]**
> La clave de cache incluye el `departamentoId`: `familias:{departamentoId}`. Mismo patrón que
> `GET_jerarquia_departamentos.md`.
