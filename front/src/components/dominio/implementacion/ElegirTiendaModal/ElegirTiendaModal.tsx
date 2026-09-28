import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Modal } from '../../../ui/Modal/Modal';
import { Button } from '../../../ui/Button/Button';
import { EmptyState } from '../../../ui/EmptyState/EmptyState';
import { useTiendas } from '../../../../hooks/useTiendas';
import { TIPO_TIENDA_META } from '../../../../constants/tiendas';
import { contieneTexto } from '../../../../domain/implementacion/filtrosColumna';
import type { TiendaImplementador } from '../../../../types/implementacion';
import './ElegirTiendaModal.css';

const SOLO_ACTIVAS = { estado: 'activo' } as const;

interface ElegirTiendaModalProps {
  actual: TiendaImplementador | null;
  onElegir: (tienda: TiendaImplementador) => void;
  onClose: () => void;
}

/** Selector de la tienda del Implementador entre las tiendas activas. */
export function ElegirTiendaModal({ actual, onElegir, onClose }: ElegirTiendaModalProps) {
  const { tiendas, cargando } = useTiendas(SOLO_ACTIVAS);
  const [busqueda, setBusqueda] = useState('');

  const visibles = useMemo(
    () =>
      tiendas
        .filter((t) => contieneTexto(`${t.nombre} ${t.codigo}`, busqueda))
        .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')),
    [tiendas, busqueda],
  );

  return createPortal(
    <Modal
      titulo="Elige tu tienda"
      onClose={onClose}
      ancho="lg"
      footer={
        <Button variante="ghost" onClick={onClose}>
          Cancelar
        </Button>
      }
    >
      <p className="elegir-tienda__ayuda">
        Verás los planogramas que tu tienda tiene asignados. Se recuerda en este navegador y puedes cambiarla
        cuando quieras.
      </p>
      <label className="elegir-tienda__campo">
        <span>Buscar</span>
        <input
          type="search"
          placeholder="Nombre o código de tienda"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          autoFocus
        />
      </label>

      {cargando ? (
        <p className="elegir-tienda__cargando">Cargando tiendas…</p>
      ) : visibles.length === 0 ? (
        <EmptyState
          titulo={tiendas.length === 0 ? 'No hay tiendas activas' : 'Ninguna tienda coincide'}
          hint={tiendas.length === 0 ? undefined : 'Prueba con otro nombre o código.'}
        />
      ) : (
        <ul className="elegir-tienda__lista">
          {visibles.map((t) => {
            const esActual = actual?.id === t.id;
            return (
              <li key={t.id}>
                <button
                  type="button"
                  className={`elegir-tienda__opcion${esActual ? ' elegir-tienda__opcion--actual' : ''}`}
                  aria-current={esActual ? 'true' : undefined}
                  onClick={() => onElegir({ id: t.id, codigo: t.codigo, nombre: t.nombre })}
                >
                  <span className="elegir-tienda__nombre">{t.nombre}</span>
                  <span className="elegir-tienda__codigo">{t.codigo}</span>
                  <span className="elegir-tienda__tipo">{TIPO_TIENDA_META[t.tipo]?.label ?? t.tipo}</span>
                  {esActual && <span className="elegir-tienda__marca">Actual</span>}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Modal>,
    document.body,
  );
}
