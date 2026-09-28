import './BotonFiltros.css';

interface BotonFiltrosProps {
  /** id de la barra de filtros que despliega (para `aria-controls`). */
  controla: string;
  abierto: boolean;
  /** Filtros aplicados; se muestran en el botón para que no pasen desapercibidos con la barra oculta. */
  activos: number;
  onClick: () => void;
}

/** Botón que muestra u oculta una barra de filtros desplegable (listados de Planogramas y Tiendas). */
export function BotonFiltros({ controla, abierto, activos, onClick }: BotonFiltrosProps) {
  const ayuda = `${abierto ? 'Ocultar' : 'Mostrar'} filtros${activos ? ` (${activos} aplicado${activos === 1 ? '' : 's'})` : ''}`;
  const clases = [
    'boton-filtros',
    abierto ? 'boton-filtros--abierto' : '',
    activos ? 'boton-filtros--con-filtros' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type="button"
      className={clases}
      aria-expanded={abierto}
      aria-controls={controla}
      aria-label={ayuda}
      title={ayuda}
      onClick={onClick}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 5h16l-6 7.5V19l-4-2v-4.5L4 5z" />
      </svg>
      {activos > 0 && <span className="boton-filtros__conteo" aria-hidden="true">{activos}</span>}
    </button>
  );
}
