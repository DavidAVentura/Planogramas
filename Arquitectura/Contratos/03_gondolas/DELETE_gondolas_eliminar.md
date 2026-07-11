# Contrato: Eliminar Góndola

**Método:** `DELETE`  
**Ruta:** `/api/v1/gondolas/{id}`  
**Actor:** Analista  
**Caso de uso:** CU-03-04  

---

## Descripción

Elimina una góndola y en cascada: sus niveles, posiciones y accesorios de posición. La eliminación es permanente. Si la góndola tiene posiciones, se requiere confirmación explícita del cliente.

---

## Parámetros de entrada

### Path Parameters

| Parámetro | Tipo | Requerido |
|-----------|------|-----------|
| `id` | `integer` | Sí |

### Query Parameters

| Parámetro | Tipo | Default | Descripción |
|-----------|------|---------|-------------|
| `forzar` | `boolean` | `false` | Si `false` y hay posiciones, retorna `409`. Si `true`, elimina todo en cascada. |

---

## Reglas de negocio

1. Si la góndola tiene posiciones y `forzar=false` → `409 Conflict`.
2. Si `forzar=true` → elimina en cascada: `PosicionAccesorio` → `Posicion` → `Nivel` → `Gondola`.
3. La operación es atómica.
4. La versión padre debe estar en modo editable.
5. Después de eliminar, **no** se reajustan los valores de `orden` de las góndolas restantes automáticamente — el frontend reordena visualmente y puede llamar al endpoint de reordenamiento si lo requiere.

---

## Response — 204 No Content

Sin body.

---

## Códigos de error

| Código | Condición |
|--------|-----------|
| `401 Unauthorized` | JWT ausente. |
| `404 Not Found` | Góndola no existe. |
| `409 Conflict` | La góndola tiene niveles/posiciones y `forzar=false`. |
| `422 Unprocessable Entity` | Versión no editable. |

```json
// 409 Conflict
{
  "error": "La góndola tiene contenido asignado. Usa forzar=true para eliminar en cascada.",
  "totalNiveles": 4,
  "totalPosiciones": 18
}
```

---

## Anotaciones de arquitectura

> **[CLEAN CODE — Confirmación en dos pasos]**  
> El frontend primero llama a `GET /gondolas/{id}/resumen` para obtener el conteo, muestra el diálogo de confirmación, y luego llama a `DELETE`. Esto evita enviar `forzar=true` a ciegas.

> **[CLEAN CODE — Cascada explícita]**  
> En SQL Server, la cascada de DELETE debe ser implementada a nivel de aplicación (no ON DELETE CASCADE en FK) para mantener control y auditoría. La secuencia: PosicionAccesorio → Posicion → Nivel → Gondola.

> **[SOLID — SRP]**  
> `EliminarGondolaUseCase` orquesta la cascada. Cada repositorio es responsable de borrar solo su entidad.

> **[HEXAGONAL]**  
> El parámetro `forzar` es parte del Command (`EliminarGondolaCommand { gondolaId, forzar }`). El caso de uso lo lee para decidir si hacer la verificación previa o proceder directamente.
