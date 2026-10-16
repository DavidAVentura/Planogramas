# Contrato: Opciones de filtro del consolidado

**Método:** `GET`  
**Ruta:** `/api/v1/consolidado/tiendas/filtros`  
**Actor:** Analista  
**Permiso:** A (`requiereAnalista`, transitoria — DT-11)  
**Caso de uso:** CU-10-03  

---

## Descripción

Opciones de los modales de tienda y de planograma versión de la vista Consolidado Tiendas.

Capas: `requiereAnalista` → controller (sin `validarQuery` ni limitador; ver deuda en `DEUDA_TECNICA.md`).

---

## Parámetros de entrada

Ninguno. Cualquier parámetro de query → `400 VALIDATION_ERROR` (`schemaFiltros = Joi.object({})`, validado en el controller).

---

## Reglas de negocio

1. `tiendas`: solo tiendas activas con al menos una asignación a una versión `publicado`/`piloto`.
   `totalSkus` = SKUs distintos que monta la tienda (excluye `PENDIENTE`).
2. `versiones`: solo versiones `publicado`/`piloto` con al menos una tienda activa asignada, con la
   forma `VersionElegible` del front. `totalProductos` = SKUs distintos de la versión.
3. Una versión en borrador nunca aparece.

---

## Response — 200 OK

```json
{
  "tiendas":   [ { "id": 7, "codigo": "101", "nombre": "…", "tipo": "GRANDE", "marca": "Cemaco", "totalSkus": 812 } ],
  "versiones": [ { "versionId": 210, "codigo": "AUTOS 02-TG", "estado": "publicado", "nombre": "Autos", "descripcion": null, "departamento": "…", "totalProductos": 54 } ]
}
```

---

## Códigos de error

| Código | `error.code` | Condición |
|--------|--------------|-----------|
| `400` | `VALIDATION_ERROR` | Se envió algún parámetro de query. |
| `401` | — | JWT ausente o inválido. |
| `403` | `FORBIDDEN` | El usuario no cumple la regla A. |
