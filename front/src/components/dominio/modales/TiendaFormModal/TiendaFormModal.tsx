import { useState, type FormEvent } from 'react';
import { Modal } from '../../../ui/Modal/Modal';
import { Button } from '../../../ui/Button/Button';
import { useGuardarTienda } from '../../../../hooks/useTiendas';
import { MARCAS_TIENDA, TIPO_TIENDA_META, TIPOS_TIENDA } from '../../../../constants/tiendas';
import type { Tienda, TipoTienda } from '../../../../types/tienda';
import './TiendaFormModal.css';

// Misma regla que valida el backend (tiendas.controller.js): mayúsculas, dígitos y guion.
const PATRON_CODIGO = /^[A-Z0-9-]+$/;

interface TiendaFormModalProps {
  /** `null` = crear. Una tienda existente = editar. */
  tienda: Tienda | null;
  onClose: () => void;
  onGuardado: (tienda: Tienda) => void;
}

export function TiendaFormModal({ tienda, onClose, onGuardado }: TiendaFormModalProps) {
  const editando = tienda !== null;
  const { guardar, enviando } = useGuardarTienda();

  const [codigo, setCodigo] = useState(tienda?.codigo ?? '');
  const [nombre, setNombre] = useState(tienda?.nombre ?? '');
  const [tipo, setTipo] = useState<TipoTienda>(tienda?.tipo ?? 'GRANDE');
  const [marca, setMarca] = useState(tienda?.marca ?? (editando ? '' : 'Cemaco'));
  const [region, setRegion] = useState(tienda?.region ?? '');
  const [intentoGuardar, setIntentoGuardar] = useState(false);
  const [codigoDuplicado, setCodigoDuplicado] = useState<string | null>(null);

  const codigoLimpio = codigo.trim();
  const errorCodigo = !codigoLimpio
    ? 'El código es obligatorio.'
    : !PATRON_CODIGO.test(codigoLimpio)
      ? 'Solo letras mayúsculas, números y guion.'
      : codigoDuplicado === codigoLimpio
        ? `Ya existe una tienda con el código ${codigoLimpio}.`
        : null;
  const errorNombre = nombre.trim() ? null : 'El nombre es obligatorio.';
  const mostrarErrorCodigo = (intentoGuardar || codigoDuplicado !== null) && errorCodigo;
  const mostrarErrorNombre = intentoGuardar && errorNombre;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setIntentoGuardar(true);
    if (errorCodigo || errorNombre) return;

    const resultado = await guardar(tienda?.id ?? null, {
      codigo: codigoLimpio,
      nombre: nombre.trim(),
      tipo,
      marca: marca || null,
      region: region.trim() || null,
    });
    if (!resultado) return;
    if ('codigoDuplicado' in resultado) setCodigoDuplicado(resultado.codigoDuplicado);
    else onGuardado(resultado.tienda);
  }

  return (
    <Modal
      titulo={editando ? 'Editar tienda' : 'Crear tienda'}
      onClose={onClose}
      footer={
        <>
          <Button variante="outline" onClick={onClose} disabled={enviando}>
            Cancelar
          </Button>
          <Button type="submit" form="tienda-form" disabled={enviando}>
            {editando ? 'Guardar cambios' : 'Crear tienda'}
          </Button>
        </>
      }
    >
      <form id="tienda-form" className="tienda-form" onSubmit={onSubmit} noValidate>
        {editando && (
          <p className="tienda-form__contexto">
            {tienda.planogramas === 1
              ? 'Asignada a 1 planograma'
              : `Asignada a ${tienda.planogramas} planogramas`}
          </p>
        )}

        <label className="tienda-form__campo">
          <span>Código *</span>
          <input
            className="tienda-form__codigo"
            value={codigo}
            maxLength={20}
            placeholder="Ej. T0PC"
            aria-invalid={Boolean(mostrarErrorCodigo)}
            onChange={(e) => setCodigo(e.target.value.toUpperCase())}
            autoFocus
          />
          {mostrarErrorCodigo && <span className="tienda-form__error">{errorCodigo}</span>}
        </label>

        <label className="tienda-form__campo">
          <span>Tipo *</span>
          <select value={tipo} onChange={(e) => setTipo(e.target.value as TipoTienda)}>
            {TIPOS_TIENDA.map((t) => (
              <option key={t} value={t}>
                {TIPO_TIENDA_META[t].label}
              </option>
            ))}
          </select>
        </label>

        <label className="tienda-form__campo tienda-form__campo--ancho">
          <span>Nombre *</span>
          <input
            value={nombre}
            maxLength={200}
            placeholder="Ej. Cemaco Pradera"
            aria-invalid={Boolean(mostrarErrorNombre)}
            onChange={(e) => setNombre(e.target.value)}
          />
          {mostrarErrorNombre && <span className="tienda-form__error">{errorNombre}</span>}
        </label>

        <label className="tienda-form__campo">
          <span>Marca</span>
          <select value={marca} onChange={(e) => setMarca(e.target.value)}>
            <option value="">Sin marca</option>
            {MARCAS_TIENDA.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </label>

        <label className="tienda-form__campo">
          <span>Región</span>
          <input
            value={region}
            maxLength={200}
            placeholder="Ej. Guatemala Metropolitana"
            onChange={(e) => setRegion(e.target.value)}
          />
        </label>
      </form>
    </Modal>
  );
}
