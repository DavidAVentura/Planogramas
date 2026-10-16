import './ConsolidadoFiltros.css';
import type { ChipFiltro, QuitarFiltro } from '../../../../domain/consolidado/filtrosConsolidado';

interface ResumenFiltrosCompactoProps {
  chips: ChipFiltro[];
  /** La barra completa de filtros está desplegada. */
  filtrosVisibles: boolean;
  /** id de la barra de filtros que despliega (para `aria-controls`). */
  controla: string;
  onQuitar: (quitar: QuitarFiltro) => void;
  onAlternarFiltros: () => void;
}

/** Modo extendido: los filtros activos como chips en la fila de herramientas, más "Mostrar filtros". */
export function ResumenFiltrosCompacto({ chips, filtrosVisibles, controla, onQuitar, onAlternarFiltros }: ResumenFiltrosCompactoProps) {
  const sinFiltros = chips.every((c) => c.quitar === null);
  return (
    <div className="consolidado-filtros-compacto">
      <ul className="consolidado-filtros-compacto__chips" aria-label="Filtros aplicados">
        {sinFiltros && <li className="consolidado-filtros-compacto__vacio">Sin filtros aplicados</li>}
        {chips.map((chip) => (
          <li
            key={chip.id}
            className={`consolidado-filtros-compacto__chip${chip.quitar ? '' : ' consolidado-filtros-compacto__chip--vista'}`}
            title={chip.titulo ?? chip.texto}
          >
            {chip.texto}
            {chip.quitar && (
              <button type="button" aria-label={`Quitar filtro ${chip.texto}`} onClick={() => onQuitar(chip.quitar!)}>
                &times;
              </button>
            )}
          </li>
        ))}
      </ul>
      <button
        type="button"
        className="consolidado-filtros-compacto__alternar"
        aria-expanded={filtrosVisibles}
        aria-controls={controla}
        onClick={onAlternarFiltros}
      >
        {filtrosVisibles ? 'Ocultar filtros' : 'Mostrar filtros'}
      </button>
    </div>
  );
}
