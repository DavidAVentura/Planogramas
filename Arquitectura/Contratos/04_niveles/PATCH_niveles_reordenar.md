# Contrato: Reordenar Niveles de una Góndola

**Método:** `PATCH`  
**Ruta:** `/api/v1/gondolas/{gondolaId}/niveles/orden`  
**Actor:** Analista  
**Caso de uso:** CU-03-07  

---

## Descripción

Reordena los niveles de una góndola. El cliente envía el array completo de IDs con su nuevo orden. Operación atómica.

---

## Parámetros de entrada

### Path Parameters

| Parámetro | Tipo | Requerido |
|-----------|------|-----------|
| `gondolaId` | `integer` | Sí |

### Body (JSON)

| Campo | Tipo | Requerido |
|-------|------|-----------|
| `orden` | `Array<{id: integer, orden: integer}>` | Sí |

---

## Reglas de negocio

1. Todos los IDs deben pertenecer a la góndola indicada.
2. Los valores de `orden` deben ser únicos en el array.
3. La versión padre debe estar en modo editable.

---

## Request JSON

```json
{
  "orden": [
    { "id": 9, "orden": 1 },
    { "id": 7, "orden": 2 },
    { "id": 8, "orden": 3 }
  ]
}
```

---

## Response — 200 OK

```json
{
  "niveles": [
    { "id": 9, "orden": 1 },
    { "id": 7, "orden": 2 },
    { "id": 8, "orden": 3 }
  ]
}
```

---

## Códigos de error

| Código | Condición |
|--------|-----------|
| `400 Bad Request` | Array vacío o IDs con orden duplicado. |
| `401 Unauthorized` | JWT ausente. |
| `404 Not Found` | Góndola no existe o algún ID de nivel no pertenece a ella. |
| `422 Unprocessable Entity` | Versión no editable. |

---

## Anotaciones de arquitectura

> **[CLEAN CODE]**  
> Misma implementación que reordenar góndolas — extraer `ReordenarEntidadUseCase<T>` genérico si hay múltiples entidades con este patrón.
