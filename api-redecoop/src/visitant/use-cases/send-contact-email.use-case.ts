import { Injectable } from '@nestjs/common';
import { EmailService } from '../../email/services/email.service';
import { ContactVisitantDto } from '../Dtos/contact-visitant.dto';

@Injectable()
export class SendContactEmailUseCase {
  constructor(private readonly emailService: EmailService) {}

  async execute(contactData: ContactVisitantDto) {
    const emailContent = `
      <h2>Novo contato recebido</h2>
      <p><strong>Nome:</strong> ${contactData.name}</p>
      <p><strong>E-mail:</strong> ${contactData.email}</p>
      <p><strong>Telefone:</strong> ${contactData.phone}</p>
      
      <h3>Mensagem:</h3>
      <p>${contactData.message}</p>
    `;

    await this.emailService.sendEmail({
      to: 'redecoop.rs@gmail.com',
      subject: `[Contato Site] ${contactData.subject}`,
      body: emailContent
    });

    return { 
      success: true, 
      message: 'Mensagem enviada com sucesso' 
    };
  }
}