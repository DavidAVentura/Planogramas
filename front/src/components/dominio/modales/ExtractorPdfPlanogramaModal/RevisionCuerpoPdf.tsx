import { Table, type TableColumn } from '../../../ui/Table/Table';
import type { CuerpoPdf, EspacioPdf, NivelPdf, ProductoPorUbicar } from '../../../../types/extractorPdfPlanograma';
import type { GondolaListItem } from '../../../../types/gondola';
import { VistaPreviaLayoutPdf } from './VistaPreviaLayoutPdf';
import {
  claveEspacio,
  fuentePorUbicar,
  rangoGanchos,
  type DecisionCuerpo,
  type DestinoCuerpo,
  type SeleccionProductos,
} from './importacionPdf';

interface RevisionCuerpoPdfProps {
  cuerpo: CuerpoPdf;
  gondolas: GondolaListItem[];
  decision: DecisionCuerpo;
  seleccion: SeleccionProductos;
  onCambiarDecision: (decision: DecisionCuerpo) => void;
  onElegirProducto: (clave: string, sku: string | null) => void;
  /** Productos de "Por ubicar" por número de gancho; null si no se usan para llenar el layout. */
  porGancho: Map<number, ProductoPorUbicar> | null;
}

interface FilaEspacio {
  clave: string;
  nivel: NivelPdf;
  espacio: EspacioPdf;
}

const ETIQUETA_ESTADO: Record<EspacioPdf['estado_producto'], string> = {
  IDENTIFICADO: 'Identificado',
  CANDIDATOS: 'Candidatos',
  NO_ENCONTRADO: 'Sin identificar',
};

function valorDestino(destino: DestinoCuerpo): string {
  return typeof destino === 'number' ? String(destino) : destino;
}

function parsearDestino(valor: string): DestinoCuerpo {
  return valor === 'NUEVA' || valor === 'OMITIR' ? valor : Number(valor);
}

