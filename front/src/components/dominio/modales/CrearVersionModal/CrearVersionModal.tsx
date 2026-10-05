import { useState, type FormEvent } from 'react';
import { Modal } from '../../../ui/Modal/Modal';
import { Button } from '../../../ui/Button/Button';
import { useCrearVersion } from '../../../../hooks/useVersiones';
import type { Version, VersionTipo } from '../../../../types/version';
import './CrearVersionModal.css';

const TIPOS: VersionTipo[] = ['GRANDE', 'MEDIANA', 'EXPRESS'];
// Mismo tope que CANTIDAD_GONDOLAS_MAXIMA en back/src/domain/version/version.entity.js.
const CANTIDAD_GONDOLAS_MAXIMA = 20;

interface CrearVersionModalProps {
  planogramaId: number;
  onClose: () => void;
  onCreada: (version: Version) => void;
}

export function CrearVersionModal({ planogramaId, onClose, onCreada }: CrearVersionModalProps) {
  const { crear, enviando } = useCrearVersion();
  const [tipo, setTipo] = useState<VersionTipo>('GRANDE');
  const [cantidadGondolas, setCantidadGondolas] = useState('1');
  const [notas, setNotas] = useState('');

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const version = await crear(planogramaId, {
      tipo,
      cantidadGondolas: Number(cantidadGondolas),
      notas: notas.trim() || undefined,
    });
    if (version) onCreada(version);
  }

  return (
    <Modal
      titulo="Crear versión"
      onClose={onClose}
      footer={
        <>
          <Button variante="outline" onClick={onClose} disabled={enviando}>
            Cancelar
          </Button>
          <Button type="submit" form="crear-version-form" disabled={enviando}>
            Crear
          </Button>
        </>
      }
    >
      <form id="crear-version-form" className="crear-version-form" onSubmit={onSubmit}>
        <label className="crear-version-form__campo">
          <span>Tipo</span>
          <select value={tipo} onChange={(e) => setTipo(e.target.value as VersionTipo)}>
            {TIPOS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>

        <label className="crear-version-form__campo">
          <span>¿Cuántas góndolas tiene o tendrá?</span>
          <input
            type="number"
            min="1"
            max={CANTIDAD_GONDOLAS_MAXIMA}
            step="1"
            value={cantidadGondolas}
            onChange={(e) => setCantidadGondolas(e.target.value)}
            required
          />
          <small className="crear-version-form__ayuda">
            Entre 1 y {CANTIDAD_GONDOLAS_MAXIMA}. Se crean vacías (200 × 230 × 50 cm); puedes agregar, editar o
            eliminar góndolas después en el editor.
          </small>
        </label>

        <label className="crear-version-form__campo">
          <span>Notas (opcional)</span>
          <textarea value={notas} onChange={(e) => setNotas(e.target.value)} rows={3} maxLength={500} />
        </label>
      </form>
    </Modal>
  );
}
