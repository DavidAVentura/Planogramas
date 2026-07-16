import { useState, type FormEvent } from 'react';
import { Modal } from '../../../ui/Modal/Modal';
import { Button } from '../../../ui/Button/Button';
import { useCrearVersion } from '../../../../hooks/useVersiones';
import type { Version, VersionTipo } from '../../../../types/version';
import './CrearVersionModal.css';

const TIPOS: VersionTipo[] = ['GRANDE', 'MEDIANA', 'EXPRESS'];

interface CrearVersionModalProps {
  planogramaId: number;
  onClose: () => void;
  onCreada: (version: Version) => void;
}

export function CrearVersionModal({ planogramaId, onClose, onCreada }: CrearVersionModalProps) {
  const { crear, enviando } = useCrearVersion();
  const [tipo, setTipo] = useState<VersionTipo>('GRANDE');
  const [notas, setNotas] = useState('');

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const version = await crear(planogramaId, { tipo, notas: notas.trim() || undefined });
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
          <span>Notas (opcional)</span>
          <textarea value={notas} onChange={(e) => setNotas(e.target.value)} rows={3} maxLength={500} />
        </label>
      </form>
    </Modal>
  );
}
