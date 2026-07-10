export function cleanText(text: string | undefined | null) {
  if (text == null || text === '' || text === 'null' || text === 'undefined') return ''
  return text
}
