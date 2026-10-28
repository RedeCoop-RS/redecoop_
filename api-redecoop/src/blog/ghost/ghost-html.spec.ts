import { readingStats, sanitizeBlogHtml } from './ghost-html';

describe('HTML do blog', () => {
  it('remove script e iframe de origem desconhecida', () => {
    const clean = sanitizeBlogHtml(
      '<p>Olá</p><script>alert(1)</script><iframe src="https://evil.example/x"></iframe><iframe src="https://www.youtube.com/embed/abc"></iframe>',
    );
    expect(clean).toContain('<p>Olá</p>');
    expect(clean).not.toContain('script');
    expect(clean).not.toContain('evil.example');
    expect(clean).toContain('youtube.com/embed/abc');
  });

  it('mantém tabela, citação, código, imagem https e callout', () => {
    const clean = sanitizeBlogHtml(
      '<h2>Título</h2><blockquote><p>Citação</p></blockquote><pre><code>const a = 1</code></pre><img src="https://cdn.example/a.png" alt="foto"><table><tr><td>1</td></tr></table><div class="kg-callout-card"><div class="kg-callout-text"><p>Nota</p></div></div>',
    );
    expect(clean).toContain('<h2>Título</h2>');
    expect(clean).toContain('<blockquote>');
    expect(clean).toContain('<code>');
    expect(clean).toContain('cdn.example/a.png');
    expect(clean).toContain('<table>');
    expect(clean).toContain('kg-callout-card');
  });

  it('conta palavras e tempo de leitura', () => {
    expect(readingStats('<p>um dois três</p>')).toEqual({ wordCount: 3, readingTime: 1 });
    expect(readingStats('')).toEqual({ wordCount: 0, readingTime: 0 });
  });
});
