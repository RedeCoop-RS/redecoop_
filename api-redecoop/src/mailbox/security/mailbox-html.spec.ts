import { htmlToText, sanitizeMailboxHtml, withSignature } from './mailbox-html';

describe('sanitizeMailboxHtml', () => {
  const dirty = `
    <p onclick="alert(1)">Olá</p>
    <script>alert('x')</script>
    <a href="javascript:alert(1)">link</a>
    <img src="https://evil.test/pixel.png" onerror="alert(1)" alt="remota" />
    <img src="data:image/gif;base64,R0lGODlhAQABAAAAACw=" alt="local" />
  `;

  it('remove script e bloqueia imagem remota por padrão', () => {
    const result = sanitizeMailboxHtml(dirty, { allowRemoteImages: false });
    expect(result.html).not.toContain('<script');
    expect(result.html).not.toContain('onclick');
    expect(result.html).not.toContain('onerror');
    expect(result.html).not.toContain('javascript:');
    expect(result.html).not.toContain('https://evil.test/pixel.png');
    expect(result.html).toContain('data:image/gif');
    expect(result.remoteImageCount).toBe(1);
  });

  it('permite imagem remota quando solicitado', () => {
    const result = sanitizeMailboxHtml(dirty, { allowRemoteImages: true });
    expect(result.html).toContain('https://evil.test/pixel.png');
    expect(result.html).not.toContain('<script');
  });

  it('anexa a assinatura uma única vez', () => {
    const html = withSignature('<p>Oi</p>', '<b>Equipe</b><script>x</script>', true);
    expect(html).toContain('data-mailbox-signature');
    expect(html).toContain('Equipe');
    expect(html).not.toContain('<script');
    expect(
      withSignature(html, '<b>Equipe</b>', true).match(/data-mailbox-signature/g),
    ).toHaveLength(1);
  });

  it('converte HTML em texto', () => {
    expect(htmlToText('<p>Olá<br>rede</p>')).toBe('Olá\nrede');
  });
});
