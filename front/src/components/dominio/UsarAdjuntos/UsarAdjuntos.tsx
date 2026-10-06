import { useState } from 'react';
import { adjuntosService } from '../../../services/adjuntos.service';
import { descargarAdjuntoComoArchivo } from '../../../utils/adjuntoArchivo';
import { cumpleAccept, formatearPeso } from '../../../utils/archivos';
import { formatearFecha } from '../../../utils/formatters';
import { mensajeDeError } from '../../../utils/errors';
import type { Adjunto } from '../../../types/adjunto';
import './UsarAdjuntos.css';

interface UsarAdjuntosProps {
  versionId: number;
  /** Mismo `accept` que la zona de carga: solo se listan los adjuntos que lo cumplen. */
  accept: string;
  maxBytes?: number;
  /** Recibe el adjunto ya descargado como `File`, igual que si el usuario lo hubiera elegido. */
  onSeleccionar: (archivo: File) => void;
  disabled?: boolean;
}

/**
 * Sección desplegable "Utilizar adjuntos": lista los adjuntos de la versión compatibles con el
 * proceso y entrega el elegido como `File`. Los adjuntos se piden recién al desplegarla.
 */
export function UsarAdjuntos({ versionId, accept, maxBytes, onSeleccionar, disabled = false }: UsarAdjuntosProps) {
  const [abierto, setAbierto] = useState(false);
  const [adjuntos, setAdjuntos] = useState<Adjunto[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [descargandoId, setDescargandoId] = useState<number | null>(null);
  const [elegidoId, setElegidoId] = useState<number | null>(null);

  async function alternar() {
    const abrir = !abierto;
    setAbierto(abrir);
    if (!abrir || adjuntos) return;
    setError(null);
    try {
      setAdjuntos(await adjuntosService.listarPorVersion(versionId));
    } catch (err) {
      setError(mensajeDeError(err, 'No se pudieron cargar los adjuntos'));
    }
  }

  async function usar(adjunto: Adjunto) {
    if (disabled || descargandoId !== null) return;
    setDescargandoId(adjunto.id);
    setError(null);
    try {
      onSeleccionar(await descargarAdjuntoComoArchivo(adjunto));
      setElegidoId(adjunto.id);
    } catch (err) {
      // descargarAdjuntoComoArchivo lanza Error con un mensaje propio (no ApiError) si falla Azure.
      setError(mensajeDeError(err, err instanceof Error && err.message ? err.message : 'No se pudo usar el adjunto'));
    } finally {
      setDescargandoId(null);
    }
  }

  const compatibles = adjuntos?.filter((a) => cumpleAccept(a.nombreOriginal, a.tipoMime, accept)) ?? [];

  return (
    <div className="usar-adjuntos">
      <button
        type="button"
        className="usar-adjuntos__encabezado"
        aria-expanded={abierto}
        onClick={alternar}
        disabled={disabled}
      >
        <svg className={`usar-adjuntos__chevron${abierto ? ' usar-adjuntos__chevron--abierto' : ''}`} viewBox="0 0 24 24" aria-hidden="true">
          <path d="M9 6l6 6-6 6" />
        </svg>
        Utilizar adjuntos
        {adjuntos && <span className="usar-adjuntos__conteo">{compatibles.length}</span>}
      </button>

      {abierto && (
        <div className="usar-adjuntos__cuerpo">
          {!adjuntos && !error && <p className="usar-adjuntos__mensaje">Cargando adjuntos…</p>}
          {adjuntos && compatibles.length === 0 && (
            <p className="usar-adjuntos__mensaje">Esta versión no tiene adjuntos de este tipo.</p>
          )}
          {compatibles.length > 0 && (
            <ul className="usar-adjuntos__lista">
              {compatibles.map((a) => {
                const excede = maxBytes !== undefined && a.tamanoBytes > maxBytes;
                const descargando = descargandoId === a.id;
                return (
                  <li key={a.id}>
                    <button
                      type="button"
                      className={`usar-adjuntos__item${elegidoId === a.id ? ' usar-adjuntos__item--elegido' : ''}`}
                      onClick={() => usar(a)}
                      disabled={disabled || excede || descargandoId !== null}
                      title={excede ? `Supera el máximo de ${formatearPeso(maxBytes!)}` : undefined}
                    >
                      <span className="usar-adjuntos__nombre">{a.nombreOriginal}</span>
                      <span className="usar-adjuntos__detalle">
                        {formatearPeso(a.tamanoBytes)} · {formatearFecha(a.createdAt)} · {a.subidoPor}
                      </span>
                      <span className="usar-adjuntos__accion">
                        {descargando ? 'Descargando…' : excede ? 'Muy pesado' : elegidoId === a.id ? 'En uso' : 'Usar'}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          {error && (
            <p className="usar-adjuntos__error" role="alert">
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
