import { useState } from 'react';
import { agenteExtractorService } from '../services/agenteExtractor.service';
import { useToast } from '../context/ToastContext';
import { mensajeDeError } from '../utils/errors';
import type { AccionBorrador, ContextoAgenteExtractor, MensajeChat } from '../types/agenteExtractor';

const MENSAJE_BIENVENIDA =
  'Hola, soy el agente extractor. Decime los SKUs (o nombres de producto) que querés añadir a este planograma, con los atributos que tengas — facings, nivel, espacio — y si hace falta un nivel que todavía no existe, te pido los datos para crearlo. Lo que no me des lo completo con valores por defecto.';

/** Sin backend con sesión: la conversación y el borrador viven en memoria mientras dura el chat
 * y se reenvían completos en cada mensaje (ver back/src/agents/agenteExtractor). */
export function useAgenteExtractor(contexto: ContextoAgenteExtractor) {
  const [mensajes, setMensajes] = useState<MensajeChat[]>([{ rol: 'assistant', contenido: MENSAJE_BIENVENIDA }]);
  const [borrador, setBorrador] = useState<AccionBorrador[]>([]);
  const [listoParaConfirmar, setListoParaConfirmar] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const { mostrarToast } = useToast();

  async function enviar(texto: string) {
    const historialPrevio = mensajes;
    const borradorPrevio = borrador;
    setMensajes((actual) => [...actual, { rol: 'user', contenido: texto }]);
    setEnviando(true);
    try {
      const respuesta = await agenteExtractorService.enviarMensaje({
        mensaje: texto,
        historial: historialPrevio,
        borrador_actual: borradorPrevio,
        contexto,
      });
      setMensajes((actual) => [...actual, { rol: 'assistant', contenido: respuesta.mensaje_asistente }]);
      setBorrador(respuesta.borrador);
      setListoParaConfirmar(respuesta.listo_para_confirmar);
    } catch (err) {
      mostrarToast(mensajeDeError(err, 'No se pudo enviar el mensaje al agente'), 'error');
    } finally {
      setEnviando(false);
    }
  }

  function reiniciar() {
    setMensajes([{ rol: 'assistant', contenido: MENSAJE_BIENVENIDA }]);
    setBorrador([]);
    setListoParaConfirmar(false);
  }

  return { mensajes, borrador, listoParaConfirmar, enviando, enviar, reiniciar };
}
