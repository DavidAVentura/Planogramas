import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppTopbar } from '../../components/dominio/layout/AppTopbar/AppTopbar';
import { Breadcrumb } from '../../components/dominio/layout/Breadcrumb/Breadcrumb';
import { EstadoBadge } from '../../components/dominio/EstadoBadge/EstadoBadge';
import { SubcategoriasCard } from '../../components/dominio/detalle/SubcategoriasCard/SubcategoriasCard';
import { VersionesTable } from '../../components/dominio/detalle/VersionesTable/VersionesTable';
import { PlanogramaFormModal } from '../../components/dominio/modales/PlanogramaFormModal/PlanogramaFormModal';
import { ArchivarModal } from '../../components/dominio/modales/ArchivarModal/ArchivarModal';
import { Button } from '../../components/ui/Button/Button';
import { EmptyState } from '../../components/ui/EmptyState/EmptyState';
import { usePlanogramaDetalle } from '../../hooks/usePlanogramas';
import { useAuth } from '../../context/AuthContext';
import { formatearFecha } from '../../utils/formatters';
import './PlanogramaDetalle.css';

export function PlanogramaDetalle() {
  const { id } = useParams<{ id: string }>();
  const idNumerico = Number(id);
  const navigate = useNavigate();
  const { puedeEscribir } = useAuth();
  const { planograma, cargando, noEncontrado, recargar } = usePlanogramaDetalle(idNumerico);
  const [formularioAbierto, setFormularioAbierto] = useState(false);
  const [archivarAbierto, setArchivarAbierto] = useState(false);

  if (noEncontrado) {
    return (
      <div className="planograma-detalle">
        <AppTopbar titulo="Planogramas" />
        <div className="planograma-detalle__contenido">
          <EmptyState
            titulo="Este planograma no existe"
            hint="Puede que haya sido eliminado o que el enlace esté mal."
            accion={<Button variante="outline" onClick={() => navigate('/planogramas')}>Volver al listado</Button>}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="planograma-detalle">
      <AppTopbar
        titulo="Planogramas"
        breadcrumb={
          <Breadcrumb
            segmentos={[
              { label: 'Planogramas', to: '/planogramas' },
              { label: cargando ? '…' : (planograma?.nombre ?? '') },
            ]}
          />
        }
      />

      {!cargando && planograma && (
        <div className="planograma-detalle__contenido">
          <div className="planograma-detalle__cabecera">
            <div>
              <div className="planograma-detalle__titulo">
                <h1>{planograma.nombre}</h1>
                <EstadoBadge estado={planograma.estado} />
              </div>
              <p className="planograma-detalle__meta">
                {planograma.departamento} · creado el {formatearFecha(planograma.created_at)} por{' '}
                {planograma.created_by}
              </p>
            </div>
            {puedeEscribir && (
              <div className="planograma-detalle__acciones">
                <Button variante="outline" onClick={() => setFormularioAbierto(true)}>
                  Editar
                </Button>
                <Button
                  variante="peligro"
                  disabled={planograma.estado === 'archivado'}
                  onClick={() => setArchivarAbierto(true)}
                >
                  Archivar
                </Button>
              </div>
            )}
          </div>

          <SubcategoriasCard subcategorias={planograma.subcategorias} />

          <div className="planograma-detalle__versiones">
            <h3>Versiones</h3>
            <VersionesTable versiones={planograma.versiones} />
          </div>
        </div>
      )}

      {formularioAbierto && (
        <PlanogramaFormModal
          planogramaId={idNumerico}
          onClose={() => setFormularioAbierto(false)}
          onGuardado={() => {
            setFormularioAbierto(false);
            recargar();
          }}
        />
      )}

      {archivarAbierto && planograma && (
        <ArchivarModal
          planogramaId={planograma.id}
          nombre={planograma.nombre}
          onClose={() => setArchivarAbierto(false)}
          onArchivado={() => {
            setArchivarAbierto(false);
            recargar();
          }}
        />
      )}
    </div>
  );
}
