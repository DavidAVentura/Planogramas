# Contrato: Obtener Detalle de Planograma

**Método:** `GET`  
**Ruta:** `/api/v1/planogramas/{id}`  
**Actor:** Analista / Implementador  
**Caso de uso:** CU-01-05  

---

## Descripción

Retorna el detalle completo de un planograma: metadatos, subcategorías de referencia y un resumen de todas sus versiones (con conteo de góndolas y tiendas asignadas por versión).

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

---

## Reglas de negocio

1. Si el planograma no existe, retorna `404`.
2. El resumen de versiones incluye **todas** las versiones (incluyendo archivadas).
3. Las acciones disponibles (editar, archivar, crear versión) las decide el frontend en base al campo `estado` — el backend no las filtra.

---

## Response — 200 OK

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
  "versiones": [
    {
      "id": 10,
      "tipo": "GRANDE",
      "codigo": "AUTOS-TG-01",
      "estado": "publicado",
      "totalGondolas": 3,
      "totalTiendas": 2
    },
    {
      "id": 11,
      "tipo": "MEDIANA",
      "codigo": "AUTOS-TM-01",
      "estado": "borrador",
      "totalGondolas": 0,
      "totalTiendas": 0
    }
  ],
  "createdAt": "2026-07-01T10:00:00Z",
  "createdBy": "david.ventura@cemaco.com"
}
```

---

## Códigos de error

| Código | Condición |
|--------|-----------|
| `401 Unauthorized` | JWT ausente o inválido. |
| `404 Not Found` | No existe un planograma con el `id` indicado. |

```json
// 404 Not Found
{
  "error": "Planograma no encontrado",
  "id": 99
}
```

---

## Anotaciones de arquitectura

> **[HEXAGONAL — Composición de query]**  
> Este endpoint agrega datos de tres tablas (`Planograma`, `PlanogramaSubcategoria`, `PlanogramaVersion`). Si la lógica de composición es compleja, usar un **Read Model** separado (patrón CQRS ligero): una query SQL de lectura optimizada no tiene que pasar por el mismo repositorio que hace el CRUD.

> **[SOLID — ISP]**  
> Definir `IPlanogramaReadRepository` (solo lectura: `findById`, `findAll`) separado de `IPlanogramaWriteRepository` (escritura: `save`, `update`). El caso de uso de consulta depende solo del contrato de lectura.

> **[CLEAN CODE]**  
> Nombrar el resultado del join como `PlanogramaDetalle` o `PlanogramaView` para distinguirlo de la entidad de dominio `Planograma`.
