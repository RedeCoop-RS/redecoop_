import { CooperationTermMailer } from './cooperationTerm-mailer';

describe('CooperationTermMailer', () => {
  const email = { sendEmail: jest.fn() };
  const mailer = new CooperationTermMailer(email as never);
  const original = process.env.SMTP_HOST;

  afterEach(() => {
    email.sendEmail.mockReset();
    if (original === undefined) delete process.env.SMTP_HOST;
    else process.env.SMTP_HOST = original;
  });

  it('não envia e-mail real quando o SMTP não está configurado', async () => {
    delete process.env.SMTP_HOST;
    const result = await mailer.dispatch({
      recipients: [{ email: 'coop@example.com', name: 'CAAF', kind: 'cooperative' }],
      subject: 'Termo',
      html: '<p>Termo</p>',
      attachments: [],
    });
    expect(result.sent).toBe(false);
    expect(email.sendEmail).not.toHaveBeenCalled();
  });

  it('chama o EmailService só quando há SMTP configurado', async () => {
    process.env.SMTP_HOST = 'smtp.invalid';
    email.sendEmail.mockResolvedValue(undefined);
    const result = await mailer.dispatch({
      recipients: [{ email: 'coop@example.com', name: 'CAAF', kind: 'cooperative' }],
      subject: 'Termo',
      html: '<p>Termo</p>',
      attachments: [],
    });
    expect(result.sent).toBe(true);
    expect(email.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'coop@example.com', subject: 'Termo' }),
    );
  });
});
