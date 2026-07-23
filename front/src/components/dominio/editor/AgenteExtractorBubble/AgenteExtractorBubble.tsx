import { useState } from 'react';
import { AgenteExtractorChat } from '../AgenteExtractorChat/AgenteExtractorChat';
import { ResumenBorradorModal } from '../../modales/ResumenBorradorModal/ResumenBorradorModal';
import { useAgenteExtractor } from '../../../../hooks/useAgenteExtractor';
import { useNivelesDeVersion } from '../../../../hooks/useNiveles';
import { usePosicionesDeNiveles } from '../../../../hooks/usePosiciones';
import { useAccesorios } from '../../../../hooks/useAccesorios';
import { construirContextoAgente } from '../../../../utils/agenteExtractorContexto';
import type { GondolaListItem } from '../../../../types/gondola';
import './AgenteExtractorBubble.css';

interface AgenteExtractorBubbleProps {
  puedeEscribir: boolean;
  versionId: number;
  /** Todas las góndolas de la versión — el agente opera sobre la versión completa, no solo la
   * góndola activa en pantalla. */
  gondolas: GondolaListItem[];
  subcategorias: string[];
  onConfirmado: () => void;
}

export function AgenteExtractorBubble({
  puedeEscribir,
  versionId,
  gondolas,
  subcategorias,
  onConfirmado,
}: AgenteExtractorBubbleProps) {
  const [abierto, setAbierto] = useState(false);
  const [mostrarResumen, setMostrarResumen] = useState(false);

  // Carga perezosa: solo se pide el detalle de niveles/posiciones de toda la versión cuando el
  // chat está abierto, para no pegarle a la API de cada góndola en cada carga del editor.
  const { niveles, recargar: recargarNiveles } = useNivelesDeVersion(gondolas, abierto);
  const { porNivel: posicionesPorNivel, recargar: recargarPosiciones } = usePosicionesDeNiveles(niveles);
  const { accesorios } = useAccesorios();

  const contexto = construirContextoAgente(gondolas, niveles, posicionesPorNivel, accesorios, subcategorias);
  const agente = useAgenteExtractor(contexto);

  if (!puedeEscribir) return null;

  return (
    <>
      <button
        type="button"
        className="agente-extractor-bubble"
        onClick={() => setAbierto(true)}
        title="Agente extractor del planograma"
      >
        Chat
      </button>

      {abierto && (
        <AgenteExtractorChat
          mensajes={agente.mensajes}
          borrador={agente.borrador}
          listoParaConfirmar={agente.listoParaConfirmar}
          enviando={agente.enviando}
          onEnviar={agente.enviar}
          onRevisar={() => setMostrarResumen(true)}
          onClose={() => setAbierto(false)}
        />
      )}

      {mostrarResumen && (
        <ResumenBorradorModal
          borrador={agente.borrador}
          versionId={versionId}
          gondolas={gondolas}
          niveles={niveles}
          posicionesPorNivel={posicionesPorNivel}
          accesorios={accesorios}
          onClose={() => setMostrarResumen(false)}
          onConfirmado={() => {
            // No cierra el modal todavía: se queda mostrando el resumen de resultados
            // (ejecutada/fallida/omitida por acción) hasta que el usuario lo cierre a mano.
            setAbierto(false);
            agente.reiniciar();
            recargarNiveles();
            recargarPosiciones();
            onConfirmado();
          }}
        />
      )}
    </>
  );
}
