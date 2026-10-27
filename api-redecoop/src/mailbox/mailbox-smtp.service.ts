import { Injectable } from '@nestjs/common';
import { createTransport, SendMailOptions } from 'nodemailer';
import MailComposer from 'nodemailer/lib/mail-composer';
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
      socketTimeout: 30000,
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

  async send(
    creds: MailboxCredentials,
    mail: OutgoingMail,
  ): Promise<{ messageId: string; raw: Buffer }> {
    const raw = await this.compile(this.toOptions(mail));
    const transporter = createTransport(this.transportOptions(creds));
    const recipients = [...mail.to, ...(mail.cc || []), ...(mail.bcc || [])];
    try {
      const info = await transporter.sendMail({
        envelope: { from: creds.email || creds.username, to: recipients },
        raw,
      });
      return { messageId: info.messageId || mail.messageId, raw };
    } finally {
      transporter.close();
    }
  }

  private toOptions(mail: OutgoingMail): SendMailOptions {
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
      attachments: (mail.attachments || []).map((file) => ({
        filename: file.filename,
        content: file.content,
        contentType: file.contentType,
      })),
    };
  }

  private async compile(options: SendMailOptions): Promise<Buffer> {
    const compiled = new MailComposer(options).compile();
    compiled.keepBcc = true;
    return compiled.build();
  }
}
