import { toAccountView } from './account.presenter';
import { MailboxAccount } from '../entities/mailbox-account.entity';

describe('toAccountView', () => {
  it('nunca devolve a senha nem o texto cifrado', () => {
    const account = {
      id: 4,
      label: 'Caixa principal',
      email: 'contato@redecooprs.com.br',
      displayName: 'RedeCoop',
      imapHost: 'imap.hostinger.com',
      imapPort: 993,
      imapSecure: true,
      smtpHost: 'smtp.hostinger.com',
      smtpPort: 465,
      smtpSecure: true,
      username: 'contato@redecooprs.com.br',
      passwordCipher: 'v1:segredo-cifrado',
      signatureHtml: '<p>Att</p>',
      syncIntervalSeconds: 60,
      lastSyncAt: null,
      lastError: null,
    } as MailboxAccount & { password?: string };
    account.password = 'senha-plana';

    const view = toAccountView(account, 2);
    expect(view.configured).toBe(true);
    expect(view.hasPassword).toBe(true);
    expect(view.unread).toBe(2);
    expect(view).not.toHaveProperty('password');
    expect(view).not.toHaveProperty('passwordCipher');
    expect(JSON.stringify(view)).not.toContain('senha-plana');
    expect(JSON.stringify(view)).not.toContain('segredo-cifrado');
  });

  it('indica caixa não configurada', () => {
    expect(toAccountView(null, 0)).toEqual({ configured: false, hasPassword: false, unread: 0 });
  });
});