export function RevisionCuerpoPdf({
  cuerpo,
  gondolas,
  decision,
  seleccion,
  onCambiarDecision,
  onElegirProducto,
  porGancho,
}: RevisionCuerpoPdfProps) {
  const delExcel = (espacio: EspacioPdf) => (porGancho ? fuentePorUbicar(espacio, porGancho) : null);
  const filas: FilaEspacio[] = cuerpo.niveles.flatMap((nivel) =>
    nivel.espacios.map((espacio) => ({ clave: claveEspacio(cuerpo, nivel, espacio), nivel, espacio })),
  );
  const asignados = filas.filter((f) => seleccion[f.clave] || delExcel(f.espacio)?.sku).length;
  const desdeExcel = filas.filter((f) => delExcel(f.espacio)).length;
  const omitido = decision.destino === 'OMITIR';
  const reemplaza = typeof decision.destino === 'number';

  const columnas: TableColumn<FilaEspacio>[] = [
    { key: 'nivel', header: 'Nivel', render: (f) => f.nivel.orden },
    { key: 'gancho', header: 'Gancho', render: (f) => f.espacio.ganchos.join(', ') },
    { key: 'sku', header: 'SKU en PDF', render: (f) => f.espacio.sku_impreso ?? '—' },
    {
      key: 'estado',
      header: 'Estado',
      render: (f) =>
        delExcel(f.espacio) ? (
          <span className="revision-pdf__estado revision-pdf__estado--excel">Del Excel</span>
        ) : (
          <span className={`revision-pdf__estado revision-pdf__estado--${f.espacio.estado_producto.toLowerCase()}`}>
            {ETIQUETA_ESTADO[f.espacio.estado_producto]}
          </span>
        ),
    },
    {
      key: 'producto',
      header: 'Producto a asignar',
      render: (f) => {
        const fuente = delExcel(f.espacio);
        if (fuente) {
          return (
            <span className="revision-pdf__excel" title="Producto de la góndola Por ubicar con estos mismos ganchos; se mueve aquí con sus datos del Excel">
              {fuente.sku ? `${fuente.sku} · ${fuente.nombre}` : fuente.nombre}
            </span>
          );
        }
        const opciones = [f.espacio.producto, ...f.espacio.candidatos].filter((p): p is NonNullable<typeof p> => p !== null);
        return (
          <select
            className="revision-pdf__select"
            value={seleccion[f.clave] ?? ''}
            disabled={omitido}
            onChange={(e) => onElegirProducto(f.clave, e.target.value || null)}
            aria-label={`Producto del gancho ${f.espacio.ganchos.join(', ')}`}
          >
            <option value="">Dejar pendiente{f.espacio.descripcion_visual ? ` (${f.espacio.descripcion_visual})` : ''}</option>
            {opciones.map((p) => (
              <option key={p.sku} value={p.sku}>
                {p.sku} · {p.nombre}
              </option>
            ))}
          </select>
        );
      },
    },
    { key: 'ancho', header: 'Ancho', alinear: 'right', render: (f) => `${f.espacio.ancho_cm} cm` },
  ];

  return (
    <section className={`revision-pdf__cuerpo${omitido ? ' revision-pdf__cuerpo--omitido' : ''}`}>
      <header className="revision-pdf__cabecera">
        <label className="revision-pdf__campo revision-pdf__campo--nombre">
          <span>Nombre de la góndola</span>
          <input
            type="text"
            maxLength={100}
            value={decision.nombre}
            disabled={omitido}
            onChange={(e) => onCambiarDecision({ ...decision, nombre: e.target.value })}
          />
        </label>
        <label className="revision-pdf__campo">
          <span>Destino</span>
          <select
            value={valorDestino(decision.destino)}
            onChange={(e) => onCambiarDecision({ ...decision, destino: parsearDestino(e.target.value) })}
          >
            <option value="NUEVA">Crear góndola nueva</option>
            {gondolas.filter((g) => !g.por_ubicar).map((g) => (
              <option key={g.id} value={g.id}>
                Reemplazar «{g.nombre}»
              </option>
            ))}
            <option value="OMITIR">No importar</option>
          </select>
        </label>
      </header>

      {reemplaza && (
        <p className="revision-pdf__aviso">
          Se borrará todo el contenido actual de la góndola (secciones, niveles y posiciones) y se reemplazará por este layout.
        </p>
      )}

      <div className="revision-pdf__cuerpo-contenido">
        <div className="revision-pdf__lado">
          <VistaPreviaLayoutPdf cuerpo={cuerpo} seleccion={seleccion} esDelExcel={(e) => Boolean(delExcel(e))} />
          <dl className="revision-pdf__medidas">
            <div><dt>Medidas</dt><dd>{cuerpo.ancho_cm} × {cuerpo.alto_cm} × {cuerpo.profundidad_cm} cm</dd></div>
            <div><dt>Secciones</dt><dd>{cuerpo.secciones.length ? cuerpo.secciones.filter((s) => !s.es_division).length : 'Sin dividir'}</dd></div>
            <div><dt>Productos</dt><dd>{asignados} de {filas.length} asignados</dd></div>
            {porGancho && <div><dt>Del Excel</dt><dd>{desdeExcel} espacio(s)</dd></div>}
            {cuerpo.categoria && <div><dt>Categoría</dt><dd>{cuerpo.categoria}</dd></div>}
          </dl>
          <ul className="revision-pdf__niveles">
            {cuerpo.niveles.map((n) => (
              <li key={n.clave}>
                <strong>Nivel {n.orden}</strong> · {n.tipo_accesorio}
                {n.codigo_accesorio ? ` ${n.codigo_accesorio}` : ''} · {n.altura_desde_piso_cm} cm · ganchos {rangoGanchos(n)}
              </li>
            ))}
          </ul>
        </div>
        <div className="revision-pdf__tabla">
          <Table<FilaEspacio>
            columns={columnas}
            rows={filas}
            rowKey={(f) => f.clave}
            vacio={<p className="revision-pdf__ayuda">No se detectaron espacios en este cuerpo.</p>}
          />
        </div>
      </div>

      {cuerpo.advertencias.length > 0 && (
        <ul className="revision-pdf__advertencias">
          {cuerpo.advertencias.map((a, i) => <li key={i}>{a}</li>)}
        </ul>
      )}
    </section>
  );
}
