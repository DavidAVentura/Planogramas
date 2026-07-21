import { useState } from 'react';
import { Button } from '../../../ui/Button/Button';
import { CapacityBar } from '../CapacityBar/CapacityBar';
import { PosicionCard } from '../PosicionCard/PosicionCard';
import { PosicionFormModal } from '../../modales/PosicionFormModal/PosicionFormModal';
import { EliminarPosicionModal } from '../../modales/EliminarPosicionModal/EliminarPosicionModal';
import { MoverPosicionModal } from '../../modales/MoverPosicionModal/MoverPosicionModal';
import { CopiarPosicionModal } from '../../modales/CopiarPosicionModal/CopiarPosicionModal';
import { PosicionDrawer } from '../../modales/PosicionDrawer/PosicionDrawer';
import type { GondolaListItem } from '../../../../types/gondola';
import type { Nivel } from '../../../../types/nivel';
import type { Posicion, PosicionesDeNivel } from '../../../../types/posicion';
import './PosicionesPanel.css';

interface PosicionesPanelProps {
  nivel: Nivel;
  datos: PosicionesDeNivel | undefined;
  cargando: boolean;
  puedeEscribir: boolean;
  gondolas: GondolaListItem[];
  gondolaActualId: number;
  onCambio: () => void;
}

export function PosicionesPanel({
  nivel,
  datos,
  cargando,
  puedeEscribir,
  gondolas,
  gondolaActualId,
  onCambio,
}: PosicionesPanelProps) {
  const [mostrarFormAgregar, setMostrarFormAgregar] = useState(false);
  const [posicionDetalleId, setPosicionDetalleId] = useState<number | null>(null);
  const [posicionAMover, setPosicionAMover] = useState<Posicion | null>(null);
  const [posicionACopiar, setPosicionACopiar] = useState<Posicion | null>(null);
  const [posicionAEliminar, setPosicionAEliminar] = useState<Posicion | null>(null);

  const posiciones = datos?.posiciones ?? [];

  return (
    <div className="posiciones-panel">
      <div className="posiciones-panel__header">
        {datos && <CapacityBar ocupadoCm={datos.capacidad.ancho_ocupado_cm} disponibleCm={datos.capacidad.ancho_disponible_cm} />}
        {puedeEscribir && (
          <Button variante="outline" onClick={() => setMostrarFormAgregar(true)}>
            + Agregar posición
          </Button>
        )}
      </div>

      {cargando && <p className="posiciones-panel__vacio">Cargando posiciones…</p>}
      {!cargando && posiciones.length === 0 && (
        <p className="posiciones-panel__vacio">Este nivel todavía no tiene posiciones.</p>
      )}

      <div className="posiciones-panel__lista">
        {posiciones.map((posicion) => (
          <PosicionCard
            key={posicion.id}
            posicion={posicion}
            puedeEscribir={puedeEscribir}
            onDetalle={(p) => setPosicionDetalleId(p.id)}
            onMover={setPosicionAMover}
            onCopiar={setPosicionACopiar}
            onEliminar={setPosicionAEliminar}
          />
        ))}
      </div>

      {mostrarFormAgregar && (
        <PosicionFormModal
          nivelId={nivel.id}
          proximoOrden={posiciones.length + 1}
          onClose={() => setMostrarFormAgregar(false)}
          onGuardada={() => {
            setMostrarFormAgregar(false);
            onCambio();
          }}
        />
      )}

      {posicionDetalleId !== null && (
        <PosicionDrawer posicionId={posicionDetalleId} onClose={() => setPosicionDetalleId(null)} onCambio={onCambio} />
      )}

      {posicionAMover && (
        <MoverPosicionModal
          posicion={posicionAMover}
          nivelActualId={nivel.id}
          gondolas={gondolas}
          gondolaActualId={gondolaActualId}
          onClose={() => setPosicionAMover(null)}
          onMovida={() => {
            setPosicionAMover(null);
            onCambio();
          }}
        />
      )}

      {posicionACopiar && (
        <CopiarPosicionModal
          posicion={posicionACopiar}
          nivelActualId={nivel.id}
          gondolas={gondolas}
          gondolaActualId={gondolaActualId}
          onClose={() => setPosicionACopiar(null)}
          onCopiada={() => {
            setPosicionACopiar(null);
            onCambio();
          }}
        />
      )}

      {posicionAEliminar && (
        <EliminarPosicionModal
          posicion={posicionAEliminar}
          onClose={() => setPosicionAEliminar(null)}
          onEliminada={() => {
            setPosicionAEliminar(null);
            onCambio();
          }}
        />
      )}
    </div>
  );
}
