import {
  decodePreviewPart,
  headerFlags,
  previewPart,
  priorityFromHeaders,
  parseRawHeaders,
  unsubscribeFromHeader,
} from './headers';

describe('headers', () => {
  it('lê prioridade por X-Priority e Importance', () => {
    expect(priorityFromHeaders(parseRawHeaders('X-Priority: 1 (Highest)\r\n'))).toBe('high');
    expect(priorityFromHeaders(parseRawHeaders('Importance: low\r\n'))).toBe('low');
    expect(priorityFromHeaders(parseRawHeaders('Subject: oi\r\n'))).toBe('normal');
  });

  it('prefere https no List-Unsubscribe e ignora esquemas perigosos', () => {
    expect(
      unsubscribeFromHeader('<mailto:sair@lista.com?subject=sair>, <https://lista.com/sair?id=1>'),
    ).toBe('https://lista.com/sair?id=1');
    expect(unsubscribeFromHeader('<mailto:sair@lista.com>')).toBe('mailto:sair@lista.com');
    expect(unsubscribeFromHeader('<javascript:alert(1)>')).toBeUndefined();
    expect(unsubscribeFromHeader('<http://inseguro.com/sair>')).toBeUndefined();
  });

  it('junta cabeçalhos dobrados e lê o pedido de confirmação', () => {
    const flags = headerFlags(
      'List-Unsubscribe: <mailto:a@b.com>,\r\n <https://b.com/u>\r\nDisposition-Notification-To: Ana <Ana@Redecoop.test>\r\n',
    );
    expect(flags.listUnsubscribe).toBe('https://b.com/u');
    expect(flags.receiptTo).toBe('ana@redecoop.test');
  });

  it('decodifica prévias em base64, quoted-printable e latin1', () => {
    const base64 = Buffer.from(Buffer.from('Olá, ação confirmada').toString('base64'));
    expect(decodePreviewPart(base64, 'base64', 'utf-8', false)).toBe('Olá, ação confirmada');
    expect(decodePreviewPart(Buffer.from('Ol=C3=A1 =\r\nmundo'), 'quoted-printable', 'utf-8', false)).toBe(
      'Olá mundo',
    );
    expect(decodePreviewPart(Buffer.from([0x63, 0x6f, 0x72, 0xe7, 0xe3, 0x6f]), '8bit', 'iso-8859-1', false)).toBe(
      'corção',
    );
    expect(decodePreviewPart(Buffer.from('<p>Oi <b>Ana</b></p><style>x{}</style>'), '7bit', 'utf-8', true).trim()).toMatch(
      /^Oi\s+Ana$/,
    );
  });

  it('escolhe a parte de texto que não é anexo', () => {
    const part = previewPart({
      type: 'multipart/mixed',
      childNodes: [
        {
          type: 'multipart/alternative',
          childNodes: [
            { part: '1.1', type: 'text/plain', encoding: 'base64', parameters: { charset: 'utf-8' } },
            { part: '1.2', type: 'text/html' },
          ],
        },
        { part: '2', type: 'text/plain', disposition: 'attachment' },
      ],
    });
    expect(part).toEqual({ part: '1.1', encoding: 'base64', charset: 'utf-8', html: false });
    expect(previewPart({ type: 'text/html', part: '1' })?.html).toBe(true);
  });
});
