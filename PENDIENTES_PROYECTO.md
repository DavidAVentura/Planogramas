# Pendientes Del Proyecto

## Prioridad Alta

- Probar en tienda Cemaco Pradera con telefono real.
- Validar que el flujo de captura por mueble se entiende sin explicacion externa.
- Revisar que racks largos pidan las fotos necesarias por modulo.
- Confirmar que una foto de producto individual sea rechazada correctamente.
- Confirmar que el boton `Tomar otra foto` sea visible y util en Captura y Revision.
- Ajustar textos de captura para lenguaje de tienda.
- Probar en movil real la navegacion inferior y el espacio disponible en pantalla.

## Captura Guiada

- Definir reglas por tipo de mueble:
  - rack corto.
  - rack largo.
  - ganchera / pegboard.
  - exhibidor.
  - refrigerador o vitrina si aplica mas adelante.
- Mejorar overlay visual para indicar:
  - limites del modulo.
  - niveles esperados.
  - distancia sugerida.
  - angulo frontal.
  - advertencia de reflejos.
- Guardar multiples fotos por mueble con nombre de modulo.
- Permitir repetir solo un modulo sin borrar todo el levantamiento.

## Agente De Reconocimiento

- Reemplazar simulacion actual por llamada real a modelo/agente.
- Definir payload de entrada:
  - tienda.
  - categoria.
  - mueble.
  - fotos por modulo.
  - catalogo filtrado.
- Definir salida esperada:
  - nivel.
  - posicion.
  - facings.
  - sku candidato.
  - confianza.
  - candidatos alternos.
  - motivo del match.
- Evaluar si el primer agente usa OpenAI Vision u otro servicio.
- Medir precision con fotos reales de tienda.
- Registrar correcciones humanas para aprendizaje posterior.

## Catalogo Y Datos

- Confirmar si `Autos.xlsx` trae todos los sku necesarios para piloto.
- Confirmar calidad de imagenes VTEX.
- Confirmar dimensiones reales por sku.
- Identificar campos faltantes para Stibo:
  - sku.
  - GTIN/UPC.
  - marca.
  - descripcion.
  - jerarquia.
  - alto, ancho, profundidad.
  - imagen frontal.
  - estado activo.
- Definir si VTEX sera fuente temporal antes de Stibo.

## Editor

- Mejorar correccion rapida:
  - reemplazar sku.
  - duplicar facing.
  - mover producto de nivel.
  - marcar como no encontrado.
  - ver candidatos alternos.
- Guardar version local del planograma.
- Exportar JSON y CSV con estructura estable.
- Evaluar exportacion a PDF/Excel.

## Performance

- Mantener Performance separado de construccion.
- Definir dataset minimo:
  - ventas tienda 30 dias.
  - ventas ecommerce 30 dias.
  - visitas ecommerce.
  - conversion online.
  - inventario actual.
  - tienda con mejor performance.
- Conectar datos reales via BI/VTEX/n8n cuando el flujo de captura este validado.
- Evitar que ventas aparezcan en Captura, Revision o Editor.

## Deployment

- Verificar redeploy automatico de DigitalOcean despues de cada push a GitHub.
- Mantener URL de prueba:
  - `https://surtido-planogramas-6rewk.ondigitalocean.app`
- Evaluar dominio final:
  - `jcddash.com/surtido`
- Documentar variables necesarias cuando exista backend/agente real.

## Riesgos

- Fotos con mala luz o mucho reflejo.
- Racks largos sin suficiente distancia para tomar foto completa.
- Productos visualmente muy parecidos.
- Imagenes VTEX no estandarizadas para planogramacion.
- Dimensiones incompletas.
- Confusion entre demo y reconocimiento real.
- Que el usuario espere precision de IA antes de tener dataset suficiente.

## Criterios Para Pasar A Siguiente Fase

- El usuario puede tomar fotos en tienda sin guia externa.
- La app rechaza fotos que no sirven.
- La propuesta inicial reduce trabajo manual.
- Los usuarios de categorias/compras entienden donde corregir.
- Se puede explicar claramente que es demo, que es agente y que queda pendiente de integracion.
