import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { ElegirTiendaModal } from '../components/dominio/implementacion/ElegirTiendaModal/ElegirTiendaModal';
import { cargarTiendaImplementador, guardarTiendaImplementador } from '../config/preferenciasImplementador';
import { useToast } from './ToastContext';
import type { TiendaImplementador } from '../types/implementacion';

interface TiendaImplementadorContextValue {
  /** Tienda elegida por el Implementador en este navegador; `null` si todavía no eligió. */
  tienda: TiendaImplementador | null;
  elegirTienda: (tienda: TiendaImplementador) => void;
  abrirSelector: () => void;
  /** La tienda guardada ya no existe o está inactiva (404 del backend): se olvida y se pide otra. */
  descartarTiendaInvalida: () => void;
}

const TiendaImplementadorContext = createContext<TiendaImplementadorContextValue | null>(null);

// La tienda la elige el propio usuario (el backend no la deduce del JWT, ver contrato de
// GET /tiendas/{id}/implementacion); Mi tienda y Productos la comparten.
export function TiendaImplementadorProvider({ children }: { children: ReactNode }) {
  const [tienda, setTienda] = useState<TiendaImplementador | null>(cargarTiendaImplementador);
  const [selectorAbierto, setSelectorAbierto] = useState(false);
  const { mostrarToast } = useToast();

  const elegirTienda = useCallback((nueva: TiendaImplementador) => {
    guardarTiendaImplementador(nueva);
    setTienda(nueva);
    setSelectorAbierto(false);
  }, []);

  const abrirSelector = useCallback(() => setSelectorAbierto(true), []);

  const descartarTiendaInvalida = useCallback(() => {
    guardarTiendaImplementador(null);
    setTienda(null);
    setSelectorAbierto(true);
    mostrarToast('La tienda guardada ya no está disponible. Elige tu tienda de nuevo.', 'error');
  }, [mostrarToast]);

  const valor = useMemo(
    () => ({ tienda, elegirTienda, abrirSelector, descartarTiendaInvalida }),
    [tienda, elegirTienda, abrirSelector, descartarTiendaInvalida],
  );

  return (
    <TiendaImplementadorContext.Provider value={valor}>
      {children}
      {selectorAbierto && (
        <ElegirTiendaModal
          actual={tienda}
          onElegir={elegirTienda}
          onClose={() => setSelectorAbierto(false)}
        />
      )}
    </TiendaImplementadorContext.Provider>
  );
}

export function useTiendaImplementador(): TiendaImplementadorContextValue {
  const context = useContext(TiendaImplementadorContext);
  if (!context) throw new Error('useTiendaImplementador debe usarse dentro de <TiendaImplementadorProvider>');
  return context;
}
