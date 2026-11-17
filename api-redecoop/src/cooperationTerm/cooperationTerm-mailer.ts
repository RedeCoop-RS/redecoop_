import { Injectable } from '@nestjs/common';
import { EmailService } from '@/email/services/email.service';
import { CooperationTermRecipient } from './entities/cooperationTermEmailLog.entity';

export interface CooperationTermMailInput {
  recipients: CooperationTermRecipient[];
  subject: string;
  html: string;
  attachments: { filename: string; content: Buffer; contentType: string }[];
}

/**
 * Envio do termo firmado.
 *
 * Usa o EmailService do main (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM).
 * Sem SMTP_HOST o método não abre conexão e devolve o motivo. O service só chama
 * este método depois que o administrador confirma o envio na interface.
 * Testes automatizados não devem apontar SMTP_HOST para um servidor real.
 */
@Injectable()
export class CooperationTermMailer {
  constructor(private readonly emailService: EmailService) {}

  isConfigured(): boolean {
    return Boolean(process.env.SMTP_HOST?.trim());
  }

  async dispatch(input: CooperationTermMailInput): Promise<{ sent: boolean; detail: string }> {
    if (!this.isConfigured()) {
      return {
        sent: false,
        detail:
          'SMTP não configurado. Defina SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS e SMTP_FROM para enviar. A integração já chama EmailService.sendEmail após a confirmação do administrador.',
      };
    }

    for (const recipient of input.recipients) {
      await this.emailService.sendEmail({
        to: recipient.email,
        subject: input.subject,
        body: input.html,
        attachments: input.attachments,
      });
    }

    return { sent: true, detail: `Enviado para ${input.recipients.length} destinatário(s).` };
  }
}
