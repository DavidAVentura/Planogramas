# Contrato: Listar Versiones de un Planograma

**Método:** `GET`  
**Ruta:** `/api/v1/planogramas/{id}/versiones`  
**Actor:** Analista  
**Caso de uso:** CU-02-06  

---

## Descripción

Lista todas las versiones de un planograma con su estado, tipo, tiendas asignadas y métricas de estructura (góndolas, posiciones). Útil para mostrar el historial completo y el estado actual de cada variante.

---

## Parámetros de entrada

### Path Parameters

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `id` | `integer` | Sí | ID del planograma padre. |

### Query Parameters

| Parámetro | Tipo | Default | Descripción |
|-----------|------|---------|-------------|
| `incluirArchivadas` | `boolean` | `false` | Si `true`, incluye versiones con estado `archivado`. |

### Headers

| Header | Valor | Requerido |
|--------|-------|-----------|
| `Authorization` | `Bearer {jwt}` | Sí |

---

## Reglas de negocio

1. Si el planograma no existe, retorna `404`.
2. Por defecto NO se incluyen versiones archivadas.
3. Cada versión incluye sus tiendas asignadas (sin paginación — el número de tiendas por versión es acotado).
4. El listado no está paginado (el número de versiones por planograma es acotado: máx ~20).

---

## Response — 200 OK

```json
{
  "versiones": [
    {
      "id": 10,
      "tipo": "GRANDE",
      "codigo": "AUTOS-TG-01",
      "estado": "publicado",
      "notas": "Versión inicial para tiendas grandes",
      "versionBaseId": null,
      "totalGondolas": 3,
      "totalPosiciones": 48,
      "tiendas": [
        { "id": 1, "codigo": "GTM-PRA", "nombre": "Cemaco Pradera" },
        { "id": 2, "codigo": "GTM-OAK", "nombre": "Cemaco Oakland" }
      ],
      "createdAt": "2026-06-01T10:00:00Z"
    },
    {
      "id": 11,
      "tipo": "GRANDE",
      "codigo": "AUTOS-TG-02",
      "estado": "en_desarrollo",
      "notas": null,
      "versionBaseId": null,
      "totalGondolas": 2,
      "totalPosiciones": 20,
      "tiendas": [],
      "createdAt": "2026-07-05T09:00:00Z"
    }
  ]
}
```

---

## Códigos de error

| Código | Condición |
|--------|-----------|
| `401 Unauthorized` | JWT ausente o inválido. |
| `404 Not Found` | Planograma no existe. |

---

## Anotaciones de arquitectura

> **[HEXAGONAL]**  
> `ListarVersionesUseCase` recibe `planogramaId` y `filtros`. Usa `PlanogramaVersionRepository.findByPlanogramaId(id, filtros)`. El join de tiendas se resuelve en el repositorio (no N+1: usar un segundo query con IN o un join).

> **[CLEAN CODE — N+1 Prevention]**  
> Evitar cargar tiendas con un query por versión. Usar: `SELECT vt.* FROM VersionTienda vt WHERE vt.planograma_version_id IN (@ids)` y mapear en memoria.

> **[SOLID — SRP]**  
> Si el mapeo de "versión + tiendas + métricas" se vuelve complejo, extraer `VersionResumenAssembler` como componente dedicado.
