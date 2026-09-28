import { useMemo, useState } from 'react';
import { AppTopbar } from '../../components/dominio/layout/AppTopbar/AppTopbar';
import { SinTiendaElegida } from '../../components/dominio/implementacion/SinTiendaElegida/SinTiendaElegida';
import { MiTiendaFiltros } from '../../components/dominio/implementacion/MiTiendaFiltros/MiTiendaFiltros';
import { MiTiendaTable } from '../../components/dominio/implementacion/MiTiendaTable/MiTiendaTable';
import { ArchivosVersionModal } from '../../components/dominio/implementacion/ArchivosVersionModal/ArchivosVersionModal';
import { EvidenciaModal } from '../../components/dominio/implementacion/EvidenciaModal/EvidenciaModal';
import { EmptyState } from '../../components/ui/EmptyState/EmptyState';
import { useTiendaImplementador } from '../../context/TiendaImplementadorContext';
import { useResumenImplementacion } from '../../hooks/useImplementacion';
import { FILTROS_MI_TIENDA_INICIALES, UMBRAL_IMPLEMENTABLE_POR_DEFECTO } from '../../constants/implementacion';
import { calcularKpis, departamentosDe, filtrarPlanogramas } from '../../domain/implementacion/miTienda';
import { textoHaceTiempo } from '../../utils/formatters';
import type { FiltrosMiTienda, PlanogramaImplementacion, TiendaImplementador } from '../../types/implementacion';
import './MiTienda.css';

type ModalAbierto = { tipo: 'archivos' | 'evidencia'; planograma: PlanogramaImplementacion } | null;

export function MiTienda() {
  const { tienda } = useTiendaImplementador();

  return (
    <div className="mi-tienda">
      <AppTopbar titulo="Mi tienda" />
      <main className="mi-tienda__contenido">
        {tienda ? <ContenidoMiTienda key={tienda.id} tienda={tienda} /> : <SinTiendaElegida />}
      </main>
    </div>
  );
}

function ContenidoMiTienda({ tienda }: { tienda: TiendaImplementador }) {
  const { resumen, cargando, recargar } = useResumenImplementacion(tienda.id);
  const [filtros, setFiltros] = useState<FiltrosMiTienda>(FILTROS_MI_TIENDA_INICIALES);
  const [modal, setModal] = useState<ModalAbierto>(null);

  const planogramas = useMemo(() => resumen?.planogramas ?? [], [resumen]);
  const inventarioDisponible = resumen?.inventarioDisponible ?? true;
  const umbral = resumen?.umbralImplementable ?? UMBRAL_IMPLEMENTABLE_POR_DEFECTO;

  const visibles = useMemo(
    () => filtrarPlanogramas(planogramas, filtros, inventarioDisponible),
    [planogramas, filtros, inventarioDisponible],
  );
  const kpis = calcularKpis(planogramas, inventarioDisponible);
  const departamentos = useMemo(() => departamentosDe(planogramas), [planogramas]);

  const tarjetas = [
    { etiqueta: 'Planogramas asignados', valor: kpis.asignados, variante: '' },
    { etiqueta: 'Se pueden implementar', valor: kpis.implementables, variante: 'si' },
    { etiqueta: `No llegan al ${umbral} % de inventario`, valor: kpis.noImplementables, variante: 'no' },
    { etiqueta: 'Evidencia pendiente', valor: kpis.evidenciaPendiente, variante: 'pendiente' },
  ];

  function cerrarModal() {
    const eraEvidencia = modal?.tipo === 'evidencia';
    setModal(null);
    // Al cerrar la evidencia se recargan los conteos (Pendiente/Reportado, KPIs).
    if (eraEvidencia) recargar();
  }

  return (
    <>
      <div className="mi-tienda__cabecera">
        <div className="mi-tienda__titulos">
          <h1 className="mi-tienda__titulo">Mi tienda</h1>
          <span className="mi-tienda__subtitulo">
            Planogramas asignados a {tienda.nombre}, con la versión que te toca montar.
          </span>
        </div>
        <span className="mi-tienda__regla">
          Se puede implementar cuando más del {umbral} % de los productos tiene inventario en tienda
          {resumen?.inventarioActualizadoEn && ` · Inventario actualizado ${textoHaceTiempo(resumen.inventarioActualizadoEn)}`}
        </span>
      </div>

      {resumen && !inventarioDisponible && (
        <div className="mi-tienda__advertencia" role="status">
          <strong>{resumen.advertencia ?? 'Inventario no disponible en este momento'}.</strong> Puedes seguir viendo tus
          planogramas, archivos y evidencia; el inventario y "Se puede implementar" se mostrarán cuando vuelva.
        </div>
      )}

      {resumen && inventarioDisponible && resumen.inventarioDesactualizado && (
        <div className="mi-tienda__advertencia" role="status">
          <strong>{resumen.advertencia ?? 'No se pudo actualizar el inventario'}.</strong> El inventario y "Se puede
          implementar" corresponden a la última consulta
          {resumen.inventarioActualizadoEn && ` (${textoHaceTiempo(resumen.inventarioActualizadoEn)})`}.
        </div>
      )}

      <div className="mi-tienda__kpis">
        {tarjetas.map((t) => (
          <div key={t.etiqueta} className="mi-tienda__kpi">
            <span className="mi-tienda__kpi-etiqueta">{t.etiqueta}</span>
            <span className={`mi-tienda__kpi-valor${t.variante ? ` mi-tienda__kpi-valor--${t.variante}` : ''}`}>
              {cargando && !resumen ? '…' : (t.valor ?? '—')}
            </span>
          </div>
        ))}
      </div>

      <MiTiendaFiltros
        filtros={filtros}
        departamentos={departamentos}
        inventarioDisponible={inventarioDisponible}
        onChange={(parciales) => setFiltros((f) => ({ ...f, ...parciales }))}
      />

      {cargando && !resumen ? (
        <p className="mi-tienda__cargando">Cargando planogramas…</p>
      ) : planogramas.length === 0 ? (
        <EmptyState
          titulo="Tu tienda no tiene planogramas asignados"
          hint="Cuando el analista asigne una versión publicada o piloto a tu tienda, aparecerá aquí."
        />
      ) : visibles.length === 0 ? (
        <EmptyState titulo="No hay planogramas asignados con esos filtros" hint="Ajusta o limpia los filtros." />
      ) : (
        <div className={`mi-tienda__tabla${cargando ? ' mi-tienda__tabla--cargando' : ''}`} aria-busy={cargando}>
          <MiTiendaTable
            planogramas={visibles}
            umbral={umbral}
            inventarioDisponible={inventarioDisponible}
            onArchivos={(planograma) => setModal({ tipo: 'archivos', planograma })}
            onEvidencia={(planograma) => setModal({ tipo: 'evidencia', planograma })}
          />
        </div>
      )}

      {modal?.tipo === 'archivos' && <ArchivosVersionModal planograma={modal.planograma} onClose={cerrarModal} />}
      {modal?.tipo === 'evidencia' && (
        <EvidenciaModal tienda={tienda} planograma={modal.planograma} onClose={cerrarModal} />
      )}
    </>
  );
}
