import { useState, type FormEvent } from 'react';
import { Modal } from '../../../ui/Modal/Modal';
import { Button } from '../../../ui/Button/Button';
import { useAgregarGondola, useEditarGondola } from '../../../../hooks/useGondolas';
import type { Gondola, GondolaInput } from '../../../../types/gondola';
import './GondolaModal.css';

interface GondolaModalProps {
  versionId: number;
  gondola?: Gondola | null;
  onClose: () => void;
  onGuardada: (gondola: Gondola) => void;
}

export function GondolaModal({ versionId, gondola, onClose, onGuardada }: GondolaModalProps) {
  const esEdicion = Boolean(gondola);
  const { agregar, enviando: agregando } = useAgregarGondola();
  const { editar, enviando: editando } = useEditarGondola();
  const enviando = agregando || editando;

  const [nombre, setNombre] = useState(gondola?.nombre ?? '');
  const [anchoCm, setAnchoCm] = useState(gondola ? String(gondola.ancho_cm) : '');
  const [altoCm, setAltoCm] = useState(gondola ? String(gondola.alto_cm) : '');
  const [profundidadCm, setProfundidadCm] = useState(gondola ? String(gondola.profundidad_cm) : '');
  const [posicionEnTienda, setPosicionEnTienda] = useState(gondola?.posicion_en_tienda ?? '');

  async function onSubmit(e: FormEvent) {
    e.preventDefault();

    const datos: GondolaInput = {
      nombre: nombre.trim(),
      ancho_cm: Number(anchoCm),
      alto_cm: Number(altoCm),
      profundidad_cm: Number(profundidadCm),
      posicion_en_tienda: posicionEnTienda.trim() || undefined,
    };

    const resultado = esEdicion && gondola ? await editar(gondola.id, datos) : await agregar(versionId, datos);
    if (resultado) onGuardada(resultado);
  }

  return (
    <Modal
      titulo={esEdicion ? 'Editar góndola' : 'Agregar góndola'}
      onClose={onClose}
      footer={
        <>
          <Button variante="outline" onClick={onClose} disabled={enviando}>
            Cancelar
          </Button>
          <Button type="submit" form="gondola-form" disabled={enviando}>
            {esEdicion ? 'Guardar' : 'Agregar'}
          </Button>
        </>
      }
    >
      <form id="gondola-form" className="gondola-form" onSubmit={onSubmit}>
        <label className="gondola-form__campo">
          <span>Nombre</span>
          <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={100} required />
        </label>

        <div className="gondola-form__fila">
          <label className="gondola-form__campo">
            <span>Ancho (cm)</span>
            <input
              type="number"
              min="1"
              max="500"
              value={anchoCm}
              onChange={(e) => setAnchoCm(e.target.value)}
              required
            />
          </label>
          <label className="gondola-form__campo">
            <span>Alto (cm)</span>
            <input
              type="number"
              min="1"
              max="300"
              value={altoCm}
              onChange={(e) => setAltoCm(e.target.value)}
              required
            />
          </label>
          <label className="gondola-form__campo">
            <span>Profundidad (cm)</span>
            <input
              type="number"
              min="1"
              max="200"
              value={profundidadCm}
              onChange={(e) => setProfundidadCm(e.target.value)}
              required
            />
          </label>
        </div>

        <label className="gondola-form__campo">
          <span>Posición en tienda (opcional)</span>
          <input
            type="text"
            value={posicionEnTienda ?? ''}
            onChange={(e) => setPosicionEnTienda(e.target.value)}
            maxLength={200}
          />
        </label>
      </form>
    </Modal>
  );
}
