import sanitizeHtml = require('sanitize-html');

const ALLOWED_TAGS = [
  ...sanitizeHtml.defaults.allowedTags,
  'img',
  'h1',
  'h2',
  'span',
  'div',
  'font',
  'center',
  'table',
  'thead',
  'tbody',
  'tfoot',
  'tr',
  'td',
  'th',
  'hr',
  'section',
  'article',
  'header',
  'footer',
];

const SAFE_STYLE =
  /^(?:#[0-9a-f]{3,8}|rgba?\([^)]*\)|hsla?\([^)]*\)|[a-z-]+|\d+(?:\.\d+)?(?:px|em|rem|%|pt)?|0)$/i;

const STYLE_PROPS = [
  'color',
  'background-color',
  'text-align',
  'font-size',
  'font-weight',
  'font-style',
  'font-family',
  'text-decoration',
  'margin',
  'margin-top',
  'margin-right',
  'margin-bottom',
  'margin-left',
  'padding',
  'padding-top',
  'padding-right',
  'padding-bottom',
  'padding-left',
  'border',
  'border-collapse',
  'width',
  'max-width',
  'height',
  'line-height',
  'vertical-align',
  'display',
];

function styleMap(): Record<string, RegExp[]> {
  const map: Record<string, RegExp[]> = {};
  for (const prop of STYLE_PROPS) map[prop] = [SAFE_STYLE, /^[\w\s,'".%-]+$/];
  return map;
}

export interface SanitizedMailHtml {
  html: string;
  remoteImageCount: number;
}

export function sanitizeMailboxHtml(
  input: string | null | undefined,
  options: { allowRemoteImages: boolean },
): SanitizedMailHtml {
  let remoteImageCount = 0;
  const html = sanitizeHtml(input || '', {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: {
      a: ['href', 'name', 'target', 'rel'],
      img: ['src', 'alt', 'width', 'height'],
      td: ['colspan', 'rowspan', 'align', 'valign'],
      th: ['colspan', 'rowspan', 'align', 'valign'],
      table: ['border', 'cellpadding', 'cellspacing', 'align', 'width'],
      '*': ['style', 'align', 'data-mailbox-signature'],
    },
    allowedSchemes: ['http', 'https', 'mailto', 'cid', 'data'],
    allowedSchemesByTag: {
      img: options.allowRemoteImages ? ['http', 'https', 'cid', 'data'] : ['cid', 'data'],
    },
    allowProtocolRelative: false,
    allowedStyles: {
      '*': styleMap(),
    },
    transformTags: {
      a: (_tag, attribs) => ({
        tagName: 'a',
        attribs: {
          href: attribs.href || '#',
          rel: 'noopener noreferrer nofollow',
          target: '_blank',
        },
      }),
      img: (_tag, attribs) => {
        const src = attribs.src || '';
        const remote = /^https?:/i.test(src);
        if (remote) remoteImageCount += 1;
        if (remote && !options.allowRemoteImages) {
          return {
            tagName: 'img',
            attribs: {
              alt: attribs.alt || 'Imagem remota bloqueada',
            },
          };
        }
        return {
          tagName: 'img',
          attribs: {
            src,
            alt: attribs.alt || '',
            ...(attribs.width ? { width: attribs.width } : {}),
            ...(attribs.height ? { height: attribs.height } : {}),
          },
        };
      },
    },
  });

  return { html, remoteImageCount };
}

export function htmlToText(html: string | null | undefined): string {
  return (html || '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|tr|h1|h2|li)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function withSignature(
  html: string,
  signature: string | null | undefined,
  include: boolean,
) {
  if (!include || !signature?.trim()) return html || '';
  if ((html || '').includes('data-mailbox-signature')) return html || '';
  const safe = sanitizeMailboxHtml(signature, { allowRemoteImages: true }).html;
  return `${html || ''}<div data-mailbox-signature="1">${safe}</div>`;
}
