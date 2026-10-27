const SUBJECT_PREFIX = /^(re|fw|fwd|enc|res|rv|aw|sv|tr|ant)\s*:\s*/i;

export function normalizeSubject(subject?: string | null): string {
  let value = (subject || '').replace(/\s+/g, ' ').trim();
  let previous = '';
  while (value && value !== previous) {
    previous = value;
    value = value.replace(SUBJECT_PREFIX, '').trim();
  }
  return value.toLowerCase();
}

function referenceList(references?: string[] | string | null): string[] {
  if (!references) return [];
  const source = Array.isArray(references) ? references.join(' ') : references;
  return source
    .split(/\s+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function threadKey(input: {
  messageId?: string | null;
  inReplyTo?: string | null;
  references?: string[] | string | null;
  subject?: string | null;
}): string {
  const refs = referenceList(input.references);
  const root = refs[0] || input.inReplyTo || input.messageId;
  if (root) return root.replace(/[<>]/g, '').trim().toLowerCase();
  const subject = normalizeSubject(input.subject);
  return subject ? `subj:${subject}` : 'sem-assunto';
}

export function snippetFromText(value?: string | null, max = 180): string {
  const text = (value || '').replace(/\s+/g, ' ').trim();
  if (!text) return '';
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}
