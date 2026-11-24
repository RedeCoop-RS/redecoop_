export function termMessage(term: {
  name: string;
  processNumber: string;
  buyerInstitution: string;
}): string {
  return [
    'Olá,',
    '',
    `A RedeCoop encaminha o termo de cooperação firmado ${term.name}, processo ${term.processNumber}, da instituição ${term.buyerInstitution}.`,
    '',
    'O documento, com o calendário de entregas, segue em anexo em PDF e Excel.',
  ].join('\n');
}

export function divisionMessage(term: {
  name: string;
  processNumber: string;
  buyerInstitution: string;
}): string {
  return [
    'Olá,',
    '',
    `A RedeCoop encaminha a planilha de divisão das quantidades do edital ${term.name}, processo ${term.processNumber}, da instituição ${term.buyerInstitution}.`,
    '',
    'A cota de cada cooperativa está na coluna Quantidade p/ cotação. Use a planilha para elaborar o projeto de venda. O calendário de entregas será definido na próxima reunião.',
  ].join('\n');
}

export function messageToHtml(text: string): string {
  return text
    .trim()
    .split(/\n{2,}/)
    .filter((part) => part.trim())
    .map((part) => `<p>${escapeHtml(part).replace(/\n/g, '<br>')}</p>`)
    .join('');
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
