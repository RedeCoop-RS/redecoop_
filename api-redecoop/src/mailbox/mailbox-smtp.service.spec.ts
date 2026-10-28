import { simpleParser } from 'mailparser';
import { MailboxSmtpService } from './mailbox-smtp.service';

const sendMail = jest.fn();
jest.mock('nodemailer', () => {
  const actual = jest.requireActual('nodemailer');
  return {
    ...actual,
    createTransport: jest.fn(() => ({ sendMail, close: jest.fn(), verify: jest.fn() })),
  };
});

const creds = {
  email: 'admin@redecoop.test',
  imapHost: 'mail.redecoop.test',
  imapPort: 993,
  imapSecure: true,
  smtpHost: 'mail.redecoop.test',
  smtpPort: 465,
  smtpSecure: true,
  username: 'admin@redecoop.test',
  password: 'segredo',
};

describe('MailboxSmtpService', () => {
  beforeEach(() => {
    sendMail.mockReset();
    sendMail.mockResolvedValue({ messageId: '<id@redecoop.test>' });
  });

  it('não vaza o Cco para os destinatários, mas guarda na cópia de Enviados', async () => {
    const service = new MailboxSmtpService();
    const result = await service.send(creds, {
      from: 'admin@redecoop.test',
      to: ['ana@redecoop.test'],
      cc: ['bruno@redecoop.test'],
      bcc: ['oculto@redecoop.test'],
      subject: 'Reunião de ação',
      html: '<p>Olá</p>',
      text: 'Olá',
      messageId: '<id@redecoop.test>',
      priority: 'high',
      receiptTo: 'admin@redecoop.test',
    });

    const delivered = sendMail.mock.calls[0][0];
    expect(delivered.envelope.to).toContain('oculto@redecoop.test');
    const wire = delivered.raw.toString();
    expect(wire).not.toMatch(/^bcc:/im);
    expect(wire).not.toContain('oculto@redecoop.test');
    expect(result.sentCopy.toString()).toMatch(/^bcc: oculto@redecoop\.test/im);

    const parsed = await simpleParser(delivered.raw);
    expect(parsed.subject).toBe('Reunião de ação');
    expect(wire).toMatch(/^X-Priority: 1 \(Highest\)/m);
    expect(wire).toMatch(/^Importance: High/m);
    expect(wire).toMatch(/^Disposition-Notification-To: admin@redecoop\.test/m);
  });

  it('marca imagens com cid como inline', async () => {
    const service = new MailboxSmtpService();
    await service.send(creds, {
      from: 'admin@redecoop.test',
      to: ['ana@redecoop.test'],
      subject: 'Foto',
      html: '<img src="cid:img-1@redecoop.test">',
      text: '',
      messageId: '<foto@redecoop.test>',
      attachments: [
        {
          filename: 'imagem-1.png',
          content: Buffer.from('png'),
          contentType: 'image/png',
          cid: 'img-1@redecoop.test',
        },
      ],
    });
    const parsed = await simpleParser(sendMail.mock.calls[0][0].raw);
    expect(parsed.attachments[0].contentId).toBe('<img-1@redecoop.test>');
    expect(parsed.attachments[0].contentDisposition).toBe('inline');
  });
});
