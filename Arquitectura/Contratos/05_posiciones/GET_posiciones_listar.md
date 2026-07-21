# Contrato: Listar Posiciones de un Nivel

**Método:** `GET`
**Ruta:** `/api/v1/niveles/{nivelId}/posiciones`
**Actor:** Analista
**Caso de uso:** CU-01-05

---

## Descripción

Lista las posiciones de un nivel ordenadas por `orden_horizontal`, junto con la capacidad
disponible restante del nivel. Es el endpoint que alimenta la grilla de tarjetas del Editor.

A diferencia de `GET /posiciones/{id}` (vista Analista para el panel de edición, ver
`GET_posiciones_detalle_analista.md`), cada posición de este listado incluye un campo `producto`
con datos livianos (`nombre`, `imagen_url`, `ancho_cm`) leídos de la tabla local `Producto` — sin
llamar a CATI — para que el Editor pueda pintar la imagen real de cada tarjeta sin un request
adicional por SKU.

---

## Parámetros de entrada

### Path Parameters

| Parámetro | Tipo      | Requerido |
|-----------|-----------|-----------|
| `nivelId` | `integer` | Sí        |

---

## Response — 200 OK

```json
{
  "posiciones": [
    {
      "id": 55,
      "nivelId": 7,
      "sku": "10012345",
      "orden_horizontal": 1,
      "ancho_asignado_cm": 27,
      "facings_horizontal": 3,
      "cantidad_apilable": 1,
      "unidades_por_facing": 4,
      "capacidad_maxima": 12,
      "min_estetico": 4,
      "min_final": 3,
      "max_final": 12,
      "perfil_redondeo": "MRP",
      "modo": "PLANOGRAMA",
      "cross_externo": false,
      "montar_en_display": false,
      "desborda_gondola": false,
      "nota_desborde": null,
      "decision": "ACTIVO",
      "observaciones": null,
      "producto": {
        "nombre": "Aceite Motor 10W30 1L",
        "imagen_url": "https://vtex.cemaco.com/productos/10012345_XL.jpg",
        "ancho_cm": 9.0
      }
    }
  ],
  "capacidad": {
    "ancho_disponible_cm": 120,
    "ancho_ocupado_cm": 27,
    "ancho_libre_cm": 93
  }
}
```

Si el SKU de la posición todavía no se sincronizó localmente desde CATI (nunca se consultó por
`GET /catalog/productos/{sku}`), `producto` es `null` — el frontend debe mostrar un placeholder.

---

## Códigos de error

| Código          | Condición         |
|-----------------|--------------------|
| `401 Unauthorized` | JWT ausente.    |
| `404 Not Found`    | Nivel no existe. |

---

## Anotaciones de arquitectura

> **[CLEAN CODE — Enriquecimiento local, no CATI]**
> El `LEFT JOIN` a `Producto` en `PosicionRepository.listarPorNivel` lee únicamente la tabla local
> ya sincronizada — no depende del puerto `ICatalogoService` ni hace ninguna llamada de red. No es
> el mismo "enriquecimiento" que documenta `GET /posiciones/{id}/detalle` (vista Implementador,
> que sí consulta CATI en vivo).

> **[SOLID — Alcance del cambio]**
> Este enriquecimiento aplica solo a `listarPorNivel`. `GET /posiciones/{id}` (vista Analista) se
> mantiene sin cambios — sigue devolviendo únicamente datos del modelo de planograma, como
> documenta su propio contrato.
