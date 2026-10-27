import { extractInlineImages } from './inline-images';

const PIXEL =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

describe('extractInlineImages', () => {
  it('troca data: por cid e deduplica imagens iguais', () => {
    const html = `<p>a</p><img alt="x" src="data:image/png;base64,${PIXEL}"><img src='data:image/png;base64,${PIXEL}'>`;
    const result = extractInlineImages(html, 'redecoop.test', 1024 * 1024);
    expect(result.attachments).toHaveLength(1);
    const cid = result.attachments[0].cid;
    expect(cid).toMatch(/@redecoop\.test$/);
    expect(result.html).toContain(`src="cid:${cid}"`);
    expect(result.html).toContain(`src='cid:${cid}'`);
    expect(result.html).not.toContain('data:image');
    expect(result.attachments[0].contentType).toBe('image/png');
  });

  it('não mexe em SVG nem em imagens remotas', () => {
    const html =
      '<img src="data:image/svg+xml;base64,PHN2Zy8+"><img src="https://exemplo.com/a.png">';
    const result = extractInlineImages(html, 'd', 1024);
    expect(result.attachments).toHaveLength(0);
    expect(result.html).toBe(html);
  });

  it('respeita o limite total', () => {
    const html = `<img src="data:image/png;base64,${PIXEL}">`;
    expect(() => extractInlineImages(html, 'd', 10)).toThrow('INLINE_TOO_LARGE');
  });
});
