import { BadRequestException } from '@nestjs/common';

/** Origem do Ghost, sem /ghost no final e sem barra sobrando. */
export function normalizeGhostAdminUrl(input: string): string {
  const trimmed = (input || '').trim();
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    throw new BadRequestException('Informe a URL do Ghost, por exemplo https://blog.seudominio.com.');
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new BadRequestException('A URL do Ghost precisa começar com http:// ou https://.');
  }
  if (url.username || url.password) {
    throw new BadRequestException('Não inclua usuário ou senha na URL do Ghost.');
  }
  const path = url.pathname.replace(/\/+$/, '').replace(/\/ghost$/i, '');
  return `${url.protocol}//${url.host}${path === '/' ? '' : path}`;
}

const GHOST_ID = /^[a-f0-9]{24}$/i;

export function assertGhostId(id: string): void {
  if (!GHOST_ID.test(id || '')) {
    throw new BadRequestException('Identificador do Ghost inválido.');
  }
}

export function ghostKeyHint(apiKey: string): string {
  const secret = (apiKey.split(':')[1] || '').slice(-4);
  return secret ? `••••${secret}` : '••••';
}

export function publishedAtIso(value?: string | null): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new BadRequestException('Data de publicação inválida.');
  }
  return date.toISOString();
}
