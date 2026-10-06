import type { CuerpoPdf } from '../../../../types/extractorPdfPlanograma';
import { claveEspacio, franjasDeNiveles, hojasDelCuerpo, type SeleccionProductos } from './importacionPdf';

interface VistaPreviaLayoutPdfProps {
  cuerpo: CuerpoPdf;
  seleccion: SeleccionProductos;
  /** Alto máximo del dibujo en px; el ancho sale de la proporción de la góndola. */
  altoPx?: number;
}

/** Dibujo a escala del layout leído del PDF: secciones, niveles a su altura real y espacios con
 * sus números de gancho, coloreados según el producto quedó asignado o pendiente. */
export function VistaPreviaLayoutPdf({ cuerpo, seleccion, altoPx = 360 }: VistaPreviaLayoutPdfProps) {
  const escala = altoPx / cuerpo.alto_cm;
  const px = (cm: number) => `${cm * escala}px`;
  const hojas = [...hojasDelCuerpo(cuerpo).values()];
  const dividida = cuerpo.secciones.length > 0;

  return (
    <div
      className="vista-previa-pdf"
      style={{ width: px(cuerpo.ancho_cm), height: px(cuerpo.alto_cm) }}
      aria-label={`Vista previa de ${cuerpo.nombre}`}
    >
      {dividida && hojas.map((h, i) => (
        <div
          key={i}
          className="vista-previa-pdf__seccion"
          style={{ left: px(h.x), top: px(h.y), width: px(h.ancho), height: px(h.alto) }}
        />
      ))}
      {franjasDeNiveles(cuerpo).map(({ nivel, rect }) => {
        const totalAncho = nivel.espacios.reduce((t, e) => t + e.ancho_cm, 0);
        const factor = totalAncho > rect.ancho ? rect.ancho / totalAncho : 1;
        let x = rect.x;
        return (
          <div key={nivel.clave}>
            <div
              className={`vista-previa-pdf__nivel vista-previa-pdf__nivel--${nivel.tipo_accesorio.toLowerCase()}`}
              style={{ left: px(rect.x), top: px(rect.y + rect.alto), width: px(rect.ancho) }}
              title={`Nivel ${nivel.orden} · ${nivel.tipo_accesorio} a ${nivel.altura_desde_piso_cm} cm`}
            />
            {nivel.espacios.map((espacio) => {
              const ancho = espacio.ancho_cm * factor;
              const izquierda = x;
              x += ancho;
              const asignado = Boolean(seleccion[claveEspacio(cuerpo, nivel, espacio)]);
              const estado = asignado ? 'asignado' : espacio.candidatos.length ? 'candidatos' : 'pendiente';
              return (
                <div
                  key={espacio.orden_horizontal}
                  className={`vista-previa-pdf__espacio vista-previa-pdf__espacio--${estado}`}
                  style={{ left: px(izquierda), top: px(rect.y + rect.alto * 0.25), width: px(ancho), height: px(rect.alto * 0.75) }}
                  title={`Gancho ${espacio.ganchos.join(', ')} · ${espacio.producto?.nombre ?? espacio.descripcion_visual ?? 'sin identificar'}`}
                >
                  {espacio.ganchos.join(',')}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
