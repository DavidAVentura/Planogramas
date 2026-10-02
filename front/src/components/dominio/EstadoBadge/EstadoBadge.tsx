import { Badge } from '../../ui/Badge/Badge';

interface EstadoMeta {
  label: string;
  bg: string;
  color: string;
}

// Superset de estados de Planograma (borrador/activo/archivado) y de Version
// (agrega en_desarrollo/piloto/publicado) — ambos se muestran con este mismo badge.
export const ESTADO_META: Record<string, EstadoMeta> = {
  borrador:       { label: 'Borrador',       bg: 'var(--ink-100)',           color: 'var(--ink-700)' },
  activo:         { label: 'Activo',         bg: 'var(--cemaco-green-50)',   color: 'var(--cemaco-green-700)' },
  publicado:      { label: 'Publicado',      bg: 'var(--estado-publicado-bg)', color: 'var(--estado-publicado)' },
  archivado:      { label: 'Archivado',      bg: 'var(--ink-100)',           color: 'var(--fg-3)' },
  en_desarrollo:  { label: 'En desarrollo',  bg: 'var(--estado-en-desarrollo-bg)', color: 'var(--estado-en-desarrollo)' },
  piloto:         { label: 'Piloto',         bg: 'var(--estado-piloto-bg)', color: 'var(--estado-piloto)' },
};

export function EstadoBadge({ estado }: { estado: string }) {
  const meta = ESTADO_META[estado] ?? { label: estado, bg: 'var(--ink-100)', color: 'var(--fg-2)' };
  return (
    <Badge bg={meta.bg} color={meta.color}>
      {meta.label}
    </Badge>
  );
}
