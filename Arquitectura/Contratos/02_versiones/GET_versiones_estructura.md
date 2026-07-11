# Contrato: Estructura de Versión (Vista Implementador)

**Método:** `GET`  
**Ruta:** `/api/v1/versiones/{versionId}/estructura`  
**Actor:** Implementador  
**Caso de uso:** CU-07-01  

---

## Descripción

Retorna la estructura completa de una versión publicada en formato de solo lectura para el Implementador: góndolas, niveles y posiciones activas (con `decision = 'ACTIVO'`). No incluye metadatos de edición ni errores bloqueantes.

---

## Parámetros de entrada

### Path Parameters

| Parámetro | Tipo | Requerido |
|-----------|------|-----------|
| `versionId` | `integer` | Sí |

### Query Parameters

| Parámetro | Tipo | Default | Descripción |
|-----------|------|---------|-------------|
| `vistaImplementador` | `boolean` | `false` | Si `true`, filtra solo posiciones con `decision=ACTIVO`. |

---

## Reglas de negocio

1. La versión debe estar en estado `publicado`. Si no, retorna `403`.
2. Con `vistaImplementador=true`, solo se incluyen posiciones con `decision = 'ACTIVO'`.
3. No incluye campos de control de inventario sensibles (`min_final`, `max_final`).

---

## Response — 200 OK

```json
{
  "versionId": 10,
  "codigo": "AUTOS-TG-01",
  "tipo": "GRANDE",
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
          "accesorio": { "codigo": "G-12", "nombre": "Gancho 12 pulgadas" },
          "tamano_accesorio_pulgadas": 12,
          "posiciones": [
            {
              "id": 55,
              "sku": "10012345",
              "facings_horizontal": 3,
              "cantidad_apilable": 1,
              "modo": "NORMAL",
              "montar_en_display": false,
              "desborda_gondola": false,
              "nota_desborde": null,
              "observaciones": null
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
| `403 Forbidden` | La versión no está publicada. |
| `404 Not Found` | Versión no existe. |

---

## Anotaciones de arquitectura

> **[SOLID — SRP]**  
> Mantener este endpoint separado del `GET /versiones/{id}` del Analista. Tienen propósitos distintos: uno es para edición (todos los campos), otro es para implementación (campos de montaje).

> **[CLEAN CODE — Principio del Menor Conocimiento]**  
> El Implementador no necesita `min_final`, `max_final`, ni los campos de capacidad detallados. Omitirlos de la respuesta reduce la superficie de datos sensibles expuesta.
