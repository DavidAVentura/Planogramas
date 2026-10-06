# Módulo 19 — SKU en la versión

Vista **por SKU** de una versión de planograma: un mismo producto puede ocupar varias ubicaciones
(por ejemplo, un bloque vertical en 4 niveles, o dos góndolas). Aquí se ven sus totales sumando
todas sus ubicaciones, y los datos comerciales (mín./máx. final) se editan **una sola vez por SKU**.

Además calcula la **numeración de ganchos**, que no se guarda en ningún lado.

## Sin tabla nueva (decisión 2026-10-05)

Mín./máx. final **siguen guardándose en cada `Posicion`**: así los leen sin cambios la validación
de publicación, el drawer de posición, la vista del Implementador y el % de inventario de "Mi
tienda". Editar mín./máx. por SKU los **aplica a todas las posiciones** de ese SKU en la versión.

## Numeración de ganchos (calculada)

Recorrido, siempre en este orden:

1. Góndolas por `Gondola.orden`.
2. Dentro de cada góndola, sus secciones en orden de recorrido (arriba antes que abajo, izquierda
   antes que derecha); sin dividir = la góndola completa.
3. Dentro de cada sección, sus niveles por `Nivel.orden` (el orden en que el lienzo los dibuja, de
   arriba hacia abajo).
4. Dentro de cada nivel, sus posiciones por `orden_horizontal`.
5. **Un número por facing.** Los espacios pendientes (sin SKU) también reciben número, para que
   asignarles producto no corra la numeración del resto.

Como el número se calcula, mover o insertar un producto renumera todo automáticamente: nadie
tiene que volver a numerar a mano.

## Endpoints

| Método | Ruta | Contrato |
|--------|------|----------|
| `GET` | `/versiones/{id}/skus` | `GET_skus_listar.md` |
| `PATCH` | `/versiones/{id}/skus/{sku}` | `PATCH_skus_editar.md` |
