# Contrato: Resumen de versión

**Método:** `GET`  
**Ruta:** `/api/v1/versiones/{id}/resumen`  
**Actor:** Analista  
**Caso de uso:** CU-02-06  

---

## Descripción

Ficha de solo lectura de una versión, para el modal "Ver versión" de la vista Estructura: datos de
la versión y de su planograma, conteos de estructura y tiendas que la montan. Los adjuntos se piden
aparte a `GET /versiones/{id}/adjuntos`. El botón "Ver lienzo" del modal abre
`/planogramas/{planogramaId}/versiones/{id}/lienzo` en otra pestaña.

- `version.versionBase`: la base de una especial (`null` en la línea base).
- `version.reemplazaA`: solo para una piloto de línea base, la publicada del mismo tipo que
  reemplazará al publicarse (`null` si es la primera de ese tipo o no es piloto).
- `estructura.productos`: SKUs distintos. `metrosLineales`: suma del ancho de las góndolas.

---

## Response — 200 OK

```json
{
  "version": {
    "id": 16011,
    "planogramaId": 160,
    "tipo": "GRANDE",
    "codigo": "ALFOMBRAS DE AUTO-TG",
    "estado": "piloto",
    "notas": "Piloto con nuevo acomodo por marca",
    "versionBaseId": null,
    "versionBase": null,
    "reemplazaA": { "id": 16001, "codigo": "ALFOMBRAS DE AUTO-TG" },
    "createdAt": "2026-08-10T09:05:00.000Z",
    "updatedAt": "2026-09-14T11:00:00.000Z"
  },
  "planograma": {
    "id": 160,
    "nombre": "ALFOMBRAS DE AUTO",
    "departamento": "Automotriz",
    "estado": "activo",
    "subcategorias": ["(01-0025-993-920399-20573) ALFOMBRAS DE HULE AUTOS"]
  },
  "estructura": {
    "gondolas": 3,
    "niveles": 15,
    "posiciones": 96,
    "productos": 79,
    "metrosLineales": 3.6,
    "posicionesPorModo": { "PLANOGRAMA": 88, "CROSS": 5, "IMPULSO": 3, "PENDIENTE": 0 }
  },
  "tiendas": [
    { "id": 1, "codigo": "T0PC", "nombre": "Cemaco Pradera", "tipo": "GRANDE" }
  ]
}
```

---

## Códigos de error

| Código | Condición |
|--------|-----------|
| `400 Bad Request` | `id` no es un entero positivo. |
| `404 Not Found` | La versión no existe. |
