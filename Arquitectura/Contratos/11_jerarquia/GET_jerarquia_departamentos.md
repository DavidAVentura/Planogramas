# Contrato: Listar Departamentos por Área

**Método:** `GET`  
**Ruta:** `/api/v1/jerarquia/departamentos`  
**Actor:** Analista  
**Caso de uso:** CU-01-01 / CU-01-04  

---

## Descripción

Lista los departamentos de una área específica, obtenidos desde CATI. Usado para el segundo nivel del selector de jerarquía.

---

## Parámetros de entrada

### Query Parameters

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `area` | `string` | Sí | ID del área (obtenido de `GET /jerarquia/areas`). |

---

## Reglas de negocio

1. Proxy a `CATI GET /api/Jerarquia/Departamento?area={areaId}&profile=CEMACO`.
2. Cachear por `areaId` con TTL de 30 minutos.

---

## Response — 200 OK

```json
[
  { "id": "101", "name": "Autos" },
  { "id": "102", "name": "Herramientas" }
]
```

---

## Códigos de error

| Código | Condición |
|--------|-----------|
| `400 Bad Request` | `area` ausente. |
| `401 Unauthorized` | JWT ausente. |
| `503 Service Unavailable` | CATI no disponible. |

---

## Anotaciones de arquitectura

> **[CLEAN CODE — Cache por clave compuesta]**  
> La clave de cache incluye el `areaId`: `jerarquia:departamentos:{areaId}`. Permite invalidar por área si es necesario.
