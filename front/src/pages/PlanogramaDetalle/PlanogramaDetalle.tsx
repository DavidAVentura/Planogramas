import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AppTopbar } from '../../components/dominio/layout/AppTopbar/AppTopbar';
import { Breadcrumb } from '../../components/dominio/layout/Breadcrumb/Breadcrumb';
import { EstadoBadge } from '../../components/dominio/EstadoBadge/EstadoBadge';
import { SubcategoriasCard } from '../../components/dominio/detalle/SubcategoriasCard/SubcategoriasCard';
import { VersionesTable } from '../../components/dominio/detalle/VersionesTable/VersionesTable';
import { PlanogramaFormModal } from '../../components/dominio/modales/PlanogramaFormModal/PlanogramaFormModal';
import { ArchivarModal } from '../../components/dominio/modales/ArchivarModal/ArchivarModal';
import { ArchivarVersionModal } from '../../components/dominio/modales/ArchivarVersionModal/ArchivarVersionModal';
import { CrearVersionModal } from '../../components/dominio/modales/CrearVersionModal/CrearVersionModal';
import { VersionEspecialWizard } from '../../components/dominio/modales/VersionEspecialWizard/VersionEspecialWizard';
import { PublicarVersionModal } from '../../components/dominio/modales/PublicarVersionModal/PublicarVersionModal';
import { SeleccionarVistaDisenoModal } from '../../components/dominio/modales/SeleccionarVistaDisenoModal/SeleccionarVistaDisenoModal';
import { AdjuntosModal } from '../../components/dominio/modales/AdjuntosModal/AdjuntosModal';
import { Button } from '../../components/ui/Button/Button';
import { EmptyState } from '../../components/ui/EmptyState/EmptyState';
import { usePlanogramaDetalle } from '../../hooks/usePlanogramas';
import { useGuardarVersion, useVersionesDePlanograma } from '../../hooks/useVersiones';
import { useAuth } from '../../context/AuthContext';
import { rutaEstructura } from '../../domain/estructura/contexto';
import { formatearFecha } from '../../utils/formatters';
import type { VersionListItem } from '../../types/version';
import './PlanogramaDetalle.css';

