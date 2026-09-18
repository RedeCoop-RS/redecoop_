import { MailerService } from '@nestjs-modules/mailer';
import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { EmailTemplates } from '../templates/email.template';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(private readonly mailService: MailerService) {}

  async sendEmail({
    to,
    subject,
    body,
    from,
    replyTo,
    text,
    attachments
  }: {
    to: string;
    subject: string;
    body?: string;
    from?: string;
    replyTo?: string;
    text?: string;
    attachments?: Array<{ filename: string; content: Buffer; contentType?: string }>;
  }) {
    try {
      let htmlBody = body ? EmailTemplates.getBasicTemplate(body) : '';

      await this.mailService.sendMail({ 
        to, 
        subject, 
        html: htmlBody,
        ...(from ? { from } : {}),
        ...(replyTo ? { replyTo } : {}),
        ...(text ? { text } : {}),
        attachments: attachments?.map(attachment => ({
          filename: attachment.filename,
          content: attachment.content,
          contentType: attachment.contentType
        }))
      });
    } catch (e) {
      const detail = e instanceof Error ? e.message : String(e);
      this.logger.error(`SMTP falhou: ${detail}`);
      throw new InternalServerErrorException('Falha ao enviar e-mail');
    }
  }
}
