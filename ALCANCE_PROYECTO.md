# Alcance del Proyecto: Foto a Planograma IA

## Objetivo

Crear una herramienta web para agilizar el armado de planogramas en Cemaco, iniciando con la categoria de Autos. El flujo busca que el equipo de tienda o categorias pueda seleccionar tienda, categoria y tipo de mueble, tomar fotos guiadas con un telefono normal, recibir una propuesta de realogram/planograma y corregirla rapidamente.

El objetivo no es reemplazar al comprador o al equipo de categorias, sino reducir captura manual, acelerar validacion visual y conectar el planograma con datos de catalogo, imagenes oficiales y, en una etapa posterior, ventas e inventario.

## Alcance MVP

- Categoria inicial: Autos, incluyendo aceites, pulidores, accesorios, cuidado vehicular, hidrolavadoras y productos relacionados.
- Tienda piloto: Cemaco Pradera.
- Fuente de productos inicial: catalogo disponible en `Autos.xlsx`, enriquecido con imagenes VTEX cuando existan.
- Fuente de muebles inicial: consolidado de accesorios/merchandising disponible en el proyecto.
- Salida principal: planograma editable en web.
- El sistema trabaja con sku en formato `sku ########` cuando aplica.
- El usuario puede corregir sku, facings y posiciones antes de guardar/exportar.

## Flujo Principal

1. Seleccionar tienda, categoria y tipo de mueble/rack.
2. La app calcula guia de captura segun el mueble:
   - Rack corto: una foto frontal.
   - Rack largo: fotos por modulo, por ejemplo izquierda y derecha.
3. El usuario toma o sube fotos desde un telefono normal.
4. La app valida calidad minima:
   - Resolucion.
   - Luz.
   - Contraste.
   - Estructura de mueble.
   - Cobertura de modulos requeridos.
5. El agente genera una propuesta contra catalogo Autos/VTEX:
   - sku candidato.
   - facings.
   - nivel.
   - posicion relativa.
   - confianza.
   - candidatos alternos.
6. El usuario revisa y corrige.
7. El planograma queda editable y exportable.

## Separacion De Vistas

- Captura: solo toma guiada de fotos y validacion.
- Revision: detecciones, confianza, productos que requieren revision y candidatos alternos.
- Editor: construccion del planograma, correccion manual, asignacion de sku y facings.
- Performance: ventas, ecommerce, inventario, alertas y analisis comercial.

La informacion comercial no debe mezclarse en Captura, Revision o Editor, excepto como referencia minima si se decide mas adelante.

## Integraciones Consideradas

### Actual

- Catalogo local de Autos.
- Imagenes VTEX disponibles en la data.
- Datos de muebles del consolidado.

### Siguiente etapa

- VTEX como fuente de imagenes, nombre, precio, ecommerce y visitas.
- BI/POS para ventas fisicas, inventario y performance por tienda.
- n8n como posible orquestador para consumir VTEX, BI y preparar datasets.

### Posterior

- Stibo Systems como fuente de verdad para catalogo, GTIN, dimensiones, jerarquia, estado e imagenes oficiales.
- Escritura de vuelta a Stibo no pertenece al MVP.

## Fuera De Alcance Del MVP

- Auditoria completa de cumplimiento contra planograma aprobado.
- Escritura de informacion a Stibo.
- Reconocimiento 100% automatico sin revision humana.
- Modelo de IA entrenado de forma formal con dataset completo.
- Integracion productiva con POS/BI/VTEX/Stibo.
- Reglas avanzadas de space planning como rentabilidad por centimetro, restricciones legales o surtido ideal por tienda.

## Principios Del Proyecto

- No inventar detecciones si la foto no sirve.
- Separar demo de reconocimiento real.
- Hacer facil tomar otra foto.
- Mantener revision humana.
- Mostrar confianza y alternativas.
- Usar datos reales siempre que sea posible.
- Disenar para tienda: rapido, claro y usable desde movil.
