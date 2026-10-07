import { evidenciaReportada } from '../../../../domain/implementacion/miTienda';
import type { ResumenVersion } from '../../../../types/implementacion';
import './AccionesVersion.css';

interface BotonVersionProps {
  planograma: ResumenVersion;
  onClick: () => void;
}

/** Abre los archivos adjuntos de la versión; muestra cuántos hay. */
export function BotonArchivos({ planograma, onClick }: BotonVersionProps) {
  return (
    <button
      type="button"
      className="accion-version"
      onClick={onClick}
      aria-label={`Archivos de ${planograma.nombre} (${planograma.adjuntos})`}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M20 11.5l-8.2 8.2a5 5 0 0 1-7.1-7.1l8.2-8.2a3.4 3.4 0 0 1 4.8 4.8l-8.2 8.2a1.8 1.8 0 0 1-2.5-2.5l7.5-7.5" />
      </svg>
      Archivos
      <span className="accion-version__conteo">{planograma.adjuntos}</span>
    </button>
  );
}

/** Abre la evidencia de la versión en la tienda: "Pendiente" sin fotos, "Reportado" con al menos una. */
export function BotonEvidencia({ planograma, onClick }: BotonVersionProps) {
  const reportado = evidenciaReportada(planograma);
  const estado = reportado ? 'reportado' : 'pendiente';
  return (
    <button
      type="button"
      className={`accion-version accion-version--${estado}`}
      onClick={onClick}
      aria-label={`Evidencia de ${planograma.nombre}, ${reportado ? `reportada (${planograma.evidencias} fotos)` : 'pendiente'}`}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
        <circle cx="12" cy="13" r="3.5" />
      </svg>
      Evidencia
      <span className="accion-version__estado">{reportado ? 'Reportado' : 'Pendiente'}</span>
    </button>
  );
}
