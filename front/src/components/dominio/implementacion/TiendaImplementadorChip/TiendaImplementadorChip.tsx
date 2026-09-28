import { useTiendaImplementador } from '../../../../context/TiendaImplementadorContext';
import './TiendaImplementadorChip.css';

function IconoTienda() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 10l2-6h14l2 6" />
      <path d="M4 10v10h16V10" />
      <path d="M9 20v-6h6v6" />
    </svg>
  );
}

/** Tienda del Implementador en el topbar, con el botón para cambiarla. */
export function TiendaImplementadorChip() {
  const { tienda, abrirSelector } = useTiendaImplementador();

  if (!tienda) {
    return (
      <button type="button" className="tienda-chip tienda-chip--vacia" onClick={abrirSelector}>
        <IconoTienda />
        Elegir tienda
      </button>
    );
  }

  return (
    <span className="tienda-chip">
      <span className="tienda-chip__icono">
        <IconoTienda />
      </span>
      <span className="tienda-chip__nombre" title={tienda.nombre}>
        {tienda.nombre}
      </span>
      <span className="tienda-chip__codigo">{tienda.codigo}</span>
      <button
        type="button"
        className="tienda-chip__cambiar"
        onClick={abrirSelector}
        aria-label={`Cambiar tienda (actual: ${tienda.nombre})`}
      >
        Cambiar
      </button>
    </span>
  );
}
