import { Injectable } from '@nestjs/common';
import { EmailService } from '../../email/services/email.service';
import { ContactVisitantDto } from '../Dtos/contact-visitant.dto';

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

@Injectable()
export class SendContactEmailUseCase {
  constructor(private readonly emailService: EmailService) {}

  async execute(contactData: ContactVisitantDto) {
    const inbox = process.env.CONTACT_INBOX || 'contato@redecooprs.com.br';
    const name = escapeHtml(contactData.name);
    const email = escapeHtml(contactData.email);
    const phone = escapeHtml(contactData.phone);
    const message = escapeHtml(contactData.message).replace(/\n/g, '<br/>');

    const emailContent = `
      <h2>Novo contato recebido pelo site</h2>
      <p><strong>Nome:</strong> ${name}</p>
      <p><strong>E-mail:</strong> ${email}</p>
      <p><strong>Telefone:</strong> ${phone}</p>
      <h3>Mensagem:</h3>
      <p>${message}</p>
    `;

    const text = [
      'Novo contato recebido pelo site RedeCoop RS',
      `Nome: ${contactData.name}`,
      `E-mail: ${contactData.email}`,
      `Telefone: ${contactData.phone}`,
      '',
      'Mensagem:',
      contactData.message,
    ].join('\n');

    await this.emailService.sendEmail({
      to: inbox,
      from: `RedeCoop RS <${inbox}>`,
      subject: `Contato pelo site: ${contactData.subject}`,
      body: emailContent,
      text,
      replyTo: `"${contactData.name.replace(/"/g, '')}" <${contactData.email}>`,
    });

    return { 
      success: true, 
      message: 'Mensagem enviada com sucesso' 
    };
  }
}