import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  ProductosVersiones,
  ProductosVersionesPagina,
} from '../../components/dominio/implementacion/ProductosVersiones/ProductosVersiones';
import { DescargarProductosVersionModal } from '../../components/dominio/implementacion/DescargarProductosVersionModal/DescargarProductosVersionModal';
import { CadenaJerarquia } from '../../components/dominio/productos/CadenaJerarquia/CadenaJerarquia';
import { Button } from '../../components/ui/Button/Button';
import { IconoDescarga } from '../../components/ui/IconoDescarga/IconoDescarga';
import { useToast } from '../../context/ToastContext';
import { useProductosPorVersion, useVersionesPorVersion } from '../../hooks/useImplementacion';
import { useTiendas } from '../../hooks/useTiendas';
import { JERARQUIA_VACIA } from '../../constants/productos';
import {
  construirCuerpoExportacion,
  mensajeErrorDescargaPorVersion,
  nombreArchivoPorVersion,
} from '../../domain/implementacion/descargaPorVersion';
import { parsearIdsVersiones } from '../../domain/implementacion/miTienda';
import { implementacionService } from '../../services/implementacion.service';
import { ApiError } from '../../services/httpClient';
import type { FormatoDescargaPorVersion } from '../../types/implementacion';
import type { FiltroJerarquia } from '../../types/producto';
import './ProductosPorVersion.css';

const SOLO_ACTIVAS = {};

/** Filas que se ven en la tabla tras la búsqueda y los filtros de columna (lo que lleva la descarga). */
interface FilasVisibles {
  posicionIds: number[];
  hayFiltrosCliente: boolean;
}

const SIN_FILAS: FilasVisibles = { posicionIds: [], hayFiltrosCliente: false };

const mismasFilas = (a: FilasVisibles, b: FilasVisibles) =>
  a.hayFiltrosCliente === b.hayFiltrosCliente &&
  a.posicionIds.length === b.posicionIds.length &&
  a.posicionIds.every((id, i) => id === b.posicionIds[i]);

/**
 * Filtro Área › Departamento (CATI) deshabilitado por decisión del usuario (2026-10-19): el componente
 * se oculta pero el soporte completo (estado, servicio y back) se conserva. Ver DT-79 en DEUDA_TECNICA.md.
 */
const MOSTRAR_FILTRO_JERARQUIA = false;

/**
 * Por versión (Analista): la misma tabla de Productos del Implementador, para las versiones de
 * cualquier planograma. Versiones y tienda viven en la URL (`?versiones=12,15&tienda=3`), así que
 * "Ver productos" desde una versión o desde la ficha de un producto llega ya filtrado. La tienda es
 * opcional: solo agrega su inventario y si monta cada versión. La jerarquía Área › Departamento (CATI)
 * acota la tabla en el servidor y la descarga a Excel (Lista o Pivote) lleva lo que se ve.
 */
export function ProductosPorVersion() {
  return (
    <ProductosVersionesPagina titulo="Por versión">
      {(vista) => <ContenidoPorVersion {...vista} />}
    </ProductosVersionesPagina>
  );
}

