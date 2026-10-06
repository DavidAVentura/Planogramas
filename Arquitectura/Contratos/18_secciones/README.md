# Módulo 18 — Secciones de góndola

Parte una góndola en **secciones** (columnas o franjas, anidables), cada una con sus propios
niveles. Resuelve muebles donde una parte tiene niveles distintos a otra: por ejemplo, un panel de
ganchos dividido en varias columnas arriba y repisas de ancho completo abajo, o una columna con 5
niveles al lado de otra con 4.

Es **aditivo**: una góndola sin secciones se comporta exactamente igual que antes (sus niveles
ocupan todo el ancho). Ningún endpoint existente cambió su comportamiento.

## Modelo

Tabla `Seccion` (migración `012_secciones_gondola.js`), guardada como **árbol** por góndola:

| Columna | Tipo | Nota |
|---------|------|------|
| `id` | int PK | |
| `gondola_id` | int FK `Gondola` | `ON DELETE CASCADE` |
| `padre_id` | int FK `Seccion` | null en la raíz; sin cascada (auto-referencia) |
| `es_division` | bit | 1 = reparte su espacio entre sus hijas; 0 = hoja (sección con niveles) |
| `direccion` | nvarchar(10) | `COLUMNAS` (izquierda → derecha) o `FILAS` (arriba → abajo); solo divisiones |
| `orden` | int | orden entre hermanas |
| `tam_cm` | decimal(8,2) | medida en la dirección del padre |

Y `Nivel.seccion_id` (int FK `Seccion`, **nullable**, sin cascada — SQL Server no admite una
segunda ruta de cascada Gondola → Seccion → Nivel, error 1785).

Reglas del árbol:

- **La última hija toma lo que sobre** del espacio de su padre: un cambio de ancho/alto de la
  góndola nunca deja huecos ni desbordes. `tam_cm` de la última hija es informativo.
- Góndola **sin filas** en `Seccion` = sin dividir. Los niveles con `seccion_id` null pertenecen a
  la góndola completa (o, si la góndola ya está dividida, a la primera sección).
- Medida mínima de una sección: **10 cm** en la dirección de su padre.
- Si al quitar secciones queda una sola, la góndola vuelve a "sin dividir": se borran las filas de
  `Seccion` y los niveles quedan con `seccion_id` null.
- `ancho_disponible_cm` de cada nivel se iguala al ancho de su sección en cada operación de
  estructura (solo en góndolas divididas).
- Las secciones solo cambian geometría: **nunca tocan posiciones**.
- Dentro de una sección, el orden vertical de los niveles es `Nivel.orden` (el mismo con que el
  lienzo los dibuja: orden menor arriba).

Efectos en módulos existentes:

- **Copiar versión** (`clonarEstructura`, usado al crear versiones y especiales por tienda): copia
  también el árbol de secciones con ids nuevos y reasigna `Nivel.seccion_id` a las secciones de la
  góndola nueva.
- **Eliminar góndola**: borra también sus secciones.
- **Agregar nivel** (`POST /gondolas/{id}/niveles`): acepta `seccion_id` opcional — ver
  `04_niveles/POST_niveles_agregar.md`. Las respuestas de niveles incluyen `seccionId`.

## Endpoints

| Método | Ruta | Contrato |
|--------|------|----------|
| `GET` | `/gondolas/{id}/secciones` | `GET_secciones_obtener.md` |
| `POST` | `/gondolas/{id}/secciones/dividir` | `POST_secciones_dividir.md` |
| `PATCH` | `/secciones/{id}` | `PATCH_secciones_redimensionar.md` |
| `DELETE` | `/secciones/{id}` | `DELETE_secciones_quitar.md` |

Las operaciones de escritura exigen que la versión de la góndola esté en un estado editable
(`borrador`, `en_desarrollo` o `piloto`); si no → `422 UNPROCESSABLE`.

Todas las operaciones responden con la **estructura completa actualizada** (mismo cuerpo que
`GET /gondolas/{id}/secciones`), para que el front redibuje sin otra llamada.

En el front, la estructura se edita desde el **detalle de góndola**
(`/planogramas/{id}/versiones/{versionId}/lienzo/gondola/{gondolaId}`, botón de expandir del marco de
la góndola en el lienzo).
