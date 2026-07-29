import { useState, type FormEvent } from 'react';
import { Modal } from '../../../ui/Modal/Modal';
import { Button } from '../../../ui/Button/Button';
import { useNivelesDeGondola } from '../../../../hooks/useNiveles';
import { useMoverPosicion } from '../../../../hooks/usePosiciones';
import type { GondolaListItem } from '../../../../types/gondola';
import type { Posicion, PosicionMovida } from '../../../../types/posicion';
import './MoverPosicionModal.css';

interface MoverPosicionModalProps {
  posicion: Posicion;
  nivelActualId: number;
  gondolas: GondolaListItem[];
  gondolaActualId: number;
  onClose: () => void;
  onMovida: (resultado: PosicionMovida) => void;
}

export function MoverPosicionModal({
  posicion,
  nivelActualId,
  gondolas,
  gondolaActualId,
  onClose,
  onMovida,
}: MoverPosicionModalProps) {
  const [gondolaDestinoId, setGondolaDestinoId] = useState(String(gondolaActualId));
  const [nivelDestinoId, setNivelDestinoId] = useState(String(nivelActualId));
  const [ordenDestino, setOrdenDestino] = useState(String(posicion.orden_horizontal));

  const { niveles, cargando: cargandoNiveles } = useNivelesDeGondola(Number(gondolaDestinoId));
  const { mover, enviando } = useMoverPosicion();

  function onCambiarGondola(valor: string) {
    setGondolaDestinoId(valor);
    setNivelDestinoId('');
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const resultado = await mover(posicion.id, Number(nivelDestinoId), Number(ordenDestino));
    if (resultado) onMovida(resultado);
  }

  return (
    <Modal
      titulo="Mover posición"
      onClose={onClose}
      ancho="sm"
      footer={
        <>
          <Button variante="outline" onClick={onClose} disabled={enviando}>
            Cancelar
          </Button>
          <Button type="submit" form="mover-posicion-form" disabled={enviando || !nivelDestinoId}>
            Mover
          </Button>
        </>
      }
    >
      <form id="mover-posicion-form" className="mover-posicion-form" onSubmit={onSubmit}>
        <p className="mover-posicion-form__ayuda">SKU {posicion.sku}</p>

        <label className="mover-posicion-form__campo">
          <span>Góndola destino</span>
          <select value={gondolaDestinoId} onChange={(e) => onCambiarGondola(e.target.value)}>
            {gondolas.map((g) => (
              <option key={g.id} value={g.id}>
                {g.nombre}
              </option>
            ))}
          </select>
        </label>

        <label className="mover-posicion-form__campo">
          <span>Nivel destino</span>
          <select
            value={nivelDestinoId}
            onChange={(e) => setNivelDestinoId(e.target.value)}
            disabled={cargandoNiveles}
            required
          >
            <option value="">{cargandoNiveles ? 'Cargando…' : 'Seleccionar nivel'}</option>
            {niveles.map((n) => (
              <option key={n.id} value={n.id}>
                Nivel {n.orden}
              </option>
            ))}
          </select>
        </label>

        <label className="mover-posicion-form__campo">
          <span>Orden dentro del nivel</span>
          <input
            type="number"
            min="1"
            step="1"
            value={ordenDestino}
            onChange={(e) => setOrdenDestino(e.target.value)}
            required
          />
        </label>
      </form>
    </Modal>
  );
}
