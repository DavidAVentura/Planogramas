# Contrato: Archivar Planograma

**Método:** `POST`  
**Ruta:** `/api/v1/planogramas/{id}/archivar`  
**Actor:** Analista  
**Caso de uso:** CU-01-03  

---

## Descripción

Marca el planograma como `archivado` y archiva en cascada todas sus versiones activas (en estados `borrador`, `en_desarrollo`, `piloto`). Las versiones `publicadas` bloquean el archivado — deben desasignarse primero. No elimina datos.

---

## Parámetros de entrada

### Path Parameters

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `id` | `integer` | Sí | ID del planograma a archivar. |

### Headers

| Header | Valor | Requerido |
|--------|-------|-----------|
| `Authorization` | `Bearer {jwt}` | Sí |

### Body

Sin body (operación de acción/comando).

---

## Reglas de negocio

1. Si el planograma ya está `archivado`, retorna `409 Conflict`.
2. Si existe al menos una versión en estado `publicado` asignada a tiendas, retorna `422`. El Analista debe desasignar las tiendas o archivar la versión publicada primero.
3. El archivado de versiones en cascada cubre: `borrador`, `en_desarrollo`, `piloto`. Las versiones `publicadas` bloquean.
4. La operación es atómica (transacción): o se archiva todo o nada.
5. Una vez archivado, el planograma **no puede** volver a estado activo (no hay endpoint de "desarchivar").

---

## Response — 200 OK

```json
{
  "id": 42,
  "estado": "archivado",
  "versionesArchivadas": 2
}
```

---

## Códigos de error

| Código | Condición |
|--------|-----------|
| `401 Unauthorized` | JWT ausente o inválido. |
| `403 Forbidden` | El usuario no tiene rol de Analista. |
| `404 Not Found` | Planograma no existe. |
| `409 Conflict` | El planograma ya está archivado. |
| `422 Unprocessable Entity` | Existen versiones publicadas asignadas a tiendas. |

```json
// 409 Conflict
{
  "error": "El planograma ya está archivado"
}

// 422 Unprocessable Entity
{
  "error": "Existen versiones publicadas asignadas a tiendas. Desasígnalas antes de archivar.",
  "versionesPublicadas": [
    { "id": 10, "codigo": "AUTOS-TG-01", "tiendas": 2 }
  ]
}
```

---

## Anotaciones de arquitectura

> **[HEXAGONAL — Command]**  
> `ArchivarPlanogramaCommand` con solo el `planogramaId`. El caso de uso `ArchivarPlanogramaUseCase` encapsula toda la lógica de validación en cascada. El controlador no debe saber que hay versiones involucradas.

> **[CLEAN CODE — Transacción explícita]**  
> La transacción debe iniciar en el Application Service (o en el Repository si se usa Unit of Work), no en el controlador. El Application Service recibe `UnitOfWork` por inyección.

> **[SOLID — Tell Don't Ask]**  
> En lugar de consultar el estado y luego decidir en el servicio, la entidad `Planograma` debería exponer `archivar()` que lanza una excepción de dominio (`PlanogramaYaArchivadoException`) si el estado es inválido.

> **[CLEAN CODE — Respuesta rica]**  
> Retornar `versionesArchivadas` en la respuesta ayuda al frontend a mostrar feedback útil sin hacer otra llamada.
