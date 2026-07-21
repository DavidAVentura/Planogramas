import { useEffect, useState } from 'react';
import { useJerarquiaExploracion } from '../../../../hooks/useJerarquia';
import { useProductosPorSubcategoria } from '../../../../hooks/useCatalogo';
import { Button } from '../../../ui/Button/Button';
import { Table } from '../../../ui/Table/Table';
import { EmptyState } from '../../../ui/EmptyState/EmptyState';
import type { ProductoCatalogo } from '../../../../types/catalogo';
import './ExploradorSubcategorias.css';

interface ExploradorSubcategoriasProps {
  /** Id de departamento (CATI) ya elegido en la columna del formulario; vacío deshabilita el explorador. */
  departamentoId: string;
  onAgregar: (subcategoriaNombre: string) => void;
}

export function ExploradorSubcategorias({ departamentoId, onAgregar }: ExploradorSubcategoriasProps) {
  const {
    familias,
    categorias,
    subcategorias,
    cargandoFamilias,
    cargandoCategorias,
    cargandoSubcategorias,
    cargarFamilias,
    cargarCategorias,
    cargarSubcategorias,
  } = useJerarquiaExploracion();
  const { productos, cargando: cargandoProductos, buscar: buscarProductos } = useProductosPorSubcategoria();

  const [familiaId, setFamiliaId] = useState('');
  const [categoriaId, setCategoriaId] = useState('');
  const [subcategoriaId, setSubcategoriaId] = useState('');

  const subcategoriaNombre = subcategorias.find((s) => s.id === subcategoriaId)?.name ?? '';

  useEffect(() => {
    setFamiliaId('');
    cargarFamilias(departamentoId);
  }, [departamentoId, cargarFamilias]);

  useEffect(() => {
    setCategoriaId('');
    cargarCategorias(familiaId);
  }, [familiaId, cargarCategorias]);

  useEffect(() => {
    setSubcategoriaId('');
    cargarSubcategorias(categoriaId);
  }, [categoriaId, cargarSubcategorias]);

  useEffect(() => {
    buscarProductos(subcategoriaId);
  }, [subcategoriaId]);

  if (!departamentoId) {
    return (
      <EmptyState
        titulo="Explorador de subcategorías"
        hint="Selecciona un área y departamento para explorar familias, categorías y subcategorías."
      />
    );
  }

  return (
    <div className="explorador-subcategorias">
      <section className="explorador-subcategorias__nivel">
        <span className="explorador-subcategorias__etiqueta">Familia</span>
        <div className="explorador-subcategorias__chips">
          {cargandoFamilias && <span className="explorador-subcategorias__ayuda">Cargando…</span>}
          {familias.map((familia) => (
            <button
              key={familia.id}
              type="button"
              className={
                'explorador-subcategorias__chip' +
                (familia.id === familiaId ? ' explorador-subcategorias__chip--activa' : '')
              }
              onClick={() => setFamiliaId(familia.id)}
            >
              {familia.name}
            </button>
          ))}
        </div>
      </section>

      {familiaId && (
        <section className="explorador-subcategorias__nivel">
          <span className="explorador-subcategorias__etiqueta">Categoría</span>
          <div className="explorador-subcategorias__chips">
            {cargandoCategorias && <span className="explorador-subcategorias__ayuda">Cargando…</span>}
            {categorias.map((categoria) => (
              <button
                key={categoria.id}
                type="button"
                className={
                  'explorador-subcategorias__chip' +
                  (categoria.id === categoriaId ? ' explorador-subcategorias__chip--activa' : '')
                }
                onClick={() => setCategoriaId(categoria.id)}
              >
                {categoria.name}
              </button>
            ))}
          </div>
        </section>
      )}

      {categoriaId && (
        <section className="explorador-subcategorias__nivel">
          <span className="explorador-subcategorias__etiqueta">Subcategoría</span>
          <div className="explorador-subcategorias__chips">
            {cargandoSubcategorias && <span className="explorador-subcategorias__ayuda">Cargando…</span>}
            {subcategorias.map((subcategoria) => (
              <button
                key={subcategoria.id}
                type="button"
                className={
                  'explorador-subcategorias__chip explorador-subcategorias__chip--subcategoria' +
                  (subcategoria.id === subcategoriaId ? ' explorador-subcategorias__chip--activa' : '')
                }
                onClick={() => setSubcategoriaId(subcategoria.id)}
              >
                {subcategoria.name}
              </button>
            ))}
          </div>
        </section>
      )}

      {subcategoriaId && (
        <section className="explorador-subcategorias__nivel">
          <span className="explorador-subcategorias__etiqueta">Productos en subcategoría</span>
          <Table<ProductoCatalogo>
            columns={[
              {
                key: 'nombre',
                header: 'Nombre',
                render: (p) => (
                  <span className="explorador-subcategorias__producto">
                    <span className="explorador-subcategorias__producto-swatch" aria-hidden="true" />
                    {p.nombre}
                  </span>
                ),
              },
              { key: 'sku', header: 'SKU', render: (p) => p.sku },
              {
                key: 'precio',
                header: 'Precio',
                render: (p) => (p.precio != null ? `Q${p.precio.toFixed(2)}` : '—'),
              },
            ]}
            rows={productos}
            rowKey={(p) => p.sku}
            vacio={
              <p className="explorador-subcategorias__ayuda">
                {cargandoProductos ? 'Cargando productos…' : 'Sin productos en esta subcategoría.'}
              </p>
            }
          />
          <Button
            type="button"
            className="explorador-subcategorias__agregar"
            onClick={() => onAgregar(subcategoriaNombre)}
          >
            + Añadir subcat al planograma
          </Button>
        </section>
      )}
    </div>
  );
}
