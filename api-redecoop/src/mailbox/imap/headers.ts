export type MailPriority = 'high' | 'normal' | 'low';

export interface ParsedHeaderFlags {
  priority: MailPriority;
  listUnsubscribe?: string;
  receiptTo?: string;
}

/** Junta linhas dobradas (RFC 5322) e devolve os cabeçalhos em minúsculas. */
export function parseRawHeaders(raw: Buffer | string | undefined | null): Map<string, string> {
  const result = new Map<string, string>();
  if (!raw) return result;
  const text = (Buffer.isBuffer(raw) ? raw.toString('utf8') : raw).replace(/\r?\n[ \t]+/g, ' ');
  for (const line of text.split(/\r?\n/)) {
    const index = line.indexOf(':');
    if (index <= 0) continue;
    const key = line.slice(0, index).trim().toLowerCase();
    const value = line.slice(index + 1).trim();
    if (!result.has(key)) result.set(key, value);
  }
  return result;
}

export function priorityFromHeaders(headers: Map<string, string>): MailPriority {
  const xPriority = headers.get('x-priority');
  if (xPriority) {
    const level = Number.parseInt(xPriority, 10);
    if (level === 1 || level === 2) return 'high';
    if (level === 4 || level === 5) return 'low';
  }
  const named = (headers.get('importance') || headers.get('priority') || '').toLowerCase();
  if (named.includes('high') || named.includes('urgent')) return 'high';
  if (named.includes('low') || named.includes('non-urgent')) return 'low';
  return 'normal';
}

/** Escolhe o primeiro link https do List-Unsubscribe; senão, o mailto. */
export function unsubscribeFromHeader(value: string | undefined | null): string | undefined {
  if (!value) return undefined;
  const links = [...value.matchAll(/<([^>]+)>/g)].map((match) => match[1].trim());
  const https = links.find((link) => /^https:\/\/[^\s"'<>]+$/i.test(link));
  if (https) return https.slice(0, 1024);
  const mailto = links.find((link) => /^mailto:[^\s"'<>]+$/i.test(link));
  return mailto ? mailto.slice(0, 1024) : undefined;
}

export function receiptAddressFromHeader(value: string | undefined | null): string | undefined {
  if (!value) return undefined;
  const match = value.match(/<?([^<>\s,;"]+@[^<>\s,;"]+)>?/);
  return match ? match[1].toLowerCase().slice(0, 320) : undefined;
}

export function headerFlags(raw: Buffer | string | undefined | null): ParsedHeaderFlags {
  const headers = parseRawHeaders(raw);
  return {
    priority: priorityFromHeaders(headers),
    listUnsubscribe: unsubscribeFromHeader(headers.get('list-unsubscribe')),
    receiptTo: receiptAddressFromHeader(headers.get('disposition-notification-to')),
  };
}

export function decodeQuotedPrintable(input: string): Buffer {
  const cleaned = input.replace(/=\r?\n/g, '');
  const bytes: number[] = [];
  for (let index = 0; index < cleaned.length; index += 1) {
    const char = cleaned[index];
    if (char === '=' && /^[0-9a-f]{2}$/i.test(cleaned.slice(index + 1, index + 3))) {
      bytes.push(Number.parseInt(cleaned.slice(index + 1, index + 3), 16));
      index += 2;
    } else {
      bytes.push(...Buffer.from(char, 'utf8'));
    }
  }
  return Buffer.from(bytes);
}

export function decodeCharset(buffer: Buffer, charset?: string): string {
  const label = (charset || 'utf-8').toLowerCase();
  try {
    return new TextDecoder(label, { fatal: false }).decode(buffer);
  } catch {
    return buffer.toString('utf8');
  }
}

/** Decodifica um trecho parcial de uma parte MIME para texto de prévia. */
export function decodePreviewPart(
  chunk: Buffer,
  encoding: string | undefined,
  charset: string | undefined,
  isHtml: boolean,
): string {
  const transfer = (encoding || '7bit').toLowerCase();
  let bytes: Buffer;
  if (transfer === 'base64') {
    const ascii = chunk.toString('latin1').replace(/[^a-z0-9+/=]/gi, '');
    bytes = Buffer.from(ascii.slice(0, ascii.length - (ascii.length % 4)), 'base64');
  } else if (transfer === 'quoted-printable') {
    bytes = decodeQuotedPrintable(chunk.toString('latin1'));
  } else {
    bytes = chunk;
  }
  let text = decodeCharset(bytes, charset).replace(/\uFFFD+$/g, '');
  if (isHtml) {
    text = text
      .replace(/<(style|script|head)[\s\S]*?(<\/\1>|$)/gi, ' ')
      .replace(/<[^>]*>?/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'");
  }
  return text;
}

interface StructureNode {
  part?: string;
  type?: string;
  encoding?: string;
  disposition?: string;
  parameters?: Record<string, string>;
  childNodes?: StructureNode[];
}

/** Primeira parte text/plain (ou text/html) que não seja anexo. */
export function previewPart(
  node: StructureNode | undefined,
): { part: string; encoding?: string; charset?: string; html: boolean } | null {
  if (!node) return null;
  const queue: StructureNode[] = [node];
  let html: StructureNode | null = null;
  while (queue.length) {
    const current = queue.shift() as StructureNode;
    const type = (current.type || '').toLowerCase();
    const attachment = (current.disposition || '').toLowerCase() === 'attachment';
    if (!attachment && type === 'text/plain') {
      return {
        part: current.part || '1',
        encoding: current.encoding,
        charset: current.parameters?.charset,
        html: false,
      };
    }
    if (!attachment && type === 'text/html' && !html) html = current;
    if (type === 'message/rfc822') continue;
    for (const child of current.childNodes || []) queue.push(child);
  }
  if (!html) return null;
  return {
    part: html.part || '1',
    encoding: html.encoding,
    charset: html.parameters?.charset,
    html: true,
  };
}
