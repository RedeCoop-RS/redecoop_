import { normalizeSubject, threadKey } from './thread';

describe('threadKey', () => {
  it('agrupa pela primeira referência e ignora prefixos de resposta', () => {
    expect(normalizeSubject('Re: Re: Enc: Pedido')).toBe('pedido');
    expect(
      threadKey({
        messageId: '<novo@x>',
        inReplyTo: '<pai@x>',
        references: ['<raiz@x>', '<pai@x>'],
        subject: 'Re: Pedido',
      }),
    ).toBe('raiz@x');
    expect(threadKey({ messageId: '<sozinho@x>', subject: 'Fwd: Pedido' })).toBe('sozinho@x');
    expect(threadKey({ subject: 'Re: Orçamento' })).toBe('subj:orçamento');
  });
});
