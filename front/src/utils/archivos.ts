/** Peso legible: "850 KB", "12.5 MB". */
export const formatearPeso = (bytes: number) =>
  bytes >= 1024 * 1024 ? `${+(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;

/**
 * Valida nombre y tipo MIME contra los tokens de un `accept` de <input type="file">: extensiones
 * (".pdf"), MIME exacto o comodín ("image/*").
 */
export function cumpleAccept(nombre: string, tipoMime: string, accept: string) {
  const n = nombre.toLowerCase();
  const tipo = tipoMime.toLowerCase();
  return accept
    .split(',')
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean)
    .some((t) => (t.startsWith('.') ? n.endsWith(t) : t.endsWith('/*') ? tipo.startsWith(t.slice(0, -1)) : tipo === t));
}
