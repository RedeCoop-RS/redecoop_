import { MailboxSpecialUse } from '../mailbox.constants';

export interface FolderClassificationInput {
  path: string;
  name?: string | null;
  specialUse?: string | null;
  flags?: string[] | null;
}

function fold(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function leaf(path: string, name?: string | null): string {
  const source = (name || path || '').trim();
  const parts = source.split(/[/.]/).filter(Boolean);
  return fold(parts[parts.length - 1] || source);
}

export function classifyFolder(input: FolderClassificationInput): MailboxSpecialUse {
  const special = fold(input.specialUse || '');
  const flags = fold((input.flags || []).join(' '));
  const blob = `${special} ${flags}`;
  const pathUpper = (input.path || '').trim().toUpperCase();

  if (blob.includes('\\inbox') || pathUpper === 'INBOX') return 'inbox';
  if (blob.includes('\\sent')) return 'sent';
  if (blob.includes('\\drafts')) return 'drafts';
  if (blob.includes('\\trash') || blob.includes('\\deleted')) return 'trash';
  if (blob.includes('\\junk') || blob.includes('\\spam')) return 'spam';
  if (blob.includes('\\archive')) return 'archive';

  const name = leaf(input.path, input.name);
  const rules: Array<[MailboxSpecialUse, string[]]> = [
    ['inbox', ['inbox', 'caixa de entrada']],
    ['sent', ['sent', 'sent items', 'sent messages', 'enviados', 'enviadas', 'itens enviados']],
    ['drafts', ['drafts', 'draft', 'rascunhos', 'rascunho']],
    ['trash', ['trash', 'deleted', 'bin', 'lixeira', 'lixo', 'itens excluidos', 'excluidos']],
    ['spam', ['spam', 'junk', 'lixo eletronico', 'indesejado', 'correo no deseado']],
    ['archive', ['archive', 'arquivo', 'archived']],
  ];

  for (const [use, names] of rules) {
    if (names.includes(name)) return use;
  }
  return 'other';
}

export function specialUseOrder(use: string): number {
  const order = ['inbox', 'sent', 'drafts', 'archive', 'spam', 'trash', 'other'];
  const index = order.indexOf(use);
  return index === -1 ? order.length : index;
}

export interface StructureNode {
  disposition?: string | null;
  type?: string | null;
  childNodes?: StructureNode[] | null;
  dispositionParameters?: Record<string, string> | null;
  parameters?: Record<string, string> | null;
}

export function structureHasAttachment(node?: StructureNode | null): boolean {
  if (!node) return false;
  const disposition = (node.disposition || '').toLowerCase();
  const filename = node.dispositionParameters?.filename || node.parameters?.name;
  const type = (node.type || '').toLowerCase();
  if (disposition === 'attachment') return true;
  if (filename && type && !type.startsWith('multipart/') && disposition !== 'inline') return true;
  return (node.childNodes || []).some((child) => structureHasAttachment(child));
}
