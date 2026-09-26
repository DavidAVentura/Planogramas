import { useMemo, useState } from 'react';
import { Modal } from '../../../ui/Modal/Modal';
import { Button } from '../../../ui/Button/Button';
import { EmptyState } from '../../../ui/EmptyState/EmptyState';
import { usePlanogramasVigentes } from '../../../../hooks/usePlanogramas';
import type { PlanogramaListItem } from '../../../../types/planograma';
import type { PlanogramaFiltro } from '../../../../types/producto';
import './FiltroPlanogramasModal.css';

type CampoOrden = 'departamento' | 'nombre' | 'versiones';

const OPCIONES_ORDEN: { campo: CampoOrden; etiqueta: string }[] = [
  { campo: 'departamento', etiqueta: 'Departamento' },
  { campo: 'nombre', etiqueta: 'Nombre' },
  { campo: 'versiones', etiqueta: 'Versiones' },
];

const porNombre = (a: PlanogramaListItem, b: PlanogramaListItem) => a.nombre.localeCompare(b.nombre);

// Departamento y versiones desempatan por nombre para que el orden sea estable.
const COMPARADORES: Record<CampoOrden, (a: PlanogramaListItem, b: PlanogramaListItem) => number> = {
  departamento: (a, b) => a.departamento.localeCompare(b.departamento) || porNombre(a, b),
  nombre: porNombre,
  versiones: (a, b) => a.totalVersiones - b.totalVersiones || porNombre(a, b),
};

interface FiltroPlanogramasModalProps {
  seleccionados: PlanogramaFiltro[];
  /** Productos de la lista actual (ya filtrada por jerarquía) que aparecen en cada planograma. */
  productosPorPlanograma: Map<number, number>;
  onAplicar: (seleccionados: PlanogramaFiltro[]) => void;
  onClose: () => void;
}

export function FiltroPlanogramasModal({
  seleccionados,
  productosPorPlanograma,
  onAplicar,
  onClose,
}: FiltroPlanogramasModalProps) {
  const { planogramas, cargando } = usePlanogramasVigentes();
  const [busqueda, setBusqueda] = useState('');
  const [orden, setOrden] = useState<{ campo: CampoOrden; dir: 'asc' | 'desc' }>({ campo: 'nombre', dir: 'asc' });
  // Borrador: la selección solo se aplica al confirmar.
  const [elegidos, setElegidos] = useState<Map<number, string>>(
    () => new Map(seleccionados.map((p) => [p.id, p.nombre])),
  );

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    const signo = orden.dir === 'asc' ? 1 : -1;
    return planogramas
      .filter((p) => !q || p.nombre.toLowerCase().includes(q) || p.departamento.toLowerCase().includes(q))
      .sort((a, b) => signo * COMPARADORES[orden.campo](a, b));
  }, [planogramas, busqueda, orden]);

  function ordenarPor(campo: CampoOrden) {
    setOrden((actual) =>
      actual.campo === campo ? { campo, dir: actual.dir === 'asc' ? 'desc' : 'asc' } : { campo, dir: 'asc' },
    );
  }

  function alternar(planograma: PlanogramaListItem) {
    setElegidos((actual) => {
      const nuevo = new Map(actual);
      if (nuevo.has(planograma.id)) nuevo.delete(planograma.id);
      else nuevo.set(planograma.id, planograma.nombre);
      return nuevo;
    });
  }

  const todosVisiblesElegidos = visibles.length > 0 && visibles.every((p) => elegidos.has(p.id));

  function alternarVisibles() {
    setElegidos((actual) => {
      const nuevo = new Map(actual);
      visibles.forEach((p) => {
        if (todosVisiblesElegidos) nuevo.delete(p.id);
        else nuevo.set(p.id, p.nombre);
      });
      return nuevo;
    });
  }

  function aplicar() {
    onAplicar([...elegidos].map(([id, nombre]) => ({ id, nombre })));
    onClose();
  }

  return (
    <Modal
      titulo="Filtrar por planograma"
      onClose={onClose}
      ancho="lg"
      footer={
        <>
          <span className="filtro-planogramas__conteo">
            {elegidos.size === 0
              ? 'Ninguno seleccionado'
              : elegidos.size === 1
                ? '1 seleccionado'
                : `${elegidos.size} seleccionados`}
          </span>
          {elegidos.size > 0 && (
            <Button variante="ghost" onClick={() => setElegidos(new Map())}>
              Limpiar selección
            </Button>
          )}
          <Button variante="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={aplicar}>Aplicar</Button>
        </>
      }
    >
      <div className="filtro-planogramas__controles">
        <input
          type="search"
          className="filtro-planogramas__busqueda"
          placeholder="Buscar por nombre o departamento"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          autoFocus
        />
        <div className="filtro-planogramas__orden" role="group" aria-label="Ordenar por">
          <span>Ordenar por</span>
          {OPCIONES_ORDEN.map(({ campo, etiqueta }) => {
            const activo = orden.campo === campo;
            return (
              <button
                key={campo}
                type="button"
                className={`filtro-planogramas__orden-btn${activo ? ' filtro-planogramas__orden-btn--activo' : ''}`}
                aria-pressed={activo}
                onClick={() => ordenarPor(campo)}
              >
                {etiqueta}
                {activo && <span aria-hidden="true">{orden.dir === 'asc' ? ' ↑' : ' ↓'}</span>}
              </button>
            );
          })}
        </div>
      </div>

      {cargando ? (
        <p className="filtro-planogramas__cargando">Cargando planogramas…</p>
      ) : visibles.length === 0 ? (
        <EmptyState
          titulo={planogramas.length === 0 ? 'No hay planogramas vigentes' : 'Ningún planograma coincide'}
          hint={planogramas.length === 0 ? undefined : 'Prueba con otro nombre o departamento.'}
        />
      ) : (
        <div className="filtro-planogramas__lista">
          <label className="filtro-planogramas__fila filtro-planogramas__fila--todos">
            <input type="checkbox" checked={todosVisiblesElegidos} onChange={alternarVisibles} />
            <span>{busqueda.trim() ? `Todos los resultados (${visibles.length})` : `Todos (${visibles.length})`}</span>
          </label>
          {visibles.map((p) => {
            const productos = productosPorPlanograma.get(p.id) ?? 0;
            return (
              <label key={p.id} className="filtro-planogramas__fila">
                <input type="checkbox" checked={elegidos.has(p.id)} onChange={() => alternar(p)} />
                <span className="filtro-planogramas__nombre">
                  {p.nombre}
                  <span className="filtro-planogramas__departamento">{p.departamento}</span>
                </span>
                <span className="filtro-planogramas__meta">
                  {p.totalVersiones === 1 ? '1 versión' : `${p.totalVersiones} versiones`}
                </span>
                <span className="filtro-planogramas__meta">
                  {productos === 1 ? '1 producto' : `${productos} productos`}
                </span>
              </label>
            );
          })}
        </div>
      )}
    </Modal>
  );
}
