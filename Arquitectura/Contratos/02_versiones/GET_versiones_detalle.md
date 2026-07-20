# Contrato: Obtener Detalle Completo de Versión

**Método:** `GET`  
**Ruta:** `/api/v1/versiones/{id}`  
**Actor:** Analista / Implementador  
**Caso de uso:** CU-01-05 (detalle de versión)  

---

## Descripción

Retorna el detalle completo de una versión: todas sus góndolas, con sus niveles y posiciones anidadas. Es el endpoint principal para cargar el editor de planogramas.

---

## Parámetros de entrada

### Path Parameters

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `id` | `integer` | Sí | ID de la versión. |

### Query Parameters

| Parámetro | Tipo | Default | Descripción |
|-----------|------|---------|-------------|
| `vistaImplementador` | `boolean` | `false` | Si `true`, filtra solo posiciones con `decision=ACTIVO` (vista de solo lectura para implementadores). |

### Headers

| Header | Valor | Requerido |
|--------|-------|-----------|
| `Authorization` | `Bearer {jwt}` | Sí |

---

## Reglas de negocio

1. Si la versión no existe, retorna `404`.
2. La estructura retornada incluye **todos** los campos de posición (para poder renderizar el editor completo).
3. Con `vistaImplementador=true`, se excluyen posiciones con `decision != 'ACTIVO'`.
4. El orden de los datos: góndolas por `orden ASC`, niveles por `orden ASC`, posiciones por `orden_horizontal ASC`.

---

## Response — 200 OK

```json
{
  "id": 10,
  "planogramaId": 42,
  "codigo": "AUTOS 01-TG",
  "tipo": "GRANDE",
  "estado": "publicado",
  "notas": "Versión inicial",
  "gondolas": [
    {
      "id": 1,
      "nombre": "Góndola A",
      "ancho_cm": 120,
      "alto_cm": 180,
      "profundidad_cm": 40,
      "posicion_en_tienda": "Pasillo 3",
      "orden": 1,
      "niveles": [
        {
          "id": 1,
          "orden": 1,
          "altura_desde_piso_cm": 30,
          "tipo_accesorio": "GANCHO",
          "accesorio": { "id": 5, "codigo": "G-12", "nombre": "Gancho 12 pulgadas" },
          "tamano_accesorio_pulgadas": 12,
          "ancho_disponible_cm": 120,
          "notas": null,
          "posiciones": [
            {
              "id": 1,
              "orden_horizontal": 1,
              "sku": "10012345",
              "facings_horizontal": 3,
              "ancho_asignado_cm": 27,
              "cantidad_apilable": 1,
              "unidades_por_facing": 4,
              "capacidad_maxima": 12,
              "min_estetico": 4,
              "min_final": 3,
              "max_final": 12,
              "perfil_redondeo": "NORMAL",
              "modo": "NORMAL",
              "decision": "ACTIVO",
              "cross_externo": false,
              "montar_en_display": false,
              "desborda_gondola": false,
              "nota_desborde": null,
              "observaciones": null
            }
          ]
        }
      ]
    }
  ],
  "createdAt": "2026-06-01T10:00:00Z"
}
```

---

## Códigos de error

| Código | Condición |
|--------|-----------|
| `401 Unauthorized` | JWT ausente o inválido. |
| `404 Not Found` | Versión no encontrada. |

---

## Anotaciones de arquitectura

> **[HEXAGONAL — Read Model]**  
> Este endpoint es de lectura pura y costosa (múltiples joins). Usar un **Read Model** con una query SQL optimizada, separada del repositorio de escritura. Considerar cacheo por `versionId` con invalidación en cada mutación de CU-03/CU-04.

> **[CLEAN CODE — Árbol anidado]**  
> La construcción del árbol góndola→nivel→posición se hace en el Application Service mapeando los resultados planos del SQL. No retornar rows crudas al controlador.

> **[SOLID — DIP]**  
> El controlador depende de la interfaz `IVersionReadRepository`, no de la implementación SQL directa.

> **[CLEAN CODE — Paginación futura]**  
> Aunque hoy se retorna todo, documentar el riesgo: versiones con muchas góndolas (>20) y muchas posiciones (>500) pueden ser pesadas. Diseñar el endpoint de forma que en el futuro se pueda paginar por góndola sin breaking change.
