import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { AppTopbar } from '../../components/dominio/layout/AppTopbar/AppTopbar';
import { Breadcrumb } from '../../components/dominio/layout/Breadcrumb/Breadcrumb';
import { GondolaTabs } from '../../components/dominio/editor/GondolaTabs/GondolaTabs';
import { GondolaModal } from '../../components/dominio/modales/GondolaModal/GondolaModal';
import { EliminarGondolaModal } from '../../components/dominio/modales/EliminarGondolaModal/EliminarGondolaModal';
import { EmptyState } from '../../components/ui/EmptyState/EmptyState';
import { usePlanogramaDetalle } from '../../hooks/usePlanogramas';
import { useVersionesDePlanograma } from '../../hooks/useVersiones';
import { useGondolasDeVersion, useReordenarGondolas } from '../../hooks/useGondolas';
import { useAuth } from '../../context/AuthContext';
import type { GondolaListItem } from '../../types/gondola';
import './EditorPlanograma.css';

export function EditorPlanograma() {
  const { id, versionId } = useParams<{ id: string; versionId: string }>();
  const planogramaId = Number(id);
  const versionIdNumerico = Number(versionId);
  const { puedeEscribir } = useAuth();

  const { planograma, cargando: cargandoPlanograma } = usePlanogramaDetalle(planogramaId);
  const { versiones, cargando: cargandoVersiones } = useVersionesDePlanograma(planogramaId);
  const { gondolas, cargando: cargandoGondolas, recargar: recargarGondolas } = useGondolasDeVersion(versionIdNumerico);
  const { reordenar } = useReordenarGondolas();

  const version = versiones.find((v) => v.id === versionIdNumerico);

  const [activaId, setActivaId] = useState<number | null>(null);
  const [modalGondola, setModalGondola] = useState<'crear' | GondolaListItem | null>(null);
  const [gondolaAEliminar, setGondolaAEliminar] = useState<GondolaListItem | null>(null);

  useEffect(() => {
    if (activaId !== null && gondolas.some((g) => g.id === activaId)) return;
    setActivaId(gondolas[0]?.id ?? null);
  }, [gondolas, activaId]);

  async function onMover(gondola: GondolaListItem, direccion: 'subir' | 'bajar') {
    const indice = gondolas.findIndex((g) => g.id === gondola.id);
    const destino = direccion === 'subir' ? indice - 1 : indice + 1;
    if (destino < 0 || destino >= gondolas.length) return;

    const reordenadas = [...gondolas];
    [reordenadas[indice], reordenadas[destino]] = [reordenadas[destino], reordenadas[indice]];

    const orden = reordenadas.map((g, i) => ({ id: g.id, orden: i + 1 }));
    const resultado = await reordenar(versionIdNumerico, orden);
    if (resultado) recargarGondolas();
  }

  const cargandoInicial = cargandoPlanograma || cargandoVersiones;
  const gondolaActiva = gondolas.find((g) => g.id === activaId) ?? null;

  if (!cargandoInicial && (!planograma || !version)) {
    return (
      <div className="editor-planograma">
        <AppTopbar titulo="Planogramas" />
        <div className="editor-planograma__contenido">
          <EmptyState
            titulo="Esta versión no existe"
            hint="Puede que haya sido eliminada o que el enlace esté mal."
          />
        </div>
      </div>
    );
  }

  return (
    <div className="editor-planograma">
      <AppTopbar
        titulo="Planogramas"
        breadcrumb={
          <Breadcrumb
            segmentos={[
              { label: 'Planogramas', to: '/planogramas' },
              { label: cargandoPlanograma ? '…' : (planograma?.nombre ?? ''), to: `/planogramas/${planogramaId}` },
              { label: cargandoVersiones ? '…' : (version?.codigo ?? '') },
            ]}
          />
        }
      />

      {!cargandoInicial && (
        <div className="editor-planograma__contenido">
          <GondolaTabs
            gondolas={gondolas}
            activaId={activaId}
            puedeEscribir={puedeEscribir}
            onSeleccionar={setActivaId}
            onAgregar={() => setModalGondola('crear')}
            onEditar={setModalGondola}
            onEliminar={setGondolaAEliminar}
            onMover={onMover}
          />

          {!cargandoGondolas && gondolas.length === 0 && (
            <EmptyState
              titulo="Esta versión todavía no tiene góndolas"
              hint={puedeEscribir ? 'Agrega la primera góndola para empezar a armar el planograma.' : undefined}
            />
          )}

          {gondolaActiva && (
            <div className="editor-planograma__gondola-activa">
              <EmptyState
                titulo="Niveles — próximamente"
                hint={`${gondolaActiva.nombre} · ${gondolaActiva.ancho_cm}×${gondolaActiva.alto_cm}×${gondolaActiva.profundidad_cm} cm${
                  gondolaActiva.posicion_en_tienda ? ` · ${gondolaActiva.posicion_en_tienda}` : ''
                }`}
              />
            </div>
          )}
        </div>
      )}

      {modalGondola && (
        <GondolaModal
          versionId={versionIdNumerico}
          gondola={modalGondola === 'crear' ? null : modalGondola}
          onClose={() => setModalGondola(null)}
          onGuardada={(gondola) => {
            setModalGondola(null);
            recargarGondolas();
            setActivaId(gondola.id);
          }}
        />
      )}

      {gondolaAEliminar && (
        <EliminarGondolaModal
          gondola={gondolaAEliminar}
          onClose={() => setGondolaAEliminar(null)}
          onEliminada={() => {
            setGondolaAEliminar(null);
            recargarGondolas();
          }}
        />
      )}
    </div>
  );
}
