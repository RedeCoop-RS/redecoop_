import { createHmac } from 'crypto'
import { ghostUrl } from './helpers'

const VERSION = process.env.GHOST_API_VERSION || 'v6.0'

function token(apiKey: string) {
  const [id, secret] = apiKey.split(':')
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT', kid: id })).toString('base64url')
  const now = Math.floor(Date.now() / 1000)
  const payload = Buffer.from(JSON.stringify({ iat: now, exp: now + 180, aud: '/admin/' })).toString('base64url')
  const sig = createHmac('sha256', Buffer.from(secret, 'hex')).update(`${header}.${payload}`).digest('base64url')
  return `${header}.${payload}.${sig}`
}

export function richLexical() {
  const text = (value: string, format = 0) => ({
    type: 'extended-text',
    version: 1,
    text: value,
    format,
    mode: 'normal',
    style: '',
    detail: 0,
  })
  const block = (type: string, value: string) => ({
    type,
    version: 1,
    tag: type === 'extended-heading' ? 'h2' : undefined,
    direction: 'ltr',
    format: '',
    indent: 0,
    children: [text(value)],
  })
  return JSON.stringify({
    root: {
      type: 'root',
      version: 1,
      direction: 'ltr',
      format: '',
      indent: 0,
      children: [
        block('extended-heading', 'Cooperativas na safra'),
        block('paragraph', 'Texto de abertura da intercooperação.'),
        {
          type: 'callout',
          version: 1,
          calloutText: 'Intercooperação na prática',
          calloutEmoji: '💡',
          backgroundColor: 'green',
        },
        { type: 'horizontalrule', version: 1 },
        block('extended-quote', 'Citação da assembleia.'),
        {
          type: 'codeblock',
          version: 1,
          code: 'const leite = true;',
          language: 'javascript',
          caption: 'Marcador E2E lexical',
        },
        {
          type: 'bookmark',
          version: 1,
          url: 'https://ghost.org',
          caption: '',
          metadata: {
            url: 'https://ghost.org',
            title: 'Ghost',
            description: 'The professional publishing platform',
            icon: 'https://ghost.org/favicon.ico',
            publisher: 'Ghost',
            author: null,
            thumbnail: null,
          },
        },
        {
          type: 'html',
          version: 1,
          html: '<div class="redecoop-html-card">HTML nativo do Ghost</div>',
        },
        {
          type: 'markdown',
          version: 1,
          markdown: '**Markdown nativo** da RedeCoop',
        },
        {
          type: 'toggle',
          version: 1,
          heading: 'Pergunta frequente',
          content: '<p>Resposta da FAQ cooperativa.</p>',
        },
      ],
    },
  })
}

export async function ghostAdmin<T = any>(
  method: string,
  path: string,
  body?: unknown,
  query?: Record<string, string>,
): Promise<{ status: number; data: T }> {
  const key = process.env.GHOST_ADMIN_API_KEY
  if (!key) throw new Error('GHOST_ADMIN_API_KEY ausente')
  const url = new URL(`${ghostUrl()}/ghost/api/admin/${path.replace(/^\/+/, '')}`)
  for (const [name, value] of Object.entries(query || {})) url.searchParams.set(name, value)
  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Ghost ${token(key)}`,
      'Accept-Version': VERSION,
      Accept: 'application/json',
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  const text = await response.text()
  let data: any = null
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = { raw: text.slice(0, 400) }
  }
  return { status: response.status, data }
}

export async function seedLexicalPost(title: string) {
  const created = await ghostAdmin<any>('POST', 'posts/', {
    posts: [{ title, status: 'draft', lexical: richLexical() }],
  })
  if (created.status >= 400) {
    throw new Error(`Falha ao semear Lexical (${created.status}): ${JSON.stringify(created.data).slice(0, 400)}`)
  }
  const post = created.data?.posts?.[0]
  if (!post?.id) throw new Error('Ghost não devolveu o post Lexical.')
  return post as { id: string; updated_at: string; lexical?: string; html?: string; title: string }
}

export function lexicalTypes(lexical: string | object | null | undefined): string[] {
  if (!lexical) return []
  try {
    const tree = typeof lexical === 'string' ? JSON.parse(lexical) : lexical
    return (tree?.root?.children || []).map((node: { type?: string }) => String(node?.type || ''))
  } catch {
    return []
  }
}
