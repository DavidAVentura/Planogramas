import { useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { Button } from '../../../ui/Button/Button';
import { BotonTextoAVoz } from '../BotonTextoAVoz/BotonTextoAVoz';
import type { EstadoLectura } from '../BotonTextoAVoz/BotonTextoAVoz';
import { OndaVoz } from '../OndaVoz/OndaVoz';
import { AjustesVozModal } from '../AjustesVozModal/AjustesVozModal';
import { useVozATexto } from '../../../../hooks/useVozATexto';
import { useTextoAVoz } from '../../../../hooks/useTextoAVoz';
import { useToast } from '../../../../context/ToastContext';
import type { AccionBorrador, MensajeChat } from '../../../../types/agenteExtractor';
import './AgenteExtractorChat.css';

interface AgenteExtractorChatProps {
  mensajes: MensajeChat[];
  borrador: AccionBorrador[];
  listoParaConfirmar: boolean;
  enviando: boolean;
  onEnviar: (texto: string) => void;
  onExtraerImagen: () => void;
  /** Muestra "Extraer de otra fuente" como deshabilitado (p. ej. la versión aún no tiene góndolas).
   * El botón sigue recibiendo el clic para que el padre pueda explicar por qué no está disponible. */
  extraerDeshabilitado?: boolean;
  onRevisar: () => void;
  /** Colapsa el panel sobre la burbuja — no borra la conversación ni el borrador, esos viven en
   * el componente padre (ver useAgenteExtractor). */
  onColapsar: () => void;
  /** Pide borrar el historial guardado y reiniciar la conversación (el padre confirma antes). */
  onReestablecer: () => void;
  /** Arranca el arrastre del widget flotante desde el header del panel. */
  onArrastreHeader: (e: ReactPointerEvent) => void;
  /** Muestra el micrófono, la lectura en voz alta y el modo manos libres (solo en el Lienzo). */
  modoVoz?: boolean;
}

export function AgenteExtractorChat({
  mensajes,
  borrador,
  listoParaConfirmar,
  enviando,
  onEnviar,
  onExtraerImagen,
  extraerDeshabilitado = false,
  onRevisar,
  onColapsar,
  onReestablecer,
  onArrastreHeader,
  modoVoz = false,
}: AgenteExtractorChatProps) {
  const [texto, setTexto] = useState('');
  const [ajustesVozAbiertos, setAjustesVozAbiertos] = useState(false);
  const mensajesRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { mostrarToast } = useToast();

  // Marca si el último envío vino por voz: solo en ese caso la respuesta se lee sola y el mic se
  // reactiva al terminar (manos libres). Un envío tecleado la apaga.
  const ultimoEnvioPorVozRef = useRef(false);
  const mensajesPreviosRef = useRef(mensajes.length);

  const dictado = useVozATexto({
    disabled: enviando,
    onTextoParcial: (t) => setTexto((prev) => (prev ? `${prev} ${t}` : t)),
    onSilencioFinal: (textoFinal) => {
      setTexto('');
      ultimoEnvioPorVozRef.current = true;
      onEnviar(textoFinal);
    },
  });
  const lectura = useTextoAVoz();
  const { reproducir, detener: detenerLectura } = lectura;
  const { toggle: toggleDictado } = dictado;
  const micDeshabilitado = enviando && !dictado.activo;

  // Siempre baja al último mensaje — tanto el propio como el del agente — para que quede visible
  // apenas se envía o se recibe respuesta.
  useEffect(() => {
    const el = mensajesRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [mensajes, enviando]);

  // El textarea se deshabilita mientras "enviando" es true (lo que le quita el foco) — al volver
  // a habilitarse, se lo devolvemos para que el usuario pueda seguir escribiendo sin hacer clic.
  // En modo voz el textarea no está montado (lo reemplaza la onda).
  useEffect(() => {
    if (!enviando) textareaRef.current?.focus();
  }, [enviando]);

  // Autolectura: exactamente UN mensaje nuevo del agente y el envío anterior fue por voz → se lee
  // y al terminar se reactiva el mic. Es "+1" y no ">=" para no leer el historial restaurado.
  useEffect(() => {
    const previos = mensajesPreviosRef.current;
    mensajesPreviosRef.current = mensajes.length;
    if (mensajes.length !== previos + 1) return;

    const indice = mensajes.length - 1;
    const ultimo = mensajes[indice];
    if (ultimo.rol === 'assistant' && ultimoEnvioPorVozRef.current) {
      ultimoEnvioPorVozRef.current = false;
      reproducir(String(indice), ultimo.contenido, toggleDictado);
    }
  }, [mensajes, reproducir, toggleDictado]);

  useEffect(() => {
    if (dictado.error) mostrarToast(dictado.error, 'error');
  }, [dictado.error, mostrarToast]);

  useEffect(() => {
    if (lectura.error) mostrarToast(lectura.error, 'error');
  }, [lectura.error, mostrarToast]);

  function enviarTexto() {
    const valor = texto.trim();
    if (!valor || enviando) return;
    setTexto('');
    ultimoEnvioPorVozRef.current = false;
    onEnviar(valor);
    textareaRef.current?.focus();
  }

  function estadoLecturaDe(id: string): EstadoLectura {
    if (lectura.reproduciendoId !== id) return 'idle';
    return lectura.cargando ? 'cargando' : 'reproduciendo';
  }

  function alternarLectura(id: string, contenido: string) {
    if (lectura.reproduciendoId === id) detenerLectura();
    else reproducir(id, contenido);
  }

  function reestablecer() {
    detenerLectura();
    onReestablecer();
  }

  return (
    <div className="agente-extractor-panel" role="dialog" aria-label="Agente extractor del planograma">
      <div className="agente-extractor-panel__header" onPointerDown={onArrastreHeader}>
        <span className="agente-extractor-panel__titulo">Agente extractor del planograma</span>
        <button
          type="button"
          className="agente-extractor-panel__reestablecer"
          onClick={reestablecer}
          disabled={enviando}
          aria-label="Reestablecer chat"
          title="Reestablecer (borra el historial)"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="1 4 1 10 7 10" />
            <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
          </svg>
        </button>
        <button
          type="button"
          className="agente-extractor-panel__colapsar"
          onClick={onColapsar}
          aria-label="Colapsar chat"
          title="Colapsar"
        >
          &minus;
        </button>
      </div>

      <div className="agente-extractor-chat">
        <div className="agente-extractor-chat__mensajes" ref={mensajesRef}>
          {mensajes.map((m, i) => (
            <div
              key={i}
              className={`agente-extractor-chat__mensaje agente-extractor-chat__mensaje--${m.rol}`}
            >
              {m.contenido}
              {modoVoz && m.rol === 'assistant' && (
                <div className="agente-extractor-chat__lectura">
                  <BotonTextoAVoz estado={estadoLecturaDe(String(i))} onClick={() => alternarLectura(String(i), m.contenido)} />
                </div>
              )}
            </div>
          ))}
          {enviando && (
            <div className="agente-extractor-chat__mensaje agente-extractor-chat__mensaje--assistant agente-extractor-chat__mensaje--pensando">
              Pensando…
            </div>
          )}
          {listoParaConfirmar && borrador.length > 0 && (
            <p className="agente-extractor-chat__aviso">
              El agente considera que la lista está lista. Revisa y confirma cuando quieras.
            </p>
          )}
        </div>

        <div className="agente-extractor-chat__input">
          <div className="agente-extractor-chat__input-fila">
            {dictado.activo ? (
              <OndaVoz obtenerAnalyser={dictado.obtenerAnalyser} />
            ) : (
              <textarea
                ref={textareaRef}
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    enviarTexto();
                  }
                }}
                placeholder="Ej: añade el SKU 10012345 con 3 facings en el nivel 2"
                disabled={enviando}
                rows={2}
              />
            )}
            {modoVoz && (
              <div className="agente-extractor-chat__mic">
                {/* aria-disabled y no `disabled`: el botón de ajustes de al lado debe seguir
                    funcionando y el clic se ignora a mano. */}
                <button
                  type="button"
                  className={`agente-extractor-chat__mic-boton${dictado.activo ? ' agente-extractor-chat__mic-boton--activo' : ''}`}
                  onClick={() => {
                    if (micDeshabilitado) return;
                    // Tocar el mic mientras se lee la respuesta corta la lectura y dicta de inmediato.
                    detenerLectura();
                    toggleDictado();
                  }}
                  aria-disabled={micDeshabilitado}
                  aria-label={dictado.activo ? 'Detener modo de voz' : 'Modo de voz'}
                  title={dictado.activo ? 'Detener modo de voz' : 'Modo de voz'}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                    <path d="M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                    <path d="M19 11a7 7 0 0 1-14 0" />
                    <path d="M12 18v3" />
                  </svg>
                </button>
                <button
                  type="button"
                  className={`agente-extractor-chat__mic-ajustes${dictado.activo ? ' agente-extractor-chat__mic-boton--activo' : ''}`}
                  onClick={() => setAjustesVozAbiertos(true)}
                  aria-label="Ajustes de voz"
                  title="Ajustes de voz"
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </button>
              </div>
            )}
            <Button
              variante="primary"
              className="agente-extractor-chat__enviar"
              onClick={enviarTexto}
              disabled={enviando || !texto.trim()}
              aria-label="Enviar"
              title="Enviar"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </Button>
          </div>
          <Button
            variante="outline"
            className={extraerDeshabilitado ? 'agente-extractor-chat__extraer--deshabilitado' : undefined}
            aria-disabled={extraerDeshabilitado}
            onClick={onExtraerImagen}
            disabled={enviando}
          >
            Extraer de otra fuente
          </Button>
        </div>
      </div>

      <div className="agente-extractor-panel__footer">
        <Button
          variante="primary"
          className={borrador.length > 0 ? 'agente-extractor-chat__revisar--pendiente' : undefined}
          onClick={onRevisar}
          disabled={borrador.length === 0}
        >
          Revisar y confirmar ({borrador.length})
        </Button>
      </div>

      {ajustesVozAbiertos && (
        <AjustesVozModal
          metodoVoz={dictado.metodo}
          onSeleccionarMetodoVoz={dictado.seleccionarMetodo}
          metodoTts={lectura.metodo}
          onSeleccionarMetodoTts={lectura.seleccionarMetodo}
          voz={lectura.voz}
          onSeleccionarVoz={lectura.seleccionarVoz}
          velocidad={lectura.velocidad}
          onSeleccionarVelocidad={lectura.seleccionarVelocidad}
          onClose={() => setAjustesVozAbiertos(false)}
        />
      )}
    </div>
  );
}
