# Contrato: Eliminar Nivel

**Método:** `DELETE`  
**Ruta:** `/api/v1/niveles/{id}`  
**Actor:** Analista  
**Caso de uso:** CU-03-08  

---

## Descripción

Elimina un nivel. Si tiene posiciones, requiere `forzar=true` para eliminar en cascada (posiciones + accesorios de posición). La versión padre debe estar en modo editable.

---

## Parámetros de entrada

### Path Parameters

| Parámetro | Tipo | Requerido |
|-----------|------|-----------|
| `id` | `integer` | Sí |

### Query Parameters

| Parámetro | Tipo | Default |
|-----------|------|---------|
| `forzar` | `boolean` | `false` |

---

## Reglas de negocio

1. Si el nivel tiene posiciones y `forzar=false` → `409`.
2. Con `forzar=true`: DELETE en cascada `PosicionAccesorio` → `Posicion` → `Nivel`.
3. Versión padre en modo editable.

---

## Response — 204 No Content

Sin body.

---

## Códigos de error

| Código | Condición |
|--------|-----------|
| `401 Unauthorized` | JWT ausente. |
| `404 Not Found` | Nivel no existe. |
| `409 Conflict` | Nivel tiene posiciones y `forzar=false`. |
| `422 Unprocessable Entity` | Versión no editable. |

```json
// 409 Conflict
{
  "error": "El nivel tiene posiciones asignadas. Usa forzar=true para eliminar en cascada.",
  "totalPosiciones": 6
}
```

---

## Anotaciones de arquitectura

> **[CLEAN CODE]**  
> Mismo patrón que DELETE de góndola. El frontend llama primero a `GET /niveles/{id}/resumen`, muestra confirmación y luego llama al DELETE con el flag apropiado.

> **[SOLID — SRP]**  
> `EliminarNivelUseCase` no debe saber sobre góndolas ni versiones directamente. Recibe `(nivelId, forzar)` y delega al repositorio.
