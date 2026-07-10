/** Converte HTML limitado da API em conteúdo seguro para exibição no chat. */
export function formatMessageHtml(content: string): string {
  if (!content) return ''

  return content
    .replace(/<br\s*\/?>/gi, '<br />')
    .replace(/<\/?b>/gi, (tag) => (tag.toLowerCase() === '<b>' ? '<strong>' : '</strong>'))
    .replace(/<span>/gi, '<span>')
    .replace(/<\/span>/gi, '</span>')
}

/** Extrai texto puro para edição no textarea. */
export function messageToPlainText(content: string): string {
  if (!content) return ''

  return content
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export function isPendingPlaceholder(content: string) {
  return content.includes('Você já recebeu uma resposta') || content.includes('Aguarde a intermediação')
}
