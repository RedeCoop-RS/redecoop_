import { MailerService } from '@nestjs-modules/mailer';
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { EmailTemplates } from '../templates/email.template';

@Injectable()
export class EmailService {
  constructor(private readonly mailService: MailerService) {}

  async sendEmail({
    to,
    subject,
    body,
    attachments
  }: {
    to: string;
    subject: string;
    body?: string;
    attachments?: Array<{ filename: string; content: Buffer; contentType?: string }>;
  }) {
    try {
      let htmlBody = body ? EmailTemplates.getBasicTemplate(body) : '';

      await this.mailService.sendMail({ 
        to, 
        subject, 
        html: htmlBody,
        attachments: attachments?.map(attachment => ({
          filename: attachment.filename,
          content: attachment.content,
          contentType: attachment.contentType
        }))
      });
    } catch (e) {
      throw new InternalServerErrorException('Falha ao enviar e-mail', e.message);
    }
  }
}
