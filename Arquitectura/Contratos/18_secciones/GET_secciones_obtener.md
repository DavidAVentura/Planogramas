# Contrato: Obtener secciones de una góndola

**Método:** `GET`  
**Ruta:** `/api/v1/gondolas/{gondolaId}/secciones`  
**Actor:** Analista  
**Caso de uso:** CU-03-12  

---

## Descripción

Devuelve el árbol de secciones de la góndola y, para cada sección final (hoja), su rectángulo en
cm y los niveles que contiene. Una góndola sin dividir responde `dividida: false`, `raiz: null` y
`hojas: []`.

---

## Parámetros de entrada

| Parámetro | Ubicación | Tipo | Requerido |
|-----------|-----------|------|-----------|
| `gondolaId` | path | `integer` | Sí |

---

## Reglas de negocio

1. Las hojas se listan en **orden de recorrido**: arriba antes que abajo, izquierda antes que
   derecha. `indice` (1, 2, 3…) es el número con que la UI las muestra (S1, S2…).
2. `xCm`/`yCm` se miden desde la esquina **superior izquierda** de la góndola.
3. `nivelIds` incluye, en la primera hoja, los niveles que todavía no tienen `seccion_id` (creados
   por un flujo que no conoce las secciones).
4. Disponible en cualquier estado de la versión (solo lectura).

---

## Response — 200 OK

```json
{
  "gondolaId": 23,
  "anchoCm": 122,
  "altoCm": 213,
  "dividida": true,
  "raiz": {
    "id": 26,
    "esDivision": true,
    "direccion": "FILAS",
    "tamCm": 213,
    "hijos": [
      {
        "id": 29,
        "esDivision": true,
        "direccion": "COLUMNAS",
        "tamCm": 107,
        "hijos": [
          { "id": 24, "esDivision": false, "direccion": null, "tamCm": 82, "hijos": [] },
          { "id": 28, "esDivision": false, "direccion": null, "tamCm": 40, "hijos": [] }
        ]
      },
      { "id": 25, "esDivision": false, "direccion": null, "tamCm": 106, "hijos": [] }
    ]
  },
  "hojas": [
    { "id": 24, "indice": 1, "xCm": 0,  "yCm": 0,   "anchoCm": 82,  "altoCm": 107, "nivelIds": [36, 37] },
    { "id": 28, "indice": 2, "xCm": 82, "yCm": 0,   "anchoCm": 40,  "altoCm": 107, "nivelIds": [41, 42] },
    { "id": 25, "indice": 3, "xCm": 0,  "yCm": 107, "anchoCm": 122, "altoCm": 106, "nivelIds": [38, 39] }
  ]
}
```

---

## Códigos de error

| Código | `error.code` | Condición |
|--------|--------------|-----------|
| `400` | `VALIDATION_ERROR` | `gondolaId` no es un entero positivo. |
| `401` | — | JWT ausente o inválido. |
| `404` | `NOT_FOUND` | La góndola no existe. |
