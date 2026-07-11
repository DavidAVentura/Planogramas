# Contrato: Editar Planograma

**Método:** `PATCH`  
**Ruta:** `/api/v1/planogramas/{id}`  
**Actor:** Analista  
**Caso de uso:** CU-01-02  

---

## Descripción

Modifica nombre, área, departamento o subcategorías de referencia de un planograma existente. Solo acepta los campos enviados (partial update). Un planograma archivado no puede editarse.

---

## Parámetros de entrada

### Path Parameters

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `id` | `integer` | Sí | ID del planograma. |

### Headers

| Header | Valor | Requerido |
|--------|-------|-----------|
| `Authorization` | `Bearer {jwt}` | Sí |
| `Content-Type` | `application/json` | Sí |

### Body (JSON) — todos opcionales, al menos uno requerido

| Campo | Tipo | Validación |
|-------|------|------------|
| `nombre` | `string` | Máximo 100 chars. |
| `area` | `string` | Código de área CATI. |
| `departamento` | `string` | Código de departamento CATI. |
| `subcategorias` | `string[]` | Reemplaza la lista completa. Mínimo 1 elemento si se envía. |

---

## Reglas de negocio

1. Si el planograma está en estado `archivado`, retorna `422`.
2. Si se cambia el `nombre`, se valida unicidad contra el departamento (el actual o el nuevo si también se envía `departamento`).
3. Si se envía `subcategorias`, **reemplaza toda la lista** — no es un merge.
4. Los campos no enviados permanecen sin cambios.
5. El `estado` no se puede modificar con este endpoint (usar `/archivar`).

---

## Request JSON (ejemplo partial update)

```json
{
  "nombre": "AUTOS 01 REVISADO",
  "subcategorias": [
    "Aceites y lubricantes",
    "Accesorios eléctricos",
    "Filtros"
  ]
}
```

---

## Response — 200 OK

```json
{
  "id": 42,
  "nombre": "AUTOS 01 REVISADO",
  "area": "HOGAR",
  "departamento": "AUTOS",
  "estado": "borrador",
  "subcategorias": [
    "Aceites y lubricantes",
    "Accesorios eléctricos",
    "Filtros"
  ],
  "createdAt": "2026-07-01T10:00:00Z",
  "createdBy": "david.ventura@cemaco.com"
}
```

---

## Códigos de error

| Código | Condición |
|--------|-----------|
| `400 Bad Request` | Ningún campo enviado, o campo con valor inválido. |
| `401 Unauthorized` | JWT ausente o inválido. |
| `403 Forbidden` | El usuario no tiene rol de Analista. |
| `404 Not Found` | Planograma no existe. |
| `409 Conflict` | El nuevo nombre ya existe en el departamento. |
| `422 Unprocessable Entity` | El planograma está archivado y no puede editarse. |

```json
// 422 Unprocessable Entity
{
  "error": "Un planograma archivado no puede editarse"
}
```

---

## Anotaciones de arquitectura

> **[HEXAGONAL — Caso de uso]**  
> `EditarPlanogramaUseCase` recibe un `EditarPlanogramaCommand` con los campos opcionales. Internamente hace: cargar entidad → aplicar cambios → validar invariantes → persistir. La entidad `Planograma` valida en su propio método `editar()` que no esté archivada.

> **[CLEAN CODE — Guard Clauses]**  
> Verificar el estado del planograma al inicio del caso de uso (guard clause), antes de ejecutar cualquier otra lógica. Esto evita queries innecesarias a la BD.

> **[SOLID — SRP]**  
> La sustitución de subcategorías (DELETE + INSERT) es responsabilidad del repositorio, no del caso de uso. El caso de uso solo pasa la nueva lista.

> **[CLEAN CODE — Partial Update]**  
> En TypeScript: usar `Partial<EditarPlanogramaDTO>` y validar con una regla "al menos un campo presente" antes de procesar.
