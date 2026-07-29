# Contrato: Resumen de Nivel (previa a eliminación)

**Método:** `GET`  
**Ruta:** `/api/v1/niveles/{id}/resumen`  
**Actor:** Analista  

---

## Descripción

Retorna conteo de posiciones en el nivel. Usado por el frontend antes del diálogo de confirmación de eliminación.

---

## Response — 200 OK

```json
{
  "id": 7,
  "gondolaNombre": "Góndola A",
  "orden": 3,
  "totalPosiciones": 6
}
```

---

## Códigos de error

| Código | Condición |
|--------|-----------|
| `401 Unauthorized` | JWT ausente. |
| `404 Not Found` | Nivel no existe. |
