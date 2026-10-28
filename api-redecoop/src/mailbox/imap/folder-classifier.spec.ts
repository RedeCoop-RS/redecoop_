import { classifyFolder, structureHasAttachment } from './folder-classifier';

describe('classifyFolder', () => {
  it('reconhece pastas especiais e nomes em português', () => {
    expect(classifyFolder({ path: 'INBOX' })).toBe('inbox');
    expect(classifyFolder({ path: 'INBOX.Sent', name: 'Sent', specialUse: '\\Sent' })).toBe('sent');
    expect(classifyFolder({ path: 'INBOX.Enviados', name: 'Enviados' })).toBe('sent');
    expect(classifyFolder({ path: 'INBOX.Rascunhos', name: 'Rascunhos' })).toBe('drafts');
    expect(classifyFolder({ path: 'INBOX.Lixeira', name: 'Lixeira' })).toBe('trash');
    expect(classifyFolder({ path: 'INBOX.Junk', name: 'Junk', flags: ['\\Junk'] })).toBe('spam');
    expect(classifyFolder({ path: 'Archive', name: 'Arquivo' })).toBe('archive');
    expect(classifyFolder({ path: 'INBOX.Projetos', name: 'Projetos' })).toBe('other');
    expect(
      classifyFolder({
        path: '[Gmail]/Todos os e-mails',
        name: 'Todos os e-mails',
        specialUse: '\\All',
      }),
    ).toBe('other');
  });

  it('detecta anexo na estrutura MIME', () => {
    expect(
      structureHasAttachment({
        type: 'multipart/mixed',
        childNodes: [
          {
            type: 'application/pdf',
            disposition: 'attachment',
            dispositionParameters: { filename: 'a.pdf' },
          },
        ],
      }),
    ).toBe(true);
    expect(structureHasAttachment({ type: 'text/plain' })).toBe(false);
  });
});
