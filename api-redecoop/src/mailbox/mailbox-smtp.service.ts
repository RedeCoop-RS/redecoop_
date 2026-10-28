import { Injectable } from '@nestjs/common';
import { createTransport, SendMailOptions } from 'nodemailer';
import MailComposer = require('nodemailer/lib/mail-composer');
import { tlsRejectUnauthorized } from './mailbox.constants';
import { MailboxCredentials, OutgoingMail } from './mailbox.types';

@Injectable()
export class MailboxSmtpService {
  private transportOptions(creds: MailboxCredentials) {
    return {
      host: creds.smtpHost,
      port: creds.smtpPort,
      secure: creds.smtpSecure,
      auth: { user: creds.username, pass: creds.password },
      tls: { rejectUnauthorized: tlsRejectUnauthorized() },
      connectionTimeout: 20000,
      greetingTimeout: 15000,
      socketTimeout: 120000,
      requireTLS: !creds.smtpSecure,
    };
  }

  async verify(creds: MailboxCredentials): Promise<void> {
    const transporter = createTransport(this.transportOptions(creds));
    try {
      await transporter.verify();
    } finally {
      transporter.close();
    }
  }

  /**
   * `raw` vai para os destinatários e nunca leva o cabeçalho Bcc.
   * `sentCopy` é a cópia da pasta Enviados, a única que mantém o Bcc.
   */
  async send(
    creds: MailboxCredentials,
    mail: OutgoingMail,
  ): Promise<{ messageId: string; raw: Buffer; sentCopy: Buffer }> {
    const options = this.toOptions(mail);
    const date = new Date();
    const raw = await this.compile({ ...options, date }, false);
    const sentCopy = mail.bcc?.length ? await this.compile({ ...options, date }, true) : raw;
    const transporter = createTransport(this.transportOptions(creds));
    const recipients = [...mail.to, ...(mail.cc || []), ...(mail.bcc || [])];
    try {
      const info = await transporter.sendMail({
        envelope: { from: creds.email || creds.username, to: recipients },
        raw,
      });
      return { messageId: info.messageId || mail.messageId, raw, sentCopy };
    } finally {
      transporter.close();
    }
  }

  async compileOnly(mail: OutgoingMail): Promise<Buffer> {
    return this.compile(this.toOptions(mail), true);
  }

  private toOptions(mail: OutgoingMail): SendMailOptions {
    const headers: Record<string, string> = {};
    if (mail.receiptTo) headers['Disposition-Notification-To'] = mail.receiptTo;
    // `priority` e `attachDataUrls` são tratados pelo transporte do nodemailer, não
    // pelo MailComposer que monta a mensagem aqui; por isso os cabeçalhos vão à mão.
    if (mail.priority === 'high') {
      headers['X-Priority'] = '1 (Highest)';
      headers['X-MSMail-Priority'] = 'High';
      headers.Importance = 'High';
    } else if (mail.priority === 'low') {
      headers['X-Priority'] = '5 (Lowest)';
      headers['X-MSMail-Priority'] = 'Low';
      headers.Importance = 'Low';
    }
    return {
      from: mail.from,
      to: mail.to,
      cc: mail.cc?.length ? mail.cc : undefined,
      bcc: mail.bcc?.length ? mail.bcc : undefined,
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
      messageId: mail.messageId,
      inReplyTo: mail.inReplyTo || undefined,
      references: mail.references || undefined,
      headers,
      attachments: (mail.attachments || []).map((file) => ({
        filename: file.filename,
        content: file.content,
        contentType: file.contentType,
        cid: file.cid || undefined,
        contentDisposition: file.cid ? ('inline' as const) : ('attachment' as const),
      })),
    };
  }

  private async compile(options: SendMailOptions, keepBcc: boolean): Promise<Buffer> {
    const compiled = new MailComposer(options).compile();
    compiled.keepBcc = keepBcc;
    return compiled.build();
  }
}
