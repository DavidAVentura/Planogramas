# Contrato: Crear Planograma

**Método:** `POST`  
**Ruta:** `/api/v1/planogramas`  
**Actor:** Analista  
**Caso de uso:** CU-01-01  

---

## Descripción

Crea un nuevo planograma con nombre, departamento, área y subcategorías de referencia. El planograma nace en estado `borrador`. Valida unicidad del nombre dentro del mismo departamento.

---

## Parámetros de entrada

### Headers

| Header | Valor | Requerido |
|--------|-------|-----------|
| `Authorization` | `Bearer {jwt}` | Sí |
| `Content-Type` | `application/json` | Sí |

### Body (JSON)

| Campo | Tipo | Requerido | Validación |
|-------|------|-----------|------------|
| `nombre` | `string` | Sí | Mínimo 3 chars, máximo 100 chars. No puede ser solo espacios. |
| `area` | `string` | Sí | Código de área de CATI. |
| `departamento` | `string` | Sí | Código de departamento de CATI. |
| `subcategorias` | `string[]` | Sí | Array de texto libre. Mínimo 1 elemento. Máximo 20. Cada elemento máx. 100 chars. |

---

## Reglas de negocio

1. **Unicidad:** no puede existir otro planograma con el mismo `nombre` en el mismo `departamento` (sin importar estado, incluyendo archivados).
2. El estado inicial es siempre `borrador`. No se puede especificar estado en la creación.
3. El campo `createdBy` se toma del JWT — no se envía en el body.
4. Las subcategorías son texto libre (no se validan contra catálogo CATI en este endpoint).
5. El planograma recién creado no tiene versiones — el Analista debe crearlas por separado.

---

## Request JSON

```json
{
  "nombre": "AUTOS 01",
  "area": "HOGAR",
  "departamento": "AUTOS",
  "subcategorias": [
    "Aceites y lubricantes",
    "Accesorios eléctricos"
  ]
}
```

---

## Response — 201 Created

```json
{
  "id": 42,
  "nombre": "AUTOS 01",
  "area": "HOGAR",
  "departamento": "AUTOS",
  "estado": "borrador",
  "subcategorias": [
    "Aceites y lubricantes",
    "Accesorios eléctricos"
  ],
  "createdAt": "2026-07-10T14:30:00Z",
  "createdBy": "david.ventura@cemaco.com"
}
```

---

## Ejemplos

```http
POST /api/v1/planogramas
Authorization: Bearer eyJ...
Content-Type: application/json

{
  "nombre": "PINTURAS PREMIUM",
  "area": "FERRETERIA",
  "departamento": "PINTURAS",
  "subcategorias": ["Pinturas de agua", "Esmaltes", "Imprimantes"]
}
```

---

## Códigos de error

| Código | Condición |
|--------|-----------|
| `400 Bad Request` | Body inválido: campo requerido ausente, tipo incorrecto o longitud fuera de rango. |
| `401 Unauthorized` | JWT ausente o inválido. |
| `403 Forbidden` | El usuario no tiene rol de Analista. |
| `409 Conflict` | Ya existe un planograma con ese nombre en el mismo departamento. |

```json
// 409 Conflict
{
  "error": "Ya existe un planograma con ese nombre en el departamento",
  "campo": "nombre",
  "valor": "AUTOS 01"
}

// 400 Bad Request
{
  "errores": [
    { "campo": "nombre", "error": "El nombre es requerido" },
    { "campo": "subcategorias", "error": "Se requiere al menos una subcategoría" }
  ]
}
```

---

## Anotaciones de arquitectura

> **[HEXAGONAL — Puerto de entrada]**  
> El controlador recibe el DTO, lo valida con un esquema (Zod/Joi) y delega al caso de uso `CrearPlanogramaUseCase`. El caso de uso orquesta: validar unicidad (`PlanogramaRepository.existsByNombreYDepartamento`) → persistir → retornar entidad.

> **[SOLID — SRP]**  
> Separar en tres capas: (1) Controlador HTTP solo valida schema y delega. (2) Application Service ejecuta regla de negocio de unicidad. (3) Repository persiste en transacción.

> **[SOLID — DIP]**  
> El caso de uso depende de la interfaz `IPlanogramaRepository`, no de la implementación SQL concreta. Facilita testing con repositorio en memoria.

> **[CLEAN CODE — Transacciones]**  
> La inserción del planograma y sus subcategorías debe ocurrir en una sola transacción. Si falla el INSERT de subcategorías, el planograma no debe quedar huérfano.

> **[CLEAN CODE — Nombrado]**  
> `CrearPlanogramaDTO`, `CrearPlanogramaUseCase`, `PlanogramaCreado` (evento de dominio si se implementa event sourcing más adelante).
