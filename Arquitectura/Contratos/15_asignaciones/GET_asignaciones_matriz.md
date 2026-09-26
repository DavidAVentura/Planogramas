# Contrato: Matriz de asignaciones

**Método:** `GET`  
**Ruta:** `/api/v1/asignaciones`  
**Actor:** Analista (el Implementador la ve en solo lectura)  
**Caso de uso:** CU-02-05  

---

## Descripción

Alimenta la vista **Estructura** (`/estructura` en el front): una matriz planograma × tienda que
dice qué versión de cada planograma monta cada tienda.

Regla del dominio: **una tienda monta una sola versión por planograma**, publicada (TG/TM/TE o su
especial) o en piloto. Solo cuentan como asignación las filas de `VersionTienda` cuya versión está
en `publicado` o `piloto`; una versión en borrador/en_desarrollo asignada a una tienda no se monta.

- `tiendas`: solo tiendas activas.
- `planogramas`: planogramas no archivados con al menos una versión publicada o en piloto. Cada
  uno trae **todas** sus versiones no archivadas, para que el front sepa qué TG/TM/TE existen
  publicadas o en piloto y si una tienda ya tiene una especial en proceso (borrador/desarrollo).
- `tiendaEspecialId`: tienda dueña de una versión especial. Sale de `VersionTienda`; si la
  especial quedó sin asignar, del sufijo de su código (`…-TG-T0PC`). `null` en la línea base.
- `asignaciones`: una fila por versión montada en una tienda activa.

Sin paginación ni filtros: la cadena tiene < 50 tiendas y los filtros (departamento, tipo de
tienda, búsqueda) se resuelven en el cliente.

---

## Response — 200 OK

```json
{
  "tiendas": [
    { "id": 1, "codigo": "T0PC", "nombre": "Cemaco Pradera", "tipo": "GRANDE", "marca": "Cemaco" }
  ],
  "planogramas": [
    {
      "id": 161,
      "nombre": "Autos 01",
      "departamento": "Automotriz",
      "versiones": [
        { "id": 16101, "codigo": "AUTOS 01-TG", "tipo": "GRANDE", "estado": "publicado", "versionBaseId": null, "tiendaEspecialId": null },
        { "id": 16111, "codigo": "AUTOS 01-TG", "tipo": "GRANDE", "estado": "piloto", "versionBaseId": null, "tiendaEspecialId": null },
        { "id": 16141, "codigo": "AUTOS 01-TG-T0PC", "tipo": "GRANDE", "estado": "publicado", "versionBaseId": 16101, "tiendaEspecialId": 1 }
      ]
    }
  ],
  "asignaciones": [
    { "planogramaId": 161, "tiendaId": 1, "versionId": 16141 }
  ]
}
```

---

## Códigos de error

| Código | Condición |
|--------|-----------|
| `401 Unauthorized` | Sin sesión, cuando el guard de autenticación esté activo. |

---

## Anotaciones de arquitectura

- Módulo sin paginación, igual que `GET /tiendas`.
- Datos previos a la regla "una sola versión" pueden traer dos filas para la misma celda; el front
  muestra la piloto y el siguiente guardado de esa celda deja una sola.
