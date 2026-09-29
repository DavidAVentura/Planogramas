import { useState } from 'react';
import { AppTopbar } from '../../components/dominio/layout/AppTopbar/AppTopbar';
import { FiltrosBar } from '../../components/dominio/listado/FiltrosBar/FiltrosBar';
import { PlanogramasTable } from '../../components/dominio/listado/PlanogramasTable/PlanogramasTable';
import { PlanogramaFormModal } from '../../components/dominio/modales/PlanogramaFormModal/PlanogramaFormModal';
import { ArchivarModal } from '../../components/dominio/modales/ArchivarModal/ArchivarModal';
import { Button } from '../../components/ui/Button/Button';
import { BotonFiltros } from '../../components/ui/BotonFiltros/BotonFiltros';
import { Paginacion } from '../../components/ui/Paginacion/Paginacion';
import { usePlanogramasListado } from '../../hooks/usePlanogramas';
import { useAuth } from '../../context/AuthContext';
import type { ListarPlanogramasFiltros, PlanogramaListItem } from '../../types/planograma';
import './PlanogramasListado.css';

/** Cuántos filtros están aplicados; se muestra en el botón para que no pasen desapercibidos con la barra oculta. */
function contarFiltrosActivos(filtros: ListarPlanogramasFiltros): number {
  return [filtros.departamento, filtros.estado, filtros.search].filter(Boolean).length;
}

export function PlanogramasListado() {
  const { puedeEscribir } = useAuth();
  const { filtros, setFiltros, resultado, cargando, recargar } = usePlanogramasListado();
  const [formularioAbierto, setFormularioAbierto] = useState(false);
  const [idAEditar, setIdAEditar] = useState<number | null>(null);
  const [planogramaAArchivar, setPlanogramaAArchivar] = useState<PlanogramaListItem | null>(null);
  // La barra de filtros arranca oculta, como en Estructura; el botón junto a "Crear" la despliega.
  const [filtrosVisibles, setFiltrosVisibles] = useState(false);

  function editar(row: PlanogramaListItem) {
    setIdAEditar(row.id);
    setFormularioAbierto(true);
  }

  function cambiarPagina(page: number) {
    setFiltros({ page });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function cerrarFormulario() {
    setFormularioAbierto(false);
    setIdAEditar(null);
  }

  return (
    <div className="planogramas-listado">
      <AppTopbar titulo="Planogramas" />

      <div className="planogramas-listado__contenido">
        <div className="planogramas-listado__barra">
          <div className="planogramas-listado__cabecera">
            <span className="planogramas-listado__conteo">
              {cargando ? 'Cargando…' : `${resultado?.total ?? 0} planogramas`}
            </span>
            <BotonFiltros
              controla="planogramas-listado-filtros"
              abierto={filtrosVisibles}
              activos={contarFiltrosActivos(filtros)}
              onClick={() => setFiltrosVisibles((v) => !v)}
            />
            {puedeEscribir && <Button onClick={() => setFormularioAbierto(true)}>+ Crear planograma</Button>}
          </div>

          <FiltrosBar id="planogramas-listado-filtros" filtros={filtros} onChange={setFiltros} visible={filtrosVisibles} />
        </div>

        {/* Al cambiar de página se mantiene la tabla anterior mientras llega la nueva. */}
        {resultado && (
          <>
            <PlanogramasTable
              rows={resultado.data}
              puedeEscribir={puedeEscribir}
              onEditar={editar}
              onArchivar={setPlanogramaAArchivar}
            />
            <Paginacion
              page={resultado.page}
              pageSize={resultado.pageSize}
              total={resultado.total}
              deshabilitado={cargando}
              onChange={cambiarPagina}
            />
          </>
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
