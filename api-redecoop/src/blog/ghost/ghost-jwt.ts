import { sign } from 'jsonwebtoken';
import { GhostApiError } from './ghost-api.error';

const KEY_PATTERN = /^[a-f0-9]{8,128}:[a-f0-9]{16,256}$/i;

export function assertGhostAdminKey(key: string): void {
  if (!KEY_PATTERN.test((key || '').trim())) {
    throw new GhostApiError(
      'A Admin API key deve estar no formato id:secret (os dois lados em hexadecimal).',
      400,
    );
  }
}

/**
 * JWT de curta duração exigido pela Admin API.
 * https://ghost.org/docs/admin-api/#token-authentication
 * O segredo hex vira bytes; o id vai no header `kid`; aud é `/admin/`.
 */
export function createGhostAdminJwt(apiKey: string, nowSeconds = Math.floor(Date.now() / 1000)): string {
  const key = (apiKey || '').trim();
  assertGhostAdminKey(key);
  const [id, secret] = key.split(':');
  return sign({ iat: nowSeconds, exp: nowSeconds + 3 * 60, aud: '/admin/' }, Buffer.from(secret, 'hex'), {
    algorithm: 'HS256',
    keyid: id,
  });
}
