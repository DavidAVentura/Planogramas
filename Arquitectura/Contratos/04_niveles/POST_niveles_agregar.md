# Contrato: Agregar Nivel a Góndola

**Método:** `POST`  
**Ruta:** `/api/v1/gondolas/{gondolaId}/niveles`  
**Actor:** Analista  
**Caso de uso:** CU-03-05  

---

## Descripción

Agrega un nuevo nivel a una góndola. El nivel define la altura desde el piso, el tipo y modelo de accesorio (gancho, bandeja, etc.) y el ancho disponible para colocar productos.

---

## Parámetros de entrada

### Path Parameters

| Parámetro | Tipo | Requerido |
|-----------|------|-----------|
| `gondolaId` | `integer` | Sí |

### Body (JSON)

| Campo | Tipo | Requerido | Validación |
|-------|------|-----------|------------|
| `orden` | `integer` | Sí | Posición vertical dentro de la góndola. Mayor a 0. |
| `altura_desde_piso_cm` | `number` | Sí | Mayor a 0, menor que el alto de la góndola. |
| `tipo_accesorio` | `string` | Sí | Valores: `GANCHO`, `BANDEJA`, `BARRA`, `CANASTA`, `OTRO`. |
| `codigo_accesorio_id` | `integer` | No | FK a tabla `Accesorio`. |
| `tamano_accesorio_pulgadas` | `number` | No | Mayor a 0. Aplica principalmente para ganchos. |
| `ancho_disponible_cm` | `number` | Sí | Ancho útil del nivel para posiciones. Por defecto = `gondola.ancho_cm`. |
| `notas` | `string` | No | Máximo 200 chars. |
| `seccion_id` | `integer` | No | Solo en góndolas divididas en secciones (módulo 18): sección final (hoja) donde se crea el nivel. Se omite en góndolas sin dividir. |

---

## Reglas de negocio

1. La versión padre de la góndola debe estar en modo editable.
2. `ancho_disponible_cm` por defecto se sugiere igual al `ancho_cm` de la góndola, pero puede ser menor (ej. si hay una columna o fijación).
3. Si se envía `codigo_accesorio_id`, debe existir en la tabla `Accesorio`.
4. `orden` puede no ser secuencial — el cliente define el valor deseado. Si hay conflicto de orden, el backend lo resuelve desplazando los siguientes.
5. Si viene `seccion_id`, debe ser una hoja de esta góndola (ver `18_secciones/README.md`). El
   `orden` sigue siendo de toda la góndola: el desplazamiento de la regla 4 conserva el orden
   relativo de los niveles dentro de cada sección. En el front, `ancho_disponible_cm` se precarga
   con el ancho de la sección.

---

## Request JSON

```json
{
  "orden": 3,
  "altura_desde_piso_cm": 90,
  "tipo_accesorio": "GANCHO",
  "codigo_accesorio_id": 5,
  "tamano_accesorio_pulgadas": 12,
  "ancho_disponible_cm": 120,
  "notas": "Nivel para aceites largos"
}
```

---

## Response — 201 Created

```json
{
  "id": 7,
  "gondolaId": 1,
  "orden": 3,
  "altura_desde_piso_cm": 90,
  "tipo_accesorio": "GANCHO",
  "accesorio": {
    "id": 5,
    "codigo": "G-12",
    "nombre": "Gancho 12 pulgadas"
  },
  "tamano_accesorio_pulgadas": 12,
  "ancho_disponible_cm": 120,
  "notas": "Nivel para aceites largos",
  "seccionId": null
}
```

`seccionId` (migración 012) es `null` en góndolas sin dividir. Todas las respuestas de niveles
(`GET /gondolas/{id}/niveles`, `GET /niveles/{id}`, `PATCH /niveles/{id}`) lo incluyen.

---

## Códigos de error

| Código | Condición |
|--------|-----------|
| `400 Bad Request` | Campos inválidos. |
| `401 Unauthorized` | JWT ausente. |
| `404 Not Found` | Góndola no existe, `codigo_accesorio_id` no existe, o `seccion_id` no pertenece a la góndola. |
| `422 Unprocessable Entity` | Versión no editable, o `seccion_id` es una división (no una hoja). |

---

## Anotaciones de arquitectura

> **[HEXAGONAL]**  
> `AgregarNivelUseCase` recibe el command, verifica la versión padre (carga la góndola → versión → verifica estado), y delega la inserción al `NivelRepository`.

> **[SOLID — SRP]**  
> La lookup de la versión padre (góndola → versión) es responsabilidad del repositorio, no del caso de uso. Exponer `GondolaRepository.findWithVersion(gondolaId)` que retorna la góndola con su versión embebida.

> **[CLEAN CODE — Value Object]**  
> `TipoAccesorio` puede ser un enum con sus valores permitidos. Validar en el DTO de entrada antes de llegar al caso de uso.
