import { useEffect, useState } from 'react';
import { agenteExtractorService } from '../services/agenteExtractor.service';
import { useToast } from '../context/ToastContext';
import { mensajeDeError } from '../utils/errors';
import type { AccionBorrador, ContextoAgenteExtractor, MensajeChat } from '../types/agenteExtractor';

const MENSAJE_BIENVENIDA =
  'Hola, soy el agente extractor. Decime los SKUs (o nombres de producto) que querés añadir a este planograma, con los atributos que tengas — facings, nivel, espacio — y si hace falta un nivel que todavía no existe, te pido los datos para crearlo. Lo que no me des lo completo con valores por defecto.';

interface EstadoChat {
  mensajes: MensajeChat[];
  borrador: AccionBorrador[];
  listoParaConfirmar: boolean;
}

function estadoInicial(): EstadoChat {
  return { mensajes: [{ rol: 'assistant', contenido: MENSAJE_BIENVENIDA }], borrador: [], listoParaConfirmar: false };
}

/** Un historial por versión de planograma — cada versión tiene su propio contexto de góndolas y
 * niveles, así que mezclar conversaciones entre versiones confundiría al agente. */
function claveStorage(versionId: number): string {
  return `agenteExtractor:chat:${versionId}`;
}

function leerEstadoGuardado(versionId: number): EstadoChat {
  try {
    const crudo = window.localStorage.getItem(claveStorage(versionId));
    if (!crudo) return estadoInicial();
    const guardado = JSON.parse(crudo) as Partial<EstadoChat>;
    if (!Array.isArray(guardado.mensajes) || guardado.mensajes.length === 0) return estadoInicial();
    return {
      mensajes: guardado.mensajes,
      borrador: Array.isArray(guardado.borrador) ? guardado.borrador : [],
      listoParaConfirmar: guardado.listoParaConfirmar === true,
    };
  } catch {
    // localStorage no disponible o contenido corrupto — se arranca de cero, sin romper el chat.
    return estadoInicial();
  }
}

/** Sin backend con sesión: la conversación y el borrador se guardan en `localStorage` (por versión)
 * para conservarlos como histórico entre recargas, y se reenvían completos en cada mensaje (ver
 * back/src/agents/agenteExtractor). `reestablecer` borra lo guardado y arranca de cero. */
export function useAgenteExtractor(contexto: ContextoAgenteExtractor, versionId: number) {
  const [estado, setEstado] = useState<EstadoChat>(() => leerEstadoGuardado(versionId));
  const [versionCargada, setVersionCargada] = useState(versionId);
  const [enviando, setEnviando] = useState(false);
  const { mostrarToast } = useToast();

  // Si el editor cambia de versión sin desmontar el componente, se carga el historial de la nueva.
  if (versionCargada !== versionId) {
    setVersionCargada(versionId);
    setEstado(leerEstadoGuardado(versionId));
  }

  useEffect(() => {
    if (versionCargada !== versionId) return;
    try {
      window.localStorage.setItem(claveStorage(versionId), JSON.stringify(estado));
    } catch {
      // Sin persistencia el chat sigue funcionando para la sesión actual, solo no sobrevive a un refresh.
    }
  }, [estado, versionId, versionCargada]);

  const { mensajes, borrador, listoParaConfirmar } = estado;

  async function enviar(texto: string) {
    const historialPrevio = mensajes;
    const borradorPrevio = borrador;
    setEstado((actual) => ({ ...actual, mensajes: [...actual.mensajes, { rol: 'user', contenido: texto }] }));
    setEnviando(true);
    try {
      const respuesta = await agenteExtractorService.enviarMensaje({
        mensaje: texto,
        historial: historialPrevio,
        borrador_actual: borradorPrevio,
        contexto,
      });
      setEstado((actual) => ({
        mensajes: [...actual.mensajes, { rol: 'assistant', contenido: respuesta.mensaje_asistente }],
        borrador: respuesta.borrador,
        listoParaConfirmar: respuesta.listo_para_confirmar,
      }));
    } catch (err) {
      mostrarToast(mensajeDeError(err, 'No se pudo enviar el mensaje al agente'), 'error');
    } finally {
      setEnviando(false);
    }
  }

  /** Tras confirmar el borrador: vacía el borrador ya aplicado pero conserva la conversación como histórico. */
  function limpiarBorrador() {
    setEstado((actual) => ({ ...actual, borrador: [], listoParaConfirmar: false }));
  }

  /** Borra el historial guardado de esta versión y arranca la conversación desde cero. */
  function reestablecer() {
    try {
      window.localStorage.removeItem(claveStorage(versionId));
    } catch {
      // Ver comentario de leerEstadoGuardado.
    }
    setEstado(estadoInicial());
  }

  return { mensajes, borrador, listoParaConfirmar, enviando, enviar, limpiarBorrador, reestablecer };
}
