import { useState, type FormEvent } from 'react';
import { Modal } from '../../../ui/Modal/Modal';
import { Button } from '../../../ui/Button/Button';
import { accesoriosService } from '../../../../services/accesorios.service';
import { ApiError } from '../../../../services/httpClient';
import { useToast } from '../../../../context/ToastContext';
import { mensajeDeError } from '../../../../utils/errors';
import { TIPOS_ACCESORIO, type Accesorio, type TipoAccesorioCatalogo } from '../../../../types/accesorio';
import './AccesorioFormModal.css';

interface AccesorioFormModalProps {
  /** `null` = crear. Un accesorio existente = editar. */
  accesorio: Accesorio | null;
  /** Valores iniciales al crear (ej. un código que trajo el Excel de productos). */
  inicial?: { codigo?: string; nombre?: string; tipo?: TipoAccesorioCatalogo };
  onClose: () => void;
  onGuardado: (accesorio: Accesorio) => void;
}

function numeroONull(texto: string): number | null {
  const n = Number(texto.replace(',', '.'));
  return texto.trim() && n > 0 ? n : null;
}

export function AccesorioFormModal({ accesorio, inicial, onClose, onGuardado }: AccesorioFormModalProps) {
  const editando = accesorio !== null;
  const [codigo, setCodigo] = useState(accesorio?.codigo ?? inicial?.codigo ?? '');
  const [nombre, setNombre] = useState(accesorio?.nombre ?? inicial?.nombre ?? '');
  const [tipo, setTipo] = useState<TipoAccesorioCatalogo>((accesorio?.tipo as TipoAccesorioCatalogo) ?? inicial?.tipo ?? 'GANCHO');
  const [alto, setAlto] = useState(accesorio?.alto_cm != null ? String(accesorio.alto_cm) : '');
  const [ancho, setAncho] = useState(accesorio?.ancho_cm != null ? String(accesorio.ancho_cm) : '');
  const [profundidad, setProfundidad] = useState(accesorio?.profundidad_cm != null ? String(accesorio.profundidad_cm) : '');
  const [notas, setNotas] = useState(accesorio?.notas_capacidad ?? '');
  const [intento, setIntento] = useState(false);
  const [codigoDuplicado, setCodigoDuplicado] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const { mostrarToast } = useToast();

  const codigoLimpio = codigo.trim().toUpperCase();
  const errorCodigo = !codigoLimpio
    ? 'El código es obligatorio.'
    : codigoDuplicado === codigoLimpio
      ? `Ya existe un accesorio con el código ${codigoLimpio}.`
      : null;
  const errorNombre = nombre.trim() ? null : 'El nombre es obligatorio.';

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setIntento(true);
    if (errorCodigo || errorNombre) return;
    setEnviando(true);
    const datos = {
      codigo: codigoLimpio,
      nombre: nombre.trim(),
      tipo,
      alto_cm: numeroONull(alto),
      ancho_cm: numeroONull(ancho),
      profundidad_cm: numeroONull(profundidad),
      notas_capacidad: notas.trim() || null,
    };
    try {
      const guardado = editando ? await accesoriosService.editar(accesorio.id, datos) : await accesoriosService.crear(datos);
      mostrarToast(editando ? 'Accesorio actualizado' : 'Accesorio creado', 'success');
      onGuardado(guardado);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) setCodigoDuplicado(codigoLimpio);
      else mostrarToast(mensajeDeError(err, 'No se pudo guardar el accesorio'), 'error');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Modal
      titulo={editando ? 'Editar accesorio' : 'Crear accesorio'}
      onClose={onClose}
      footer={
        <>
          <Button variante="outline" onClick={onClose} disabled={enviando}>
            Cancelar
          </Button>
          <Button type="submit" form="accesorio-form" disabled={enviando}>
            {editando ? 'Guardar cambios' : 'Crear accesorio'}
          </Button>
        </>
      }
    >
      <form id="accesorio-form" className="accesorio-form" onSubmit={onSubmit} noValidate>
        <label className="accesorio-form__campo">
          <span>Código *</span>
          <input
            className="accesorio-form__codigo"
            value={codigo}
            maxLength={50}
            placeholder="Ej. R45-12-212P2"
            aria-invalid={Boolean((intento || codigoDuplicado) && errorCodigo)}
            onChange={(e) => setCodigo(e.target.value.toUpperCase())}
            autoFocus
          />
          {(intento || codigoDuplicado) && errorCodigo && <span className="accesorio-form__error">{errorCodigo}</span>}
        </label>

        <label className="accesorio-form__campo">
          <span>Tipo *</span>
          <select value={tipo} onChange={(e) => setTipo(e.target.value as TipoAccesorioCatalogo)}>
            {TIPOS_ACCESORIO.map((t) => (
              <option key={t} value={t}>
                {t.charAt(0) + t.slice(1).toLowerCase()}
              </option>
            ))}
          </select>
        </label>

        <label className="accesorio-form__campo accesorio-form__campo--ancho">
          <span>Nombre *</span>
          <input
            value={nombre}
            maxLength={200}
            placeholder="Ej. Gancho sencillo 12 pulgadas"
            aria-invalid={Boolean(intento && errorNombre)}
            onChange={(e) => setNombre(e.target.value)}
          />
          {intento && errorNombre && <span className="accesorio-form__error">{errorNombre}</span>}
        </label>

        <div className="accesorio-form__medidas">
          <label className="accesorio-form__campo">
            <span>Alto (cm)</span>
            <input inputMode="decimal" value={alto} onChange={(e) => setAlto(e.target.value)} placeholder="Ej. 2.5" />
          </label>

          <label className="accesorio-form__campo">
            <span>Ancho (cm)</span>
            <input inputMode="decimal" value={ancho} onChange={(e) => setAncho(e.target.value)} placeholder="Ej. 121.9" />
          </label>

          <label className="accesorio-form__campo">
            <span>Profundidad (cm)</span>
            <input inputMode="decimal" value={profundidad} onChange={(e) => setProfundidad(e.target.value)} placeholder="Ej. 30.5" />
          </label>
        </div>

        <label className="accesorio-form__campo accesorio-form__campo--ancho">
          <span>Notas de capacidad</span>
          <textarea value={notas} maxLength={1000} rows={3} onChange={(e) => setNotas(e.target.value)} />
        </label>
      </form>
    </Modal>
  );
}