export function PlanogramaDetalle() {
  const { id } = useParams<{ id: string }>();
  const idNumerico = Number(id);
  const navigate = useNavigate();
  const { puedeEscribir } = useAuth();
  const { planograma, cargando, noEncontrado, recargar } = usePlanogramaDetalle(idNumerico);
  const { versiones, cargando: cargandoVersiones, recargar: recargarVersiones } = useVersionesDePlanograma(idNumerico);
  const { guardar: marcarEnDesarrollo } = useGuardarVersion();

  const [formularioAbierto, setFormularioAbierto] = useState(false);
  const [archivarAbierto, setArchivarAbierto] = useState(false);
  const [crearVersionAbierto, setCrearVersionAbierto] = useState(false);
  const [especialWizardAbierto, setEspecialWizardAbierto] = useState(false);
  // Contraídas por defecto: el espacio queda para la tabla de versiones.
  const [subcategoriasAbiertas, setSubcategoriasAbiertas] = useState(false);
  const [versionADisenar, setVersionADisenar] = useState<VersionListItem | null>(null);
  const [versionAAdjuntos, setVersionAAdjuntos] = useState<VersionListItem | null>(null);
  const [versionAPublicar, setVersionAPublicar] = useState<VersionListItem | null>(null);
  const [versionAArchivar, setVersionAArchivar] = useState<VersionListItem | null>(null);

  async function onMarcarEnDesarrollo(v: VersionListItem) {
    const actualizada = await marcarEnDesarrollo(v.id);
    if (actualizada) recargarVersiones();
  }

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

  const archivado = planograma?.estado === 'archivado';

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
          <section className="planograma-detalle__cabecera" aria-labelledby="titulo-planograma">
            {/* Una sola fila; si no cabe, primero bajan las acciones y luego la meta. */}
            <div className="planograma-detalle__fila">
              <div className="planograma-detalle__titulo">
                <h1 id="titulo-planograma">{planograma.nombre}</h1>
                <EstadoBadge estado={planograma.estado} />
                <span className="planograma-detalle__meta">
                  {planograma.departamento} · creado el {formatearFecha(planograma.created_at)} por {planograma.created_by}
                </span>
              </div>
              <div className="planograma-detalle__acciones">
                {planograma.subcategorias.length > 0 && (
                  <button
                    type="button"
                    className={`planograma-detalle__subcategorias${subcategoriasAbiertas ? ' planograma-detalle__subcategorias--abiertas' : ''}`}
                    aria-expanded={subcategoriasAbiertas}
                    aria-controls="subcategorias-planograma"
                    onClick={() => setSubcategoriasAbiertas((a) => !a)}
                  >
                    Subcategorías
                    <span className="planograma-detalle__conteo">{planograma.subcategorias.length}</span>
                    <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  </button>
                )}
                {puedeEscribir && (
                  <>
                    <Button variante="ghost" onClick={() => setFormularioAbierto(true)}>
                      Editar
                    </Button>
                    <Button
                      variante="ghost"
                      className="planograma-detalle__archivar"
                      disabled={archivado}
                      onClick={() => setArchivarAbierto(true)}
                    >
                      Archivar
                    </Button>
                  </>
                )}
              </div>
            </div>
            {subcategoriasAbiertas && <SubcategoriasCard id="subcategorias-planograma" subcategorias={planograma.subcategorias} />}
          </section>

          <section className="planograma-detalle__versiones" aria-labelledby="titulo-versiones">
            <div className="planograma-detalle__versiones-cabecera">
              <h2 id="titulo-versiones">
                Versiones
                {!cargandoVersiones && (
                  <span>{versiones.length === 1 ? '1 versión' : `${versiones.length} versiones`}</span>
                )}
              </h2>
              <div className="planograma-detalle__acciones">
                <Link
                  className="button button--ghost"
                  to={rutaEstructura({ planogramaId: idNumerico })}
                  title="Asignar versiones de este planograma a las tiendas en Estructura"
                >
                  <svg className="planograma-detalle__icono" width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M4 10l1.5-5h13L20 10" />
                    <path d="M4 10h16v2a2.5 2.5 0 01-5 0 2.5 2.5 0 01-5 0 2.5 2.5 0 01-5 0z" />
                    <path d="M5.5 13.5V20h13v-6.5" />
                  </svg>
                  Tiendas
                </Link>
                {puedeEscribir && !archivado && (
                  <>
                    <Button variante="ghost" onClick={() => setEspecialWizardAbierto(true)}>
                      Versión especial por tienda
                    </Button>
                    <Button onClick={() => setCrearVersionAbierto(true)}>+ Crear versión</Button>
                  </>
                )}
              </div>
            </div>
            {!cargandoVersiones && (
              <VersionesTable
                planogramaId={idNumerico}
                versiones={versiones}
                puedeEscribir={puedeEscribir}
                onMarcarEnDesarrollo={onMarcarEnDesarrollo}
                onDisenar={setVersionADisenar}
                onAdjuntos={setVersionAAdjuntos}
                onPublicar={setVersionAPublicar}
                onArchivar={setVersionAArchivar}
              />
            )}
          </section>
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

      {crearVersionAbierto && (
        <CrearVersionModal
          planogramaId={idNumerico}
          onClose={() => setCrearVersionAbierto(false)}
          onCreada={() => {
            setCrearVersionAbierto(false);
            recargarVersiones();
          }}
        />
      )}

      {especialWizardAbierto && (
        <VersionEspecialWizard
          planogramaId={idNumerico}
          versionesBase={versiones}
          onClose={() => setEspecialWizardAbierto(false)}
          onCreada={() => {
            setEspecialWizardAbierto(false);
            recargarVersiones();
          }}
        />
      )}

      {versionADisenar && (
        <SeleccionarVistaDisenoModal
          planogramaId={idNumerico}
          version={versionADisenar}
          onClose={() => setVersionADisenar(null)}
        />
      )}

      {versionAAdjuntos && (
        <AdjuntosModal version={versionAAdjuntos} onClose={() => setVersionAAdjuntos(null)} />
      )}

      {versionAPublicar && (
        <PublicarVersionModal
          planogramaId={idNumerico}
          version={versionAPublicar}
          onClose={() => setVersionAPublicar(null)}
          onPublicada={() => {
            setVersionAPublicar(null);
            recargarVersiones();
          }}
        />
      )}

      {versionAArchivar && (
        <ArchivarVersionModal
          version={versionAArchivar}
          onClose={() => setVersionAArchivar(null)}
          onArchivada={() => {
            setVersionAArchivar(null);
            recargarVersiones();
          }}
        />
      )}
    </div>
  );
}
