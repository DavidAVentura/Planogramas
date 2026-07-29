import { useState } from 'react';
import { Modal } from '../../../ui/Modal/Modal';
import { Button } from '../../../ui/Button/Button';
import { Table, type TableColumn } from '../../../ui/Table/Table';
import { extractorImagenNumeradaService } from '../../../../services/extractorImagenNumerada.service';
import { redimensionarImagenABase64 } from '../../../../utils/imagenRedimensionar';
import { useToast } from '../../../../context/ToastContext';
import { mensajeDeError } from '../../../../utils/errors';
import type { ResultadoExtraccionImagen } from '../../../../types/extractorImagenNumerada';
import './ExtractorImagenNumeradaModal.css';

interface ExtractorImagenNumeradaModalProps {
  onClose: () => void;
  onAceptar: (mensaje: string) => void;
}

interface FilaResumen {
  clave: string;
  nivel_orden: number;
  sku: string;
  facings_horizontal: number;
  ganchos: number[];
}

/** Construye el mensaje de texto que se manda al chat del Agente Extractor — reutiliza tal cual su
 * capacidad de interpretar frases como "SKU X con N facings en el nivel Y" (ver placeholder del
 * chat y `construirPromptSistema` en back/src/agents/agenteExtractor/agenteExtractor.js). */
function construirMensajeDesdeExtraccion(resultado: ResultadoExtraccionImagen): string {
  const lineas = resultado.niveles.flatMap((nivel) =>
    nivel.productos.map((producto) => {
      const facingsTexto = producto.facings_horizontal === 1 ? 'facing horizontal' : 'facings horizontales';
      return `- Nivel ${nivel.nivel_orden}: SKU ${producto.sku}, ${producto.facings_horizontal} ${facingsTexto} (gancho(s) ${producto.ganchos.join(', ')}).`;
    }),
  );

  const advertenciasTexto = resultado.advertencias.length > 0
    ? `\n\nAdvertencias de la lectura de la imagen: ${resultado.advertencias.join(' ')}`
    : '';

  return `Extraje estos productos de una foto numerada del mueble (${resultado.niveles.length} nivel(es) detectado(s)):\n${lineas.join('\n')}${advertenciasTexto}\n\nAgrégalos respetando estos niveles y facings horizontales; creá los niveles que todavía no existan.`;
}

function aFilas(resultado: ResultadoExtraccionImagen): FilaResumen[] {
  return resultado.niveles.flatMap((nivel) =>
    nivel.productos.map((producto, i) => ({
      clave: `${nivel.nivel_orden}-${producto.sku}-${i}`,
      nivel_orden: nivel.nivel_orden,
      sku: producto.sku,
      facings_horizontal: producto.facings_horizontal,
      ganchos: producto.ganchos,
    })),
  );
}

export function ExtractorImagenNumeradaModal({ onClose, onAceptar }: ExtractorImagenNumeradaModalProps) {
  const [archivo, setArchivo] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [analizando, setAnalizando] = useState(false);
  const [resultado, setResultado] = useState<ResultadoExtraccionImagen | null>(null);
  const { mostrarToast } = useToast();

  function onSeleccionarArchivo(e: React.ChangeEvent<HTMLInputElement>) {
    const seleccionado = e.target.files?.[0] ?? null;
    setArchivo(seleccionado);
    setPreviewUrl(seleccionado ? URL.createObjectURL(seleccionado) : null);
  }

  async function analizarImagen() {
    if (!archivo || analizando) return;
    setAnalizando(true);
    try {
      const { base64, mimeType } = await redimensionarImagenABase64(archivo);
      const respuesta = await extractorImagenNumeradaService.analizar({
        imagen_base64: base64,
        mime_type: mimeType,
      });
      setResultado(respuesta);
    } catch (err) {
      mostrarToast(mensajeDeError(err, 'No se pudo analizar la imagen'), 'error');
    } finally {
      setAnalizando(false);
    }
  }

  const columnas: TableColumn<FilaResumen>[] = [
    { key: 'nivel', header: 'Nivel', render: (f) => f.nivel_orden },
    { key: 'sku', header: 'SKU', render: (f) => f.sku },
    { key: 'facings', header: 'Facings horizontales', render: (f) => f.facings_horizontal },
    { key: 'ganchos', header: 'Ganchos', render: (f) => f.ganchos.join(', ') },
  ];

  if (resultado) {
    const filas = aFilas(resultado);

    return (
      <Modal
        titulo="Resumen de la imagen numerada"
        onClose={onClose}
        ancho="xl"
        footer={
          <>
            <Button variante="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button variante="primary" onClick={() => onAceptar(construirMensajeDesdeExtraccion(resultado))}>
              Aceptar
            </Button>
          </>
        }
      >
        <div className="extractor-imagen-numerada-modal">
          <p className="extractor-imagen-numerada-modal__ayuda">
            {resultado.niveles.length} nivel(es) detectado(s), {filas.length} producto(s).
          </p>
          <Table<FilaResumen>
            columns={columnas}
            rows={filas}
            rowKey={(f) => f.clave}
            vacio={<p className="extractor-imagen-numerada-modal__ayuda">No se detectó ningún producto en la imagen.</p>}
          />
          {resultado.advertencias.length > 0 && (
            <ul className="extractor-imagen-numerada-modal__advertencias">
              {resultado.advertencias.map((advertencia, i) => (
                <li key={i}>{advertencia}</li>
              ))}
            </ul>
          )}
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      titulo="Extraer de otra fuente"
      onClose={onClose}
      ancho="md"
      footer={
        <>
          <Button variante="outline" onClick={onClose} disabled={analizando}>
            Cancelar
          </Button>
          <Button variante="primary" onClick={analizarImagen} disabled={!archivo || analizando}>
            {analizando ? 'Analizando…' : 'Analizar imagen'}
          </Button>
        </>
      }
    >
      <div className="extractor-imagen-numerada-modal">
        <p className="extractor-imagen-numerada-modal__ayuda">
          Subí una foto del mueble donde se vean los números de gancho y el SKU de cada producto. El
          agente va a identificar los niveles, qué SKU va en cada uno y cuántos facings horizontales
          tiene.
        </p>
        <input type="file" accept="image/*" onChange={onSeleccionarArchivo} disabled={analizando} />
        {previewUrl && (
          <img src={previewUrl} alt="Vista previa de la imagen a analizar" className="extractor-imagen-numerada-modal__preview" />
        )}
      </div>
    </Modal>
  );
}
