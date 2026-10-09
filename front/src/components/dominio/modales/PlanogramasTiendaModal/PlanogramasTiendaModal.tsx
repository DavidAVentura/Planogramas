import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Modal } from '../../../ui/Modal/Modal';
import { Button } from '../../../ui/Button/Button';
import { Badge } from '../../../ui/Badge/Badge';
import { Table, type TableColumn } from '../../../ui/Table/Table';
import { EmptyState } from '../../../ui/EmptyState/EmptyState';
import { IdentidadPlanograma } from '../../IdentidadPlanograma/IdentidadPlanograma';
import { usePlanogramasPublicadosTienda } from '../../../../hooks/useTiendas';
import { SIGLA_TIPO_TIENDA, TIPO_TIENDA_META } from '../../../../constants/tiendas';
import { subcategoriaSinCodigo } from '../../../../utils/formatters';
import type { PlanogramaPublicadoTienda, Tienda } from '../../../../types/tienda';
import './PlanogramasTiendaModal.css';

const SUBCATEGORIAS_VISIBLES = 2;

interface PlanogramasTiendaModalProps {
  tienda: Tienda;
  onClose: () => void;
}

export function PlanogramasTiendaModal({ tienda, onClose }: PlanogramasTiendaModalProps) {
  const { planogramas, cargando } = usePlanogramasPublicadosTienda(tienda.id);
  const [busqueda, setBusqueda] = useState('');
  const [departamento, setDepartamento] = useState('');

  const departamentos = useMemo(
    () => [...new Set(planogramas.map((p) => p.departamento))].sort((a, b) => a.localeCompare(b, 'es')),
    [planogramas],
  );

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return planogramas
      .filter((p) => !departamento || p.departamento === departamento)
      .filter(
        (p) =>
          !q ||
          p.nombre.toLowerCase().includes(q) ||
          (p.descripcion ?? '').toLowerCase().includes(q) ||
          p.codigo.toLowerCase().includes(q) ||
          p.subcategorias.some((s) => s.toLowerCase().includes(q)),
      )
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }));
  }, [planogramas, busqueda, departamento]);

  const tipoTienda = TIPO_TIENDA_META[tienda.tipo];
  const conteo =
    visibles.length === planogramas.length
      ? `${planogramas.length} ${planogramas.length === 1 ? 'versión publicada' : 'versiones publicadas'}`
      : `${visibles.length} de ${planogramas.length}`;

  const columnas: TableColumn<PlanogramaPublicadoTienda>[] = [
    {
      key: 'planograma',
      header: 'Planograma',
      render: (p) => (
        <span className="planogramas-tienda__planograma">
          <IdentidadPlanograma nombre={p.nombre} descripcion={p.descripcion} variante="compacta" />
          <span className="planogramas-tienda__codigo">{p.codigo}</span>
        </span>
      ),
    },
    { key: 'departamento', header: 'Departamento', render: (p) => p.departamento },
    {
      key: 'version',
      header: 'Versión',
      render: (p) => (
        <span className="planogramas-tienda__badges">
          <Badge bg={TIPO_TIENDA_META[p.tipo].bg} color={TIPO_TIENDA_META[p.tipo].color}>
            {TIPO_TIENDA_META[p.tipo].label} · {SIGLA_TIPO_TIENDA[p.tipo]}
          </Badge>
          {p.esEspecial && (
            <span title="Versión especial para esta tienda">
              <Badge bg="#fff1e5" color="#9a4a00">
                Especial
              </Badge>
            </span>
          )}
        </span>
      ),
    },
    { key: 'subcategorias', header: 'Subcategorías', render: (p) => <Subcategorias lista={p.subcategorias} /> },
    {
      key: 'acciones',
      header: 'Acciones',
      alinear: 'right',
      render: (p) => (
        <Link className="planogramas-tienda__ver" to={`/planogramas/${p.planogramaId}`}>
          Ver planograma
        </Link>
      ),
    },
  ];

  return (
    <Modal
      titulo="Planogramas publicados"
      onClose={onClose}
      ancho="xl"
      claseModal="planogramas-tienda-modal"
      footer={
        <>
          <span className="planogramas-tienda__nota">Solo versiones en estado publicado asignadas a la tienda.</span>
          <Button variante="outline" onClick={onClose}>
            Cerrar
          </Button>
        </>
      }
    >
      <div className="planogramas-tienda">
        <div className="planogramas-tienda__tienda">
          <strong>{tienda.nombre}</strong>
          <span className="planogramas-tienda__codigo">{tienda.codigo}</span>
          <Badge bg={tipoTienda.bg} color={tipoTienda.color}>
            {tipoTienda.label}
          </Badge>
          <span>{tienda.marca ?? 'Sin marca'}</span>
        </div>

        <div className="planogramas-tienda__filtros">
          <label className="planogramas-tienda__campo planogramas-tienda__campo--busqueda">
            <span>Buscar</span>
            <input
              type="search"
              placeholder="Planograma, código de versión o subcategoría"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </label>
          <label className="planogramas-tienda__campo">
            <span>Departamento</span>
            <select value={departamento} onChange={(e) => setDepartamento(e.target.value)}>
              <option value="">Todos</option>
              {departamentos.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </label>
          {!cargando && <span className="planogramas-tienda__conteo">{conteo}</span>}
        </div>

        {cargando ? (
          <p className="planogramas-tienda__cargando">Cargando…</p>
        ) : (
          <Table
            columns={columnas}
            rows={visibles}
            rowKey={(p) => p.versionId}
            vacio={
              planogramas.length === 0 ? (
                <EmptyState titulo="No hay planogramas publicados asignados a esta tienda" />
              ) : (
                <EmptyState
                  titulo="Ningún planograma coincide con la búsqueda"
                  hint="Prueba con otro nombre o departamento."
                />
              )
            }
          />
        )}
      </div>
    </Modal>
  );
}

function Subcategorias({ lista }: { lista: string[] }) {
  const nombres = lista.map(subcategoriaSinCodigo);
  const restantes = nombres.slice(SUBCATEGORIAS_VISIBLES);

  return (
    <span className="planogramas-tienda__subcats">
      {lista.slice(0, SUBCATEGORIAS_VISIBLES).map((completa, i) => (
        <span key={completa} className="planogramas-tienda__subcat" title={completa}>
          {nombres[i]}
        </span>
      ))}
      {restantes.length > 0 && (
        <span className="planogramas-tienda__subcat planogramas-tienda__subcat--mas" title={restantes.join(', ')}>
          +{restantes.length}
        </span>
      )}
    </span>
  );
}
