import { useState } from 'react';
import { AppTopbar } from '../../components/dominio/layout/AppTopbar/AppTopbar';
import { FiltrosBar } from '../../components/dominio/listado/FiltrosBar/FiltrosBar';
import { PlanogramasTable } from '../../components/dominio/listado/PlanogramasTable/PlanogramasTable';
import { PlanogramaFormModal } from '../../components/dominio/modales/PlanogramaFormModal/PlanogramaFormModal';
import { ArchivarModal } from '../../components/dominio/modales/ArchivarModal/ArchivarModal';
import { Button } from '../../components/ui/Button/Button';
import { usePlanogramasListado } from '../../hooks/usePlanogramas';
import { useAuth } from '../../context/AuthContext';
import type { PlanogramaListItem } from '../../types/planograma';
import './PlanogramasListado.css';

export function PlanogramasListado() {
  const { puedeEscribir } = useAuth();
  const { filtros, setFiltros, resultado, cargando, recargar } = usePlanogramasListado();
  const [formularioAbierto, setFormularioAbierto] = useState(false);
  const [idAEditar, setIdAEditar] = useState<number | null>(null);
  const [planogramaAArchivar, setPlanogramaAArchivar] = useState<PlanogramaListItem | null>(null);

  function editar(row: PlanogramaListItem) {
    setIdAEditar(row.id);
    setFormularioAbierto(true);
  }

  function cerrarFormulario() {
    setFormularioAbierto(false);
    setIdAEditar(null);
  }

  return (
    <div className="planogramas-listado">
      <AppTopbar titulo="Planogramas" />

      <div className="planogramas-listado__contenido">
        <div className="planogramas-listado__cabecera">
          <span className="planogramas-listado__conteo">
            {cargando ? 'Cargando…' : `${resultado?.total ?? 0} planogramas`}
          </span>
          {puedeEscribir && <Button onClick={() => setFormularioAbierto(true)}>+ Crear planograma</Button>}
        </div>

        <FiltrosBar filtros={filtros} onChange={setFiltros} />

        {!cargando && resultado && (
          <PlanogramasTable
            rows={resultado.data}
            puedeEscribir={puedeEscribir}
            onEditar={editar}
            onArchivar={setPlanogramaAArchivar}
          />
        )}
      </div>

      {formularioAbierto && (
        <PlanogramaFormModal
          planogramaId={idAEditar}
          onClose={cerrarFormulario}
          onGuardado={() => {
            cerrarFormulario();
            recargar();
          }}
        />
      )}

      {planogramaAArchivar && (
        <ArchivarModal
          planogramaId={planogramaAArchivar.id}
          nombre={planogramaAArchivar.nombre}
          onClose={() => setPlanogramaAArchivar(null)}
          onArchivado={() => {
            setPlanogramaAArchivar(null);
            recargar();
          }}
        />
      )}
    </div>
  );
}
