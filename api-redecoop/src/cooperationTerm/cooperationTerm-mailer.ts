import { Injectable } from '@nestjs/common';
import { EmailService } from '@/email/services/email.service';
import { CooperationTermRecipient } from './entities/cooperationTermEmailLog.entity';

export interface CooperationTermMailResult {
  email: string;
  name: string;
  kind: CooperationTermRecipient['kind'];
  sent: boolean;
  detail: string;
}

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

  async dispatch(
    input: CooperationTermMailInput,
  ): Promise<{ sent: boolean; detail: string; results: CooperationTermMailResult[] }> {
    if (!this.isConfigured()) {
      const detail =
        'SMTP não configurado. Defina SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS e SMTP_FROM para enviar.';
      return {
        sent: false,
        detail,
        results: input.recipients.map((recipient) => ({
          email: recipient.email,
          name: recipient.name,
          kind: recipient.kind,
          sent: false,
          detail: 'SMTP não configurado.',
        })),
      };
    }

    const results: CooperationTermMailResult[] = [];
    for (const recipient of input.recipients) {
      try {
        await this.emailService.sendEmail({
          to: recipient.email,
          subject: input.subject,
          body: input.html,
          attachments: input.attachments,
        });
        results.push({
          email: recipient.email,
          name: recipient.name,
          kind: recipient.kind,
          sent: true,
          detail: 'Enviado.',
        });
      } catch (error) {
        results.push({
          email: recipient.email,
          name: recipient.name,
          kind: recipient.kind,
          sent: false,
          detail: error instanceof Error ? error.message : 'Não enviado.',
        });
      }
    }

    const sentCount = results.filter((result) => result.sent).length;
    const sent = sentCount === results.length && results.length > 0;
    const detail = sent
      ? `Enviado para ${sentCount} destinatário(s).`
      : `Enviado para ${sentCount} de ${results.length} destinatário(s).`;
    return { sent, detail, results };
  }
}
