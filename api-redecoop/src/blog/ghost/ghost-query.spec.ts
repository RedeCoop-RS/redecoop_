import { GhostApiError } from './ghost-api.error';
import { buildGhostFilter, ghostOrder } from './ghost-query';

describe('filtros NQL', () => {
  it('escapa aspas da busca para não injetar outro filtro', () => {
    expect(buildGhostFilter({ search: "a'+status:published", status: 'draft', tag: 'safra', author: 'ana' })).toBe(
      "status:draft+tag:safra+author:ana+(title:~'a\\'+status:published',slug:~'a\\'+status:published',custom_excerpt:~'a\\'+status:published')",
    );
  });

  it('ignora status all e recusa ordenação desconhecida', () => {
    expect(buildGhostFilter({ status: 'all' })).toBe('');
    expect(ghostOrder(undefined)).toBe('updated_at desc');
    expect(() => ghostOrder('id;drop')).toThrow(GhostApiError);
    expect(() => buildGhostFilter({ tag: "a'+b" })).toThrow(GhostApiError);
  });
});