function ContenidoPorVersion({ extendida, alternarExtendida }: { extendida: boolean; alternarExtendida: () => void }) {
  const { mostrarToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const idsEnUrl = useMemo(() => parsearIdsVersiones(searchParams.get('versiones')), [searchParams]);
  const tiendaId = useMemo(() => {
    const valor = Number(searchParams.get('tienda'));
    return Number.isSafeInteger(valor) && valor > 0 ? valor : null;
  }, [searchParams]);

  // La jerarquía vive en la página (no en la URL), como en el Consolidado Tiendas.
  const [jerarquia, setJerarquia] = useState<FiltroJerarquia>(JERARQUIA_VACIA);
  const [nombresJerarquia, setNombresJerarquia] = useState<string[]>([]);
  const [claveCadena, setClaveCadena] = useState(0);
  const [filasVisibles, setFilasVisibles] = useState<FilasVisibles>(SIN_FILAS);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [generando, setGenerando] = useState(false);
  const [errorServidor, setErrorServidor] = useState<string | null>(null);
  const contenedorBoton = useRef<HTMLSpanElement>(null);

  const { tiendas, cargando: cargandoTiendas } = useTiendas(SOLO_ACTIVAS);
  const { versiones } = useVersionesPorVersion(idsEnUrl);
  const { productos, cargando, recargar } = useProductosPorVersion(idsEnUrl, tiendaId, {
    area: jerarquia.area,
    departamento: jerarquia.departamento,
  });

  const cambiarTienda = useCallback(
    (id: number | null, reemplazar = false) => {
      setSearchParams(
        (actual) => {
          const siguiente = new URLSearchParams(actual);
          if (id) siguiente.set('tienda', String(id));
          else siguiente.delete('tienda');
          return siguiente;
        },
        { replace: reemplazar },
      );
    },
    [setSearchParams],
  );

  // Una tienda del link que no existe o ya no está activa se quita.
  useEffect(() => {
    if (tiendaId === null || cargandoTiendas || tiendas.length === 0) return;
    if (!tiendas.some((t) => t.id === tiendaId)) cambiarTienda(null, true);
  }, [tiendaId, tiendas, cargandoTiendas, cambiarTienda]);

  // Estable y sin re-render si nada cambió: la tabla lo avisa en cada cambio de filas.
  const alFiltrarFilas = useCallback((nuevas: FilasVisibles) => {
    setFilasVisibles((actuales) => (mismasFilas(actuales, nuevas) ? actuales : nuevas));
  }, []);

  function cambiarJerarquia(nueva: FiltroJerarquia, nombres: string[]) {
    setJerarquia(nueva);
    setNombresJerarquia(nombres);
  }

  // La tienda de la respuesta (no la del selector) para que encabezado, franja y columnas coincidan
  // mientras llega la consulta con la tienda nueva.
  const tiendaDeLosDatos = productos?.tienda ?? null;

  const hayJerarquia = jerarquia.area !== '';
  const versionesElegidas = useMemo(() => {
    const elegidas = new Set(idsEnUrl);
    return (versiones ?? []).filter((v) => elegidas.has(v.versionId));
  }, [versiones, idsEnUrl]);

  const sinVersiones = idsEnUrl.length === 0;
  const descargaDeshabilitada = sinVersiones || productos === null || cargando;

  function cerrarModal() {
    setModalAbierto(false);
    setErrorServidor(null);
    // El foco vuelve al botón que abrió el modal.
    setTimeout(() => contenedorBoton.current?.querySelector('button')?.focus(), 0);
  }

  async function descargar(formato: FormatoDescargaPorVersion) {
    setGenerando(true);
    setErrorServidor(null);
    try {
      const archivo = nombreArchivoPorVersion(formato, new Date());
      const blob = await implementacionService.descargarProductosPorVersion(
        construirCuerpoExportacion({
          versionIds: idsEnUrl,
          formato,
          jerarquia,
          posicionIds: filasVisibles.posicionIds,
          hayFiltrosCliente: filasVisibles.hayFiltrosCliente,
        }),
      );
      const url = URL.createObjectURL(blob);
      const enlace = document.createElement('a');
      enlace.href = url;
      enlace.download = archivo;
      document.body.appendChild(enlace);
      enlace.click();
      enlace.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      cerrarModal();
      mostrarToast(`Descarga lista: ${archivo}`, 'success');
    } catch (err) {
      const { texto, enModal } = mensajeErrorDescargaPorVersion(
        err instanceof ApiError ? err : new ApiError(0, 'ERROR', 'Error inesperado'),
      );
      if (enModal) setErrorServidor(texto);
      else mostrarToast(texto, 'error');
    } finally {
      setGenerando(false);
    }
  }

  const filtrosExtra = (
    <>
      <label className="productos-versiones__campo productos-por-version__tienda">
        <span>Tienda (inventario)</span>
        <select
          value={tiendaId ?? ''}
          onChange={(e) => cambiarTienda(e.target.value ? Number(e.target.value) : null)}
          disabled={cargandoTiendas && tiendas.length === 0}
        >
          <option value="">Sin tienda (inventario)</option>
          {tiendas.map((t) => (
            <option key={t.id} value={t.id}>
              {t.codigo} · {t.nombre}
            </option>
          ))}
        </select>
      </label>
      {MOSTRAR_FILTRO_JERARQUIA && (
        <CadenaJerarquia key={claveCadena} jerarquia={jerarquia} onChange={cambiarJerarquia} niveles={2} />
      )}
      {hayJerarquia && (
        <p className="productos-por-version__hint">
          El resumen por versión muestra la versión completa; la tabla solo los productos de {nombresJerarquia.join(' › ')}.
        </p>
      )}
    </>
  );

  const botonDescargar = (
    <span ref={contenedorBoton}>
      <Button
        variante="outline"
        onClick={() => setModalAbierto(true)}
        disabled={descargaDeshabilitada}
        title={sinVersiones ? 'Elige al menos una versión para descargar.' : undefined}
      >
        <span className="productos-por-version__descargar">
          <IconoDescarga />
          Descargar
        </span>
      </Button>
    </span>
  );

  function limpiarFiltrosExtra() {
    cambiarTienda(null);
    cambiarJerarquia(JERARQUIA_VACIA, []);
    // Un `key` nuevo reinicia las opciones cargadas de la cadena de jerarquía.
    setClaveCadena((c) => c + 1);
  }

  return (
    <>
      <ProductosVersiones
        tienda={tiendaDeLosDatos}
        versiones={versiones}
        resumenes={productos?.versiones ?? []}
        productos={productos}
        cargando={cargando}
        requiereSeleccion
        ruta={[{ etiqueta: 'Por planograma' }]}
        titulo="Productos por versión"
        filtrosExtra={filtrosExtra}
        filtrosExtraActivos={(tiendaId ? 1 : 0) + (jerarquia.area ? 1 : 0) + (jerarquia.departamento ? 1 : 0)}
        onLimpiarFiltrosExtra={limpiarFiltrosExtra}
        accionesExtra={botonDescargar}
        textosSelector={{
          ayuda: 'Versiones publicadas y en piloto de todos los planogramas, más las que llegaron por enlace.',
          notaSinSeleccion: 'Elige al menos una versión para ver sus productos.',
          aplicarSinSeleccion: 'Quitar versiones',
          sinVersiones: 'No hay versiones publicadas ni en piloto.',
          sinCoincidencias: 'Ninguna versión coincide con la búsqueda.',
        }}
        textoSinSeleccion="Elegir versiones"
        vacio={
          hayJerarquia
            ? {
                titulo: 'Ningún producto de las versiones elegidas pertenece a esa jerarquía',
                hint: 'Prueba con otra área o departamento, o quita la jerarquía.',
              }
            : {
                titulo: 'Las versiones elegidas no tienen productos',
                hint: 'Aparecerán cuando sus góndolas tengan posiciones con SKU.',
              }
        }
        extendida={extendida}
        onAlternarExtendida={alternarExtendida}
        onEvidenciaCerrada={recargar}
        onFilasFiltradas={alFiltrarFilas}
      />

      <DescargarProductosVersionModal
        abierto={modalAbierto}
        onClose={cerrarModal}
        versiones={versionesElegidas}
        jerarquiaNombres={nombresJerarquia}
        hayFiltrosCliente={filasVisibles.hayFiltrosCliente}
        generando={generando}
        errorServidor={errorServidor}
        onDescargar={descargar}
      />
    </>
  );
}
