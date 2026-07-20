# Contrato: Exportar Versión a JSON

**Método:** `GET`  
**Ruta:** `/api/v1/versiones/{id}/exportar/json`  
**Actor:** Analista  
**Caso de uso:** CU-06-03  

---

## Descripción

Genera y descarga el planograma completo en formato JSON. Estructura anidada estable para integración con sistemas externos. El archivo se descarga directamente con `Content-Disposition: attachment`.

---

## Parámetros de entrada

### Path Parameters

| Parámetro | Tipo | Requerido |
|-----------|------|-----------|
| `id` | `integer` | Sí |

### Headers

| Header | Valor |
|--------|-------|
| `Accept` | `application/json` |
| `Authorization` | `Bearer {jwt}` |

---

## Reglas de negocio

1. Disponible para versiones en cualquier estado (incluso borrador — el Analista puede exportar para revisión).
2. El archivo se nombra con el código de la versión: `{CODIGO}.json`. Ej: `AUTOS 01-TG.json`.
3. La estructura JSON es **estable** — no puede cambiar sin versionado de API, ya que sistemas externos pueden depender de ella.

---

## Response — 200 OK

**Headers de respuesta:**
```
Content-Type: application/json
Content-Disposition: attachment; filename="AUTOS 01-TG.json"
```

**Body:**
```json
{
  "version": {
    "id": 10,
    "codigo": "AUTOS 01-TG",
    "tipo": "GRANDE",
    "estado": "publicado"
  },
  "planograma": {
    "nombre": "AUTOS 01",
    "departamento": "AUTOS"
  },
  "gondolas": [
    {
      "nombre": "Góndola A",
      "ancho_cm": 120,
      "alto_cm": 180,
      "profundidad_cm": 40,
      "posicion_en_tienda": "Pasillo 3",
      "orden": 1,
      "niveles": [
        {
          "orden": 1,
          "altura_desde_piso_cm": 30,
          "tipo_accesorio": "GANCHO",
          "tamano_accesorio_pulgadas": 12,
          "ancho_disponible_cm": 120,
          "posiciones": [
            {
              "orden_horizontal": 1,
              "sku": "10012345",
              "facings_horizontal": 3,
              "ancho_asignado_cm": 27,
              "capacidad_maxima": 12,
              "min_final": 3,
              "max_final": 12,
              "modo": "NORMAL",
              "decision": "ACTIVO",
              "accesorios": [
                {
                  "codigo": "G-12",
                  "nombre": "Gancho 12 pulgadas",
                  "tipo": "GANCHO",
                  "nota_libre": "Colocar a la derecha"
                }
              ]
            }
          ]
        }
      ]
    }
  ]
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

> **[CLEAN CODE — Estabilidad de contrato]**  
> El schema JSON de exportación debe estar versionado y documentado por separado. Si se necesita cambiar la estructura, crear `/exportar/v2/json` sin romper la versión actual.

> **[SOLID — SRP]**  
> La construcción del JSON de exportación es responsabilidad de un `PlanogramaExportMapper` dedicado. No mezclar la lógica de exportación con el repositorio ni con el caso de uso de edición.

> **[HEXAGONAL — Puerto de salida]**  
> Definir una interfaz `IExportacionService` con `exportarJSON(versionId): PlanogramaExportDTO`. La implementación SQL de la consulta vive en `PlanogramaExportRepository`, que hereda de `IExportacionRepository`.
