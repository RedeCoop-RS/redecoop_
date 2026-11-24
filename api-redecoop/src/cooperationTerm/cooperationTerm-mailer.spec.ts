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
    expect(result.results).toEqual([
      expect.objectContaining({ email: 'coop@example.com', sent: false }),
    ]);
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
    expect(result.results[0]).toMatchObject({ email: 'coop@example.com', sent: true });
  });

  it('segue para o próximo destinatário quando um envio falha', async () => {
    process.env.SMTP_HOST = 'smtp.invalid';
    email.sendEmail.mockRejectedValueOnce(new Error('Falha ao enviar e-mail')).mockResolvedValueOnce(undefined);
    const result = await mailer.dispatch({
      recipients: [
        { email: 'a@example.com', name: 'A', kind: 'cooperative' },
        { email: 'b@example.com', name: 'B', kind: 'cooperative' },
      ],
      subject: 'Termo',
      html: '<p>Termo</p>',
      attachments: [],
    });
    expect(result.sent).toBe(false);
    expect(result.results.map((item) => item.sent)).toEqual([false, true]);
  });
});
