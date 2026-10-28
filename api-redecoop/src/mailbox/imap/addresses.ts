import { BadRequestException } from '@nestjs/common';

const EMAIL_RE = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;

export interface MailAddress {
  name?: string;
  address: string;
}

export function parseAddressList(input?: string | string[] | null): MailAddress[] {
  if (!input) return [];
  const raw = Array.isArray(input) ? input.join(',') : input;
  const parts = raw.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/);
  const addresses: MailAddress[] = [];

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const named = trimmed.match(/^(?:"?([^"<]*?)"?\s*)?<([^<>\s]+)>$/);
    const address = (named ? named[2] : trimmed).trim();
    const name = named ? named[1].trim() : '';
    if (!EMAIL_RE.test(address)) {
      throw new BadRequestException(`E-mail inválido: ${address}`);
    }
    addresses.push(name ? { name, address } : { address });
  }

  if (addresses.length > 50) {
    throw new BadRequestException('No máximo 50 destinatários por mensagem.');
  }
  return addresses;
}

export function formatAddress(address: MailAddress): string {
  if (!address.name) return address.address;
  return `"${address.name.replace(/"/g, '')}" <${address.address}>`;
}

export function formatAddressList(addresses: MailAddress[]): string {
  return addresses.map(formatAddress).join(', ');
}

export function sameMailbox(left?: string | null, right?: string | null): boolean {
  return (left || '').trim().toLowerCase() === (right || '').trim().toLowerCase();
}
