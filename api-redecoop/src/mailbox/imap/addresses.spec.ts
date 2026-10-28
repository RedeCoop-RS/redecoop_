import { BadRequestException } from '@nestjs/common';
import { formatAddressList, parseAddressList } from './addresses';

describe('parseAddressList', () => {
  it('aceita nome e vários e-mails', () => {
    const parsed = parseAddressList('Eduardo <eduardo@redecoop.rs>, contato@redecooprs.com.br');
    expect(parsed).toEqual([
      { name: 'Eduardo', address: 'eduardo@redecoop.rs' },
      { address: 'contato@redecooprs.com.br' },
    ]);
    expect(formatAddressList(parsed)).toContain('eduardo@redecoop.rs');
  });

  it('rejeita endereço inválido', () => {
    expect(() => parseAddressList('nao-e-email')).toThrow(BadRequestException);
  });
});
