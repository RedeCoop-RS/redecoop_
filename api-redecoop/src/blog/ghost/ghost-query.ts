import { GhostApiError } from './ghost-api.error';
import { BlogListQuery } from './ghost.types';

const ORDERS = new Set([
  'updated_at desc',
  'updated_at asc',
  'published_at desc',
  'published_at asc',
  'created_at desc',
  'title asc',
  'title desc',
]);

const STATUSES = new Set(['draft', 'published', 'scheduled', 'sent']);

function nqlString(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/[\r\n]/g, ' ').slice(0, 120);
}

function nqlIdent(value: string, label: string): string {
  const ident = (value || '').trim();
  if (!/^[a-z0-9][a-z0-9_-]{0,190}$/i.test(ident)) {
    throw new GhostApiError(`${label} inválido para filtro.`, 400);
  }
  return ident;
}

/** Filtro NQL do Ghost. Aspas do usuário são escapadas para não injetar outro filtro. */
export function buildGhostFilter(query: BlogListQuery): string {
  const parts: string[] = [];
  if (query.status && query.status !== 'all') {
    if (!STATUSES.has(query.status)) throw new GhostApiError('Status de filtro inválido.', 400);
    parts.push(`status:${query.status}`);
  }
  if (query.tag) parts.push(`tag:${nqlIdent(query.tag, 'Tag')}`);
  if (query.author) parts.push(`author:${nqlIdent(query.author, 'Autor')}`);
  const search = (query.search || '').trim();
  if (search) {
    const quoted = nqlString(search);
    parts.push(`(title:~'${quoted}',slug:~'${quoted}',custom_excerpt:~'${quoted}')`);
  }
  return parts.join('+');
}

export function ghostOrder(order?: string): string {
  const value = (order || 'updated_at desc').trim();
  if (!ORDERS.has(value)) throw new GhostApiError('Ordenação inválida.', 400);
  return value;
}
