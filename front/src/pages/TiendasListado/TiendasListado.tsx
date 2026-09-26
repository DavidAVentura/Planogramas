import { useMemo, useState } from 'react';
import { AppTopbar } from '../../components/dominio/layout/AppTopbar/AppTopbar';
import { TiendasFiltros } from '../../components/dominio/tiendas/TiendasFiltros/TiendasFiltros';
import { FILTROS_TIENDAS_INICIALES } from '../../constants/tiendas';
import { TiendasTable } from '../../components/dominio/tiendas/TiendasTable/TiendasTable';
import { TiendaFormModal } from '../../components/dominio/modales/TiendaFormModal/TiendaFormModal';
import { DesactivarTiendaModal } from '../../components/dominio/modales/DesactivarTiendaModal/DesactivarTiendaModal';
import { PlanogramasTiendaModal } from '../../components/dominio/modales/PlanogramasTiendaModal/PlanogramasTiendaModal';
import { Button } from '../../components/ui/Button/Button';
import { useCambiarEstadoTienda, useTiendas } from '../../hooks/useTiendas';
import { useAuth } from '../../context/AuthContext';
import {
  ORDEN_INICIAL,
  alternarOrden,
  esOrdenInicial,
  ordenarTiendas,
  type CampoOrdenTienda,
  type CriterioOrden,
} from '../../domain/tiendas/ordenTiendas';
import type { FiltrosListadoTiendas, Tienda } from '../../types/tienda';
import './TiendasListado.css';

const NOMBRE_CAMPO: Record<CampoOrdenTienda, string> = {
  codigo: 'Código',
  nombre: 'Nombre',
  tipo: 'Tipo',
  marca: 'Marca',
  versionesPublicadas: 'Planogramas publicados',
  estado: 'Estado',
};

// La cadena tiene < 50 tiendas (contrato GET /tiendas, sin paginación): se cargan todas una vez
// y los filtros y el orden se resuelven en el cliente.
const FILTROS_API = { estado: 'todos' } as const;

export function TiendasListado() {
  const { puedeEscribir } = useAuth();
  const { tiendas, cargando, recargar } = useTiendas(FILTROS_API);
  const { cambiarEstado } = useCambiarEstadoTienda();

  const [filtros, setFiltros] = useState<FiltrosListadoTiendas>(FILTROS_TIENDAS_INICIALES);
  const [orden, setOrden] = useState<CriterioOrden[]>(ORDEN_INICIAL);
  // `undefined` = modal cerrado; `null` = crear; una tienda = editar.
  const [tiendaEnFormulario, setTiendaEnFormulario] = useState<Tienda | null | undefined>(undefined);
  const [tiendaADesactivar, setTiendaADesactivar] = useState<Tienda | null>(null);
  const [tiendaConPlanogramas, setTiendaConPlanogramas] = useState<Tienda | null>(null);

  const visibles = useMemo(() => {
    const q = filtros.busqueda.trim().toLowerCase();
    const filtradas = tiendas.filter(
      (t) =>
        (!q || t.codigo.toLowerCase().includes(q) || t.nombre.toLowerCase().includes(q)) &&
        (!filtros.tipo || t.tipo === filtros.tipo) &&
        (!filtros.marca || t.marca === filtros.marca) &&
        (!filtros.estado || t.estado === filtros.estado),
    );
    return ordenarTiendas(filtradas, orden);
  }, [tiendas, filtros, orden]);

  const resumenOrden = orden.map((o) => `${NOMBRE_CAMPO[o.campo]} ${o.dir === 'asc' ? '↑' : '↓'}`).join('  ›  ');

  async function reactivar(tienda: Tienda) {
    if (await cambiarEstado(tienda.id, 'activo')) recargar();
  }

  return (
    <div className="tiendas-listado">
      <AppTopbar titulo="Tiendas" />

      <div className="tiendas-listado__contenido">
        <div className="tiendas-listado__cabecera">
          <div className="tiendas-listado__resumen">
            <span className="tiendas-listado__conteo">
              {cargando && tiendas.length === 0 ? 'Cargando…' : visibles.length === 1 ? '1 tienda' : `${visibles.length} tiendas`}
            </span>
            <span className="tiendas-listado__orden">
              Ordenado por <strong>{resumenOrden}</strong>
            </span>
            {!esOrdenInicial(orden) && (
              <button type="button" className="tiendas-listado__restablecer" onClick={() => setOrden(ORDEN_INICIAL)}>
                Restablecer orden
              </button>
            )}
          </div>
          {puedeEscribir && <Button onClick={() => setTiendaEnFormulario(null)}>+ Crear tienda</Button>}
        </div>

        <TiendasFiltros filtros={filtros} onChange={(parciales) => setFiltros((f) => ({ ...f, ...parciales }))} />

        {/* Al recargar después de guardar se mantiene la tabla anterior en vez de parpadear. */}
        {(!cargando || tiendas.length > 0) && (
          <TiendasTable
            rows={visibles}
            orden={orden}
            puedeEscribir={puedeEscribir}
            onOrdenar={(campo) => setOrden((actual) => alternarOrden(actual, campo))}
            onEditar={setTiendaEnFormulario}
            onDesactivar={setTiendaADesactivar}
            onReactivar={reactivar}
            onVerPlanogramas={setTiendaConPlanogramas}
          />
        )}
      </div>

      {tiendaEnFormulario !== undefined && (
        <TiendaFormModal
          tienda={tiendaEnFormulario}
          onClose={() => setTiendaEnFormulario(undefined)}
          onGuardado={() => {
            setTiendaEnFormulario(undefined);
            recargar();
          }}
        />
      )}

      {tiendaConPlanogramas && (
        <PlanogramasTiendaModal tienda={tiendaConPlanogramas} onClose={() => setTiendaConPlanogramas(null)} />
      )}

      {tiendaADesactivar && (
        <DesactivarTiendaModal
          tienda={tiendaADesactivar}
          onClose={() => setTiendaADesactivar(null)}
          onDesactivada={() => {
            setTiendaADesactivar(null);
            recargar();
          }}
        />
      )}
    </div>
  );
}
