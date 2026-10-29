import { verify, decode } from 'jsonwebtoken';
import { GhostApiError } from './ghost-api.error';
import { assertGhostAdminKey, createGhostAdminJwt } from './ghost-jwt';

const id = 'a'.repeat(24);
const secret = 'ab'.repeat(32);
const key = `${id}:${secret}`;

describe('Ghost Admin JWT', () => {
  it('assina com kid, aud /admin/ e expira em 3 minutos', () => {
    const now = Math.floor(Date.now() / 1000);
    const token = createGhostAdminJwt(key, now);
    const decoded = decode(token, { complete: true }) as { header: { kid?: string; alg?: string } };
    expect(decoded.header.kid).toBe(id);
    expect(decoded.header.alg).toBe('HS256');
    const payload = verify(token, Buffer.from(secret, 'hex'), { audience: '/admin/' }) as { iat: number; exp: number };
    expect(payload.exp - payload.iat).toBe(180);
  });

  it('recusa chave fora do formato id:secret', () => {
    expect(() => assertGhostAdminKey('só-um-lado')).toThrow(GhostApiError);
    expect(() => createGhostAdminJwt('não-é-hex:zzzz')).toThrow(/id:secret/);
  });
});
