import { useState } from 'react';
import { Drawer } from '../../../ui/Drawer/Drawer';
import { Button } from '../../../ui/Button/Button';
import type { ItemBorrador, MensajeChat } from '../../../../types/agenteExtractor';
import './AgenteExtractorChat.css';

interface AgenteExtractorChatProps {
  mensajes: MensajeChat[];
  borrador: ItemBorrador[];
  listoParaConfirmar: boolean;
  enviando: boolean;
  onEnviar: (texto: string) => void;
  onRevisar: () => void;
  onClose: () => void;
}

export function AgenteExtractorChat({
  mensajes,
  borrador,
  listoParaConfirmar,
  enviando,
  onEnviar,
  onRevisar,
  onClose,
}: AgenteExtractorChatProps) {
  const [texto, setTexto] = useState('');

  function enviarTexto() {
    const valor = texto.trim();
    if (!valor || enviando) return;
    setTexto('');
    onEnviar(valor);
  }

  return (
    <Drawer
      titulo="Agente extractor del planograma"
      onClose={onClose}
      ancho="md"
      footer={
        <>
          <Button variante="outline" onClick={onClose}>
            Cerrar
          </Button>
          <Button variante="primary" onClick={onRevisar} disabled={borrador.length === 0}>
            Revisar y confirmar ({borrador.length})
          </Button>
        </>
      }
    >
      <div className="agente-extractor-chat">
        <div className="agente-extractor-chat__mensajes">
          {mensajes.map((m, i) => (
            <div
              key={i}
              className={`agente-extractor-chat__mensaje agente-extractor-chat__mensaje--${m.rol}`}
            >
              {m.contenido}
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
          <textarea
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
          <Button variante="primary" onClick={enviarTexto} disabled={enviando || !texto.trim()}>
            Enviar
          </Button>
        </div>
      </div>
    </Drawer>
  );
}
