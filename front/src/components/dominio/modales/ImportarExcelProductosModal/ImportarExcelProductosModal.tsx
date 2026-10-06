import { useState } from 'react';
import { Modal } from '../../../ui/Modal/Modal';
import { Button } from '../../../ui/Button/Button';
import { Table, type TableColumn } from '../../../ui/Table/Table';
import { ZonaArrastreArchivo } from '../../../ui/ZonaArrastreArchivo/ZonaArrastreArchivo';
import { UsarAdjuntos } from '../../UsarAdjuntos/UsarAdjuntos';
import { AccesorioFormModal } from '../AccesorioFormModal/AccesorioFormModal';
import { useAccesorios } from '../../../../hooks/useAccesorios';
import { useToast } from '../../../../context/ToastContext';
import { importacionProductosService } from '../../../../services/importacionProductos.service';
import { leerExcelProductos, type LecturaExcelProductos } from '../../../../utils/excelProductosPlanograma';
import { mensajeDeError } from '../../../../utils/errors';
import type { ProductoExcel } from '../../../../types/importacionProductos';
import type { TipoAccesorioCatalogo } from '../../../../types/accesorio';
import './ImportarExcelProductosModal.css';

interface ImportarExcelProductosModalProps {
  versionId: number;
  onClose: () => void;
  /** Se llama tras importar, para recargar el lienzo. */
  onImportado: () => void;
}

/** El Excel se lee en el navegador; el tope evita colgar la pestaña con archivos que no son el listado. */
const MAX_BYTES_EXCEL = 10 * 1024 * 1024;

const normalizar =(codigo: string) => codigo.trim().replace(/\s+/g, ' ').toUpperCase();

/** Tipo sugerido para dar de alta un accesorio que trae el Excel (el usuario lo puede cambiar). */
function tipoSugerido(codigo: string, tamano: number | null): TipoAccesorioCatalogo {
  if (/^S[A-Z]{2}\b|\*/.test(codigo) || (tamano ?? 0) >= 18) return 'BANDEJA';
  if (/^R\d/.test(codigo)) return 'GANCHO';
  return 'OTRO';
}

const cantidad = (n: number | null) => (n === null ? '—' : n);

/**
 * "Excel de productos": lee el listado de productos del planograma (ganchos, cantidades, mín./máx.,
 * accesorio de montaje...) y lo importa a la góndola "Por ubicar" de la versión, una posición por
 * SKU. El analista después arrastra cada producto a su lugar real en el lienzo.
 */
