# Contrato: Historial de Sustituciones

**Método:** `GET`  
**Ruta:** `/api/v1/versiones/{versionId}/sustituciones`  
**Actor:** Analista  
**Caso de uso:** CU-05-04  

---

## Descripción

Lista el historial de sustituciones de SKU realizadas en la versión, paginado. Cada registro muestra el SKU original, el sustituto, motivo, fecha, usuario y posiciones afectadas.

---

## Parámetros de entrada

### Path Parameters

| Parámetro | Tipo | Requerido |
|-----------|------|-----------|
| `versionId` | `integer` | Sí |

### Query Parameters

| Parámetro | Tipo | Default |
|-----------|------|---------|
| `page` | `integer` | `1` |
| `pageSize` | `integer` | `20` |

---

## Response — 200 OK

```json
{
  "data": [
    {
      "id": 3,
      "skuOriginal": "10012345",
      "nombreOriginal": "Aceite 10W30 1L",
      "skuSustituto": "10098765",
      "nombreSustituto": "Aceite 10W30 1L Premium",
      "motivo": "Descontinuación del SKU original según comunicado CATI 2026-07-01",
      "fecha": "2026-07-05T10:30:00Z",
      "usuarioId": "david.ventura@cemaco.com",
      "posicionesAfectadas": [55, 56, 57]
    }
  ],
  "total": 1,
  "page": 1,
  "pageSize": 20
}
```

---

## Códigos de error

| Código | Condición |
|--------|-----------|
| `401 Unauthorized` | JWT ausente. |
| `404 Not Found` | Versión no existe. |

---

## Anotaciones de arquitectura

> **[CLEAN CODE — Auditoría]**  
> `HistorialSustitucion` es una tabla de auditoría append-only. Nunca se hace UPDATE ni DELETE sobre ella. El `posicionesAfectadas` se almacena como JSON array en la BD para no complicar el schema con una tabla pivote.

> **[HEXAGONAL]**  
> `ConsultarHistorialSustitucionesUseCase`. Si en el futuro se necesita proyectar un "estado actual del planograma con todas las sustituciones aplicadas", este historial es la fuente de verdad (event log).
