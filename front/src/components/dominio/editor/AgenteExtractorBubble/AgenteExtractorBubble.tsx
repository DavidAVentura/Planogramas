import { useState } from 'react';
import { AgenteExtractorChat } from '../AgenteExtractorChat/AgenteExtractorChat';
import { ResumenBorradorModal } from '../../modales/ResumenBorradorModal/ResumenBorradorModal';
import { useAgenteExtractor } from '../../../../hooks/useAgenteExtractor';
import type { Nivel } from '../../../../types/nivel';
import type { PosicionesDeNivel } from '../../../../types/posicion';
import './AgenteExtractorBubble.css';

interface AgenteExtractorBubbleProps {
  puedeEscribir: boolean;
  gondolaId: number;
  niveles: Nivel[];
  posicionesPorNivel: Record<number, PosicionesDeNivel>;
  subcategorias: string[];
  onConfirmado: () => void;
}

export function AgenteExtractorBubble({
  puedeEscribir,
  gondolaId,
  niveles,
  posicionesPorNivel,
  subcategorias,
  onConfirmado,
}: AgenteExtractorBubbleProps) {
  const [abierto, setAbierto] = useState(false);
  const [mostrarResumen, setMostrarResumen] = useState(false);

  const agente = useAgenteExtractor({
    subcategorias,
    niveles: niveles.map((n) => ({ id: n.id, orden: n.orden })),
  });

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
          gondolaId={gondolaId}
          niveles={niveles}
          posicionesPorNivel={posicionesPorNivel}
          onClose={() => setMostrarResumen(false)}
          onConfirmado={() => {
            setMostrarResumen(false);
            setAbierto(false);
            agente.reiniciar();
            onConfirmado();
          }}
        />
      )}
    </>
  );
}