export function ImportarExcelProductosModal({ versionId, onClose, onImportado }: ImportarExcelProductosModalProps) {
  const [archivo, setArchivo] = useState<File | null>(null);
  const [leyendo, setLeyendo] = useState(false);
  const [importando, setImportando] = useState(false);
  const [lectura, setLectura] = useState<LecturaExcelProductos | null>(null);
  const [accesorioAlta, setAccesorioAlta] = useState<{ codigo: string; tipo: TipoAccesorioCatalogo } | null>(null);
  const { accesorios, recargar: recargarAccesorios } = useAccesorios();
  const { mostrarToast } = useToast();

  async function leer() {
    if (!archivo || leyendo) return;
    setLeyendo(true);
    try {
      const resultado = await leerExcelProductos(archivo);
      if (resultado.columnasFaltantes.length) {
        mostrarToast(`El archivo no tiene las columnas: ${resultado.columnasFaltantes.join(', ')}`, 'error');
      } else if (!resultado.productos.length) {
        mostrarToast('El archivo no tiene productos para importar', 'error');
      } else {
        setLectura(resultado);
      }
    } catch {
      mostrarToast('No se pudo leer el archivo. Verificá que sea un Excel (.xlsx).', 'error');
    } finally {
      setLeyendo(false);
    }
  }

  const codigosCatalogo = new Set(accesorios.map((a) => normalizar(a.codigo)));
  const faltantes = lectura
    ? [...new Map(
        lectura.productos
          .filter((p) => p.accesorio_codigo && !codigosCatalogo.has(normalizar(p.accesorio_codigo)))
          .map((p) => [normalizar(p.accesorio_codigo!), p]),
      ).values()]
    : [];

  async function importar() {
    if (!lectura || importando) return;
    setImportando(true);
    try {
      const r = await importacionProductosService.importar(versionId, lectura.productos);
      mostrarToast(
        r.totalImportados
          ? `Se importaron ${r.totalImportados} producto(s) a la góndola "Por ubicar"`
          : 'No se importó ningún producto nuevo',
        r.totalImportados ? 'success' : 'info',
      );
      if (r.omitidos.length) mostrarToast(`${r.omitidos.length} omitido(s): ${r.omitidos.map((o) => `${o.sku} (${o.motivo.toLowerCase()})`).join(', ')}`, 'info');
      r.advertencias.forEach((a) => mostrarToast(a, 'info'));
      onImportado();
    } catch (err) {
      mostrarToast(mensajeDeError(err, 'No se pudo importar el Excel'), 'error');
    } finally {
      setImportando(false);
    }
  }

  const columnas: TableColumn<ProductoExcel>[] = [
    { key: 'sku', header: 'SKU', render: (p) => <span className="mono">{p.sku}</span> },
    { key: 'descripcion', header: 'Descripción', render: (p) => p.descripcion ?? '—' },
    { key: 'ganchos', header: 'Ganchos', render: (p) => (p.ganchos.length ? p.ganchos.join(', ') : '—') },
    { key: 'facings', header: 'Facings', alinear: 'right', render: (p) => p.facings_horizontal },
    { key: 'unidades', header: 'Cant. × facing', alinear: 'right', render: (p) => p.unidades_por_facing },
    { key: 'vertical', header: 'Vertical', alinear: 'right', render: (p) => p.cantidad_apilable },
    { key: 'minest', header: 'Mín. estético', alinear: 'right', render: (p) => cantidad(p.min_estetico) },
    { key: 'cap', header: 'Capacidad', alinear: 'right', render: (p) => cantidad(p.capacidad_maxima) },
    {
      key: 'accesorio',
      header: 'Accesorio',
      render: (p) =>
        p.accesorio_codigo ? `${p.accesorio_codigo}${p.tamano_accesorio_pulgadas ? ` · ${p.tamano_accesorio_pulgadas}"` : ''}` : '—',
    },
    { key: 'perfil', header: 'Perfil', render: (p) => p.perfil_redondeo ?? '—' },
    { key: 'minmax', header: 'Mín./Máx.', alinear: 'right', render: (p) => `${cantidad(p.min_final)} / ${cantidad(p.max_final)}` },
    { key: 'decision', header: 'Decisión', render: (p) => p.decision ?? '—' },
  ];

  if (accesorioAlta) {
    return (
      <AccesorioFormModal
        accesorio={null}
        inicial={{ codigo: accesorioAlta.codigo, nombre: accesorioAlta.codigo, tipo: accesorioAlta.tipo }}
        onClose={() => setAccesorioAlta(null)}
        onGuardado={() => {
          setAccesorioAlta(null);
          recargarAccesorios();
        }}
      />
    );
  }

  if (lectura) {
    return (
      <Modal
        titulo={`Productos del Excel · ${archivo?.name ?? ''}`}
        onClose={importando ? () => {} : onClose}
        ancho="xl"
        footer={
          <>
            <Button variante="outline" onClick={onClose} disabled={importando}>
              Cancelar
            </Button>
            <Button variante="primary" onClick={importar} disabled={importando}>
              {importando ? 'Importando…' : `Importar a "Por ubicar" (${lectura.productos.length})`}
            </Button>
          </>
        }
      >
        <div className="importar-excel">
          <p className="importar-excel__ayuda">
            {lectura.productos.length} producto(s)
            {lectura.planogramas.length ? ` del planograma ${lectura.planogramas.join(', ')}` : ''}. Se colocan en la góndola
            "Por ubicar" (10 por nivel, en orden de gancho) con todos sus datos; después los arrastrás a su lugar en el lienzo. Los
            SKU que ya están en la versión se omiten.
          </p>

          {faltantes.length > 0 && (
            <div className="importar-excel__faltantes" role="note">
              <strong>Accesorios que no están en el catálogo</strong>
              <span>Dalos de alta para que queden asignados a sus productos; si no, esos productos se importan sin accesorio.</span>
              <ul>
                {faltantes.map((p) => (
                  <li key={p.accesorio_codigo}>
                    <span className="mono">{p.accesorio_codigo}</span>
                    <Button
                      variante="outline"
                      onClick={() => setAccesorioAlta({ codigo: p.accesorio_codigo!, tipo: tipoSugerido(p.accesorio_codigo!, p.tamano_accesorio_pulgadas) })}
                    >
                      Dar de alta
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {lectura.filasConError.length > 0 && (
            <ul className="importar-excel__advertencias">
              {lectura.filasConError.map((f) => (
                <li key={f.fila}>
                  Fila {f.fila}: {f.motivo} (no se importa)
                </li>
              ))}
            </ul>
          )}

          <div className="importar-excel__tabla">
            <Table<ProductoExcel> columns={columnas} rows={lectura.productos} rowKey={(p) => p.sku} />
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      titulo="Excel de productos"
      onClose={leyendo ? () => {} : onClose}
      ancho="md"
      footer={
        <>
          <Button variante="outline" onClick={onClose} disabled={leyendo}>
            Cancelar
          </Button>
          <Button variante="primary" onClick={leer} disabled={!archivo || leyendo}>
            {leyendo ? 'Leyendo…' : 'Leer archivo'}
          </Button>
        </>
      }
    >
      <div className="importar-excel">
        <p className="importar-excel__ayuda">
          Subí el Excel del planograma (una fila por SKU con sus ganchos TG1…TG10, facings, cantidades, mín./máx., accesorio
          y observaciones). Se lee la primera hoja; la jerarquía, marca, modelo, temporada y sustitución no se importan.
        </p>
        <ZonaArrastreArchivo
          accept=".xlsx"
          formatos="Excel (.xlsx)"
          maxBytes={MAX_BYTES_EXCEL}
          indicacion="Una fila por SKU; se lee solo la primera hoja."
          archivo={archivo}
          onSeleccionar={setArchivo}
          disabled={leyendo}
        />
        <UsarAdjuntos
          versionId={versionId}
          accept=".xlsx"
          maxBytes={MAX_BYTES_EXCEL}
          onSeleccionar={setArchivo}
          disabled={leyendo}
        />
      </div>
    </Modal>
  );
}
