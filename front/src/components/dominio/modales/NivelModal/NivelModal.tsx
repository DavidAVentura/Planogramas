import { useState, type FormEvent } from 'react';
import { Modal } from '../../../ui/Modal/Modal';
import { Button } from '../../../ui/Button/Button';
import { useAgregarNivel, useEditarNivel } from '../../../../hooks/useNiveles';
import { useAccesorios } from '../../../../hooks/useAccesorios';
import { NIVEL_DEFAULTS } from '../../../../constants/valoresPorDefecto';
import { TIPOS_ACCESORIO, type Nivel, type NivelCampos, type TipoAccesorio } from '../../../../types/nivel';
import './NivelModal.css';

const ETIQUETAS_TIPO_ACCESORIO: Record<TipoAccesorio, string> = {
  GANCHO: 'Gancho',
  BANDEJA: 'Bandeja',
  BARRA: 'Barra',
  CANASTA: 'Canasta',
  OTRO: 'Otro',
};

interface NivelModalProps {
  gondolaId: number;
  /** Ancho de la góndola dueña de este nivel — precarga el ancho disponible por defecto al crear
   * un nivel nuevo (los niveles nuevos toman el ancho de su góndola). */
  gondolaAnchoCm: number;
  nivel?: Nivel | null;
  proximoOrden: number;
  onClose: () => void;
  onGuardada: (nivel: Nivel) => void;
}

export function NivelModal({ gondolaId, gondolaAnchoCm, nivel, proximoOrden, onClose, onGuardada }: NivelModalProps) {
  const esEdicion = Boolean(nivel);
  const { agregar, enviando: agregando } = useAgregarNivel();
  const { editar, enviando: editando } = useEditarNivel();
  const enviando = agregando || editando;

  const [orden, setOrden] = useState(String(proximoOrden));
  const [alturaCm, setAlturaCm] = useState(String(nivel?.altura_desde_piso_cm ?? NIVEL_DEFAULTS.altura_desde_piso_cm));
  const [tipoAccesorio, setTipoAccesorio] = useState<TipoAccesorio>(nivel?.tipo_accesorio ?? NIVEL_DEFAULTS.tipo_accesorio);
  const [codigoAccesorioId, setCodigoAccesorioId] = useState(nivel?.accesorio ? String(nivel.accesorio.id) : '');
  const [tamanoPulgadas, setTamanoPulgadas] = useState(
    nivel?.tamano_accesorio_pulgadas != null ? String(nivel.tamano_accesorio_pulgadas) : '',
  );
  const [anchoCm, setAnchoCm] = useState(String(nivel?.ancho_disponible_cm ?? gondolaAnchoCm));
  const [notas, setNotas] = useState(nivel?.notas ?? '');

  const { accesorios, cargando: cargandoAccesorios } = useAccesorios(tipoAccesorio);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();

    // El schema de creación del backend no admite `null` en estos dos campos (solo el de
    // edición, para poder limpiarlos) — al crear se omiten por completo si están vacíos.
    const campos: NivelCampos = {
      altura_desde_piso_cm: Number(alturaCm),
      tipo_accesorio: tipoAccesorio,
      codigo_accesorio_id: codigoAccesorioId ? Number(codigoAccesorioId) : esEdicion ? null : undefined,
      tamano_accesorio_pulgadas: tamanoPulgadas ? Number(tamanoPulgadas) : esEdicion ? null : undefined,
      ancho_disponible_cm: Number(anchoCm),
      notas: notas.trim() || null,
    };

    const resultado =
      esEdicion && nivel ? await editar(nivel.id, campos) : await agregar(gondolaId, { ...campos, orden: Number(orden) });
    if (resultado) onGuardada(resultado);
  }

  return (
    <Modal
      titulo={esEdicion ? 'Editar nivel' : 'Agregar nivel'}
      onClose={onClose}
      footer={
        <>
          <Button variante="outline" onClick={onClose} disabled={enviando}>
            Cancelar
          </Button>
          <Button type="submit" form="nivel-form" disabled={enviando}>
            {esEdicion ? 'Guardar' : 'Agregar'}
          </Button>
        </>
      }
    >
      <form id="nivel-form" className="nivel-form" onSubmit={onSubmit}>
        {!esEdicion && (
          <label className="nivel-form__campo">
            <span>Orden</span>
            <input type="number" min="1" value={orden} onChange={(e) => setOrden(e.target.value)} required />
          </label>
        )}

        <div className="nivel-form__fila">
          <label className="nivel-form__campo">
            <span>Altura desde el piso (cm)</span>
            <input
              type="number"
              min="1"
              step="0.1"
              value={alturaCm}
              onChange={(e) => setAlturaCm(e.target.value)}
              required
            />
          </label>
          <label className="nivel-form__campo">
            <span>Ancho disponible (cm)</span>
            <input
              type="number"
              min="1"
              step="0.1"
              value={anchoCm}
              onChange={(e) => setAnchoCm(e.target.value)}
              required
            />
          </label>
        </div>

        <label className="nivel-form__campo">
          <span>Tipo de accesorio</span>
          <select
            value={tipoAccesorio}
            onChange={(e) => {
              setTipoAccesorio(e.target.value as TipoAccesorio);
              setCodigoAccesorioId('');
            }}
          >
            {TIPOS_ACCESORIO.map((tipo) => (
              <option key={tipo} value={tipo}>
                {ETIQUETAS_TIPO_ACCESORIO[tipo]}
              </option>
            ))}
          </select>
        </label>

        <div className="nivel-form__fila">
          <label className="nivel-form__campo">
            <span>Accesorio del catálogo (opcional)</span>
            <select
              value={codigoAccesorioId}
              onChange={(e) => setCodigoAccesorioId(e.target.value)}
              disabled={cargandoAccesorios}
            >
              <option value="">Sin accesorio específico</option>
              {accesorios.map((accesorio) => (
                <option key={accesorio.id} value={accesorio.id}>
                  {accesorio.codigo} · {accesorio.nombre}
                </option>
              ))}
            </select>
          </label>
          <label className="nivel-form__campo">
            <span>Tamaño del accesorio (pulgadas, opcional)</span>
            <input
              type="number"
              min="0"
              step="0.1"
              value={tamanoPulgadas}
              onChange={(e) => setTamanoPulgadas(e.target.value)}
            />
          </label>
        </div>

        <label className="nivel-form__campo">
          <span>Notas (opcional)</span>
          <input type="text" value={notas ?? ''} onChange={(e) => setNotas(e.target.value)} maxLength={200} />
        </label>
      </form>
    </Modal>
  );
}
