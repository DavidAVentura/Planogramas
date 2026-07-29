import { Button } from '../../../ui/Button/Button';
import { PosicionesPanel } from '../PosicionesPanel/PosicionesPanel';
import type { Nivel } from '../../../../types/nivel';
import type { PosicionConProducto, PosicionesDeNivel } from '../../../../types/posicion';
import type { DatosArrastrePosicion } from '../../../../utils/dragPosicion';
import './NivelRow.css';

interface NivelRowProps {
  niveles: Nivel[];
  puedeEscribir: boolean;
  extendido: boolean;
  subcategorias: string[];
  onToggleExtender: () => void;
  onAgregar: () => void;
  onEditar: (nivel: Nivel) => void;
  onEliminar: (nivel: Nivel) => void;
  onMover: (nivel: Nivel, direccion: 'subir' | 'bajar') => void;
  posicionesPorNivel: Record<number, PosicionesDeNivel>;
  cargandoPosiciones: boolean;
  onCambioPosiciones: () => void;
  seleccionadaId: number | null;
  onSeleccionarPosicion: (posicionId: number) => void;
  onDetallePosicion: (posicion: PosicionConProducto) => void;
  onAbrirFicha: (sku: string) => void;
  onSoltarPosicion: (datos: DatosArrastrePosicion, nivelDestinoId: number, ordenDestino: number) => void;
}

export function NivelRow({
  niveles,
  puedeEscribir,
  extendido,
  subcategorias,
  onToggleExtender,
  onAgregar,
  onEditar,
  onEliminar,
  onMover,
  posicionesPorNivel,
  cargandoPosiciones,
  onCambioPosiciones,
  seleccionadaId,
  onSeleccionarPosicion,
  onDetallePosicion,
  onAbrirFicha,
  onSoltarPosicion,
}: NivelRowProps) {
  return (
    <div className={`nivel-row-lista${extendido ? ' nivel-row-lista--extendido' : ''}`}>
      <div className="nivel-row-lista__header">
        <span className="nivel-row-lista__titulo">Niveles</span>
        <span className="nivel-row-lista__header-acciones">
          <Button variante="outline" onClick={onToggleExtender}>
            {extendido ? 'Contraer' : 'Extender'}
          </Button>
          {puedeEscribir && (
            <Button variante="outline" onClick={onAgregar}>
              + Agregar nivel
            </Button>
          )}
        </span>
      </div>

      {niveles.map((nivel, indice) => (
        <div key={nivel.id} className="nivel-row">
          <div className="nivel-row__nombre-col">
            {puedeEscribir && (
              <span className="nivel-row__mover">
                <button
                  type="button"
                  aria-label={`Subir nivel ${nivel.orden}`}
                  disabled={indice === 0}
                  onClick={() => onMover(nivel, 'subir')}
                >
                  ▲
                </button>
                <button
                  type="button"
                  aria-label={`Bajar nivel ${nivel.orden}`}
                  disabled={indice === niveles.length - 1}
                  onClick={() => onMover(nivel, 'bajar')}
                >
                  ▼
                </button>
              </span>
            )}
            <span
              className="nivel-row__nombre"
              title={`Nivel ${nivel.orden} - altura desde el suelo ${nivel.altura_desde_piso_cm} cm - ${
                nivel.tipo_accesorio
              }${nivel.accesorio ? ` ${nivel.accesorio.nombre}` : ''}${
                nivel.tamano_accesorio_pulgadas ? ` ${nivel.tamano_accesorio_pulgadas}''` : ''
              }${nivel.notas ? `\n${nivel.notas}` : ''}`}
            >
              {nivel.orden}
            </span>
          </div>

          <PosicionesPanel
            nivel={nivel}
            datos={posicionesPorNivel[nivel.id]}
            cargando={cargandoPosiciones}
            puedeEscribir={puedeEscribir}
            subcategorias={subcategorias}
            onCambio={onCambioPosiciones}
            seleccionadaId={seleccionadaId}
            onSeleccionar={onSeleccionarPosicion}
            onDetalle={onDetallePosicion}
            onAbrirFicha={onAbrirFicha}
            onSoltarPosicion={onSoltarPosicion}
          />

          {puedeEscribir && (
            <span className="nivel-row__acciones-nivel">
              <button type="button" title="Editar nivel" aria-label="Editar nivel" onClick={() => onEditar(nivel)}>
                ✎
              </button>
              <button type="button" title="Eliminar nivel" aria-label="Eliminar nivel" onClick={() => onEliminar(nivel)}>
                ×
              </button>
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
