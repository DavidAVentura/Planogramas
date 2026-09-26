import './BotonTextoAVoz.css';

export type EstadoLectura = 'idle' | 'cargando' | 'reproduciendo';

interface BotonTextoAVozProps {
  estado: EstadoLectura;
  onClick: () => void;
}

/** Botón ▶/■ para leer en voz alta (o detener) un mensaje del agente. */
export function BotonTextoAVoz({ estado, onClick }: BotonTextoAVozProps) {
  const label = estado === 'reproduciendo' ? 'Detener lectura' : 'Leer en voz alta';
  return (
    <button
      type="button"
      className={`boton-texto-a-voz${estado === 'reproduciendo' ? ' boton-texto-a-voz--activo' : ''}`}
      onClick={onClick}
      disabled={estado === 'cargando'}
      aria-label={label}
      title={label}
    >
      {estado === 'cargando' ? (
        <span className="boton-texto-a-voz__spinner" />
      ) : estado === 'reproduciendo' ? (
        <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <rect x="5" y="5" width="14" height="14" rx="2" />
        </svg>
      ) : (
        <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M6 4.5v15l13-7.5-13-7.5Z" />
        </svg>
      )}
    </button>
  );
}
