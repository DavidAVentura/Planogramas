import { useEffect, useState, type FormEvent } from 'react';
import { Modal } from '../../../ui/Modal/Modal';
import { Button } from '../../../ui/Button/Button';
import { ChipInput } from '../../../ui/ChipInput/ChipInput';
import { CascadingSelect } from '../../../ui/CascadingSelect/CascadingSelect';
import { useJerarquia } from '../../../../hooks/useJerarquia';
import { useGuardarPlanograma, usePlanogramaDetalle } from '../../../../hooks/usePlanogramas';
import type { PlanogramaDetalle } from '../../../../types/planograma';
import './PlanogramaFormModal.css';

interface PlanogramaFormModalProps {
  /** `null` o ausente = crear. Un id existente = editar (el modal carga su propio detalle). */
  planogramaId?: number | null;
  onClose: () => void;
  onGuardado: (planograma: PlanogramaDetalle) => void;
}

export function PlanogramaFormModal({ planogramaId, onClose, onGuardado }: PlanogramaFormModalProps) {
  const editando = planogramaId != null;
  const { planograma } = usePlanogramaDetalle(planogramaId ?? null);
  const { areas, departamentos, cargandoDepartamentos, cargarDepartamentos } = useJerarquia();
  const { guardar, enviando } = useGuardarPlanograma();

  const [nombre, setNombre] = useState('');
  const [area, setArea] = useState('');
  // CascadingSelect trabaja con el id de CATI; Planograma.departamento se guarda por nombre
  // (así lo hace el backend real — ver ejemplos en GET /planogramas) — se traduce id -> name
  // recién al armar el payload en onSubmit.
  const [departamentoId, setDepartamentoId] = useState('');
  const [subcategorias, setSubcategorias] = useState<string[]>([]);

  const departamentoNombre = departamentos.find((d) => d.id === departamentoId)?.name ?? '';

  useEffect(() => {
    if (planograma) {
      setNombre(planograma.nombre);
      setSubcategorias(planograma.subcategorias);
    }
  }, [planograma]);

  useEffect(() => {
    cargarDepartamentos(area);
  }, [area, cargarDepartamentos]);

  const nombreValido = nombre.trim().length > 0;
  const departamentoValido = editando || Boolean(departamentoNombre);
  const formularioValido = nombreValido && departamentoValido && subcategorias.length > 0;
  const listoParaMostrarForm = !editando || Boolean(planograma);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!formularioValido) return;

    const guardado = await guardar(planogramaId ?? null, {
      nombre: nombre.trim(),
      subcategorias,
      ...(departamentoNombre ? { departamento: departamentoNombre } : {}),
    });
    if (guardado) onGuardado(guardado);
  }

  return (
    <Modal
      titulo={editando ? 'Editar planograma' : 'Crear planograma'}
      onClose={onClose}
      ancho="lg"
      footer={
        <>
          <Button variante="outline" onClick={onClose} disabled={enviando}>
            Cancelar
          </Button>
          <Button type="submit" form="planograma-form" disabled={!formularioValido || enviando}>
            Guardar
          </Button>
        </>
      }
    >
      {!listoParaMostrarForm ? (
        <p className="planograma-form__cargando">Cargando…</p>
      ) : (
        <form id="planograma-form" className="planograma-form" onSubmit={onSubmit}>
          <label className="planograma-form__campo">
            <span>Nombre</span>
            <input value={nombre} onChange={(e) => setNombre(e.target.value)} required />
          </label>

          {editando && (
            <p className="planograma-form__depto-actual">
              Departamento actual: <strong>{planograma?.departamento}</strong>
            </p>
          )}

          <div className="planograma-form__campo">
            <span>{editando ? 'Cambiar departamento (opcional)' : 'Área y departamento'}</span>
            <CascadingSelect
              areas={areas}
              departamentos={departamentos}
              areaValue={area}
              departamentoValue={departamentoId}
              cargandoDepartamentos={cargandoDepartamentos}
              requerido={!editando}
              onAreaChange={(areaId) => {
                setArea(areaId);
                setDepartamentoId('');
              }}
              onDepartamentoChange={setDepartamentoId}
            />
          </div>

          <label className="planograma-form__campo">
            <span>Subcategorías de referencia</span>
            <ChipInput
              valores={subcategorias}
              onChange={setSubcategorias}
              placeholder="Escribí y presioná Enter"
            />
          </label>
        </form>
      )}
    </Modal>
  );
}
