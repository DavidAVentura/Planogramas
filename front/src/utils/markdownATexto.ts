/**
 * Convierte un mensaje en Markdown a texto plano para leerlo en voz alta — sin esto el TTS
 * pronuncia asteriscos, almohadillas y barras de tabla.
 */
export function markdownATexto(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^[ \t]*\|?[ \t]*:?-{3,}:?[ \t]*(\|[ \t]*:?-{3,}:?[ \t]*)*\|?[ \t]*\n?/gm, '')
    .replace(/^[ \t]*\|(.*)\|[ \t]*$/gm, '$1')
    .replace(/[ \t]*\|[ \t]*/g, ', ')
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')
    .replace(/^\s{0,3}>\s?/gm, '')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/(\*\*|__)(.*?)\1/g, '$2')
    .replace(/(\*|_)(.*?)\1/g, '$2')
    .replace(/~~(.*?)~~/g, '$1')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
