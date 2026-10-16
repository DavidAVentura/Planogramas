# Solicitud — Importar Excel tomando el bloque TG/TM/TE según la versión

- **Fecha**: 2026-10-15
- **Rama**: `feat/importar-excel-bloque-tamano` (worktree `.claude/worktrees/importar-excel-bloque-tamano`) · **Commit base**: `2a06094d998b8f8e61918f1fb1b059dc1d3317d2`
- **Tamaño**: M — cambia el lector de Excel del front (`excelProductosPlanograma.ts`) y el modal de importación; posible impacto en back si el tamaño de tienda de la versión no está disponible.
- **Etapas**: arquitecto (1, 3) · disenador-ux (si cambia el modal) · seguridad-integridad (2, 5) si toca endpoints/datos · desarrollador · revisor-calidad

## Solicitud del usuario

> Actualmente importa los archivos del planograma, se hace por versión, pero solo tenemos configurada la
> de tienda grande. El archivo Excel que se adjunta tiene tres bloques, TG, TM y TE; según la versión del
> planograma entre estas tres es qué bloque de datos debe tomar.
> Este archivo tiene dos versiones, TG y TM. El extractor, cuando el planograma es TG debe tomar el bloque
> de TG, y cuando es TM debe tomar el bloque de TM, y así mismo para TE. Los bloques son idénticos,
> entonces se pueden tomar de esa forma.

## Contexto adicional

Archivo de ejemplo: `C:\Users\dventura\Downloads\Análisis - Planograma SUAVIZANTES Y LIQUIDO PLANCHAR LIMPIEZA 09.xlsx`
(una hoja "Análisis", 93 filas de SKU, filas 6-98). Estructura observada por el coordinador:

- Fila 2: títulos de bloque — `P`=TIENDA GRANDE, `AO`=TIENDA MEDIANA, `BM`=TIENDA EXPRESS.
- Fila 5: encabezados. Columnas comunes `A`-`N` (Fecha_modificacion … SKU `G` … Temporada `N`).
- Bloque TG `O`-`AL`: Decision_Final_TG, Planograma_TG, TG1..TG10, Facings_TG, Cantidad_X_facing_TG,
  Cantidad_facing_vertical_TG, Min_estetico_TG, Capacidad_maxima_TG, Nombre_accesorio_TG,
  Tamano_accesorio_TG, **Inner** (`AH`, solo existe en TG), Perfil_redondeo_TG, Min_final_TG,
  Max_final_TG, Observaciones_TG. Separador `AM`=".".
- Bloque TM `AN`-`BJ`: mismos campos con sufijo `_TM` / `TM1..TM10`, **sin Inner**. Separador `BK`=".".
- Bloque TE `BL`-`CH`: mismos campos con sufijo `_TE` / `TE1..TE10`, sin Inner.
- Ojo: los bloques no están en posiciones fijas equivalentes (TG tiene una columna más por `Inner`); conviene
  ubicar las columnas por nombre de encabezado con el sufijo del tamaño, no por desplazamiento.
- En la fila 6 el bloque TM trae `Planograma_TM`='LIMPIEZA TG-09' (el nombre puede no coincidir con el sufijo).
- En este archivo el bloque TE viene en 0/vacío (el planograma solo tiene versiones TG y TM).

Hay otra sesión trabajando en paralelo en `feat/ganchos-exhibicion-pdf` (worktree aparte): no tocar ese worktree.

## Preguntas resueltas

| Pregunta | Respuesta del usuario |
|---|---|
| Versión TM/TE con un archivo que solo trae el bloque TG (o falta el bloque de la versión) | **Bloquear**: no se importa; el mensaje indica qué bloque falta. |
| ¿Reimportar versiones TG que pueden tener ganchos de TM mezclados? | **Reimportar a mano**: solo se corrige el lector; sin consulta ni migración de datos. |
| `Planograma_<s>` no coincide con la sigla del bloque (p. ej. 'LIMPIEZA TG-09' en el bloque TM) | **Error bloqueante de revisión**: mostrarlo en la vista de errores ya existente del modal (reutilizarla, con fila/columna como los demás errores); no se importa hasta corregir el archivo. |

## Cambios pedidos en la aprobación 1

