# Contrato: Detalle de Posición (Vista Analista)

**Método:** `GET`  
**Ruta:** `/api/v1/posiciones/{id}`  
**Actor:** Analista  
**Caso de uso:** CU-04-02  

---

## Descripción

Retorna el detalle completo de una posición para el panel de edición del Analista. Incluye todos los campos editables: facings, capacidad, modo, flags, accesorios de montaje y observaciones. No llama a CATI — retorna únicamente datos del modelo de planograma.

---

## Parámetros de entrada

### Path Parameters

| Parámetro | Tipo | Requerido |
|-----------|------|-----------|
| `id` | `integer` | Sí |

---

## Response — 200 OK

```json
{
  "id": 55,
  "nivel_id": 12,
  "sku": "10012345",
  "orden_horizontal": 2,
  "facings_horizontal": 3,
  "cantidad_apilable": 1,
  "unidades_por_facing": 4,
  "ancho_asignado_cm": null,
  "min_final": 3,
  "max_final": 12,
  "perfil_redondeo": "NORMAL",
  "modo": "NORMAL",
  "cross_externo": false,
  "montar_en_display": false,
  "desborda_gondola": false,
  "nota_desborde": null,
  "decision": "ACTIVO",
  "observaciones": "Verificar fecha de vencimiento en bodega",
  "accesorios": [
    {
      "id": 101,
      "accesorio_id": 3,
      "codigo": "G-12",
      "nombre": "Gancho 12 pulgadas",
      "tipo": "GANCHO",
      "nota_libre": "Colocar a la derecha del producto"
    }
  ]
}
```

---

## Códigos de error

| Código | Condición |
|--------|-----------|
| `401 Unauthorized` | JWT ausente. |
| `404 Not Found` | Posición no existe. |

---

## Anotaciones de arquitectura

> **[CLEAN CODE — Sin enriquecimiento]**  
> A diferencia de `GET /posiciones/{id}/detalle` (vista Implementador), este endpoint no consulta CATI. Retorna únicamente datos del modelo de planograma almacenados en SQL Server.

> **[HEXAGONAL — Separación de puertos]**  
> `ObtenerPosicionAnalistaUseCase` usa solo `IPosicionRepository.findByIdConAccesorios(id)`. No depende del puerto `ICatalogoService`.
