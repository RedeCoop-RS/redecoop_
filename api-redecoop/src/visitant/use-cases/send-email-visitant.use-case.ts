import { Injectable, NotFoundException } from '@nestjs/common';
import { VisitantService } from '../visitant.service';
import { EmailService } from '../../email/services/email.service';
import { EmailVisitantDto } from '../Dtos/emailVisitant.dto';

@Injectable()
export class SendEmailVisitantUseCase {
  constructor(
    private readonly visitantService: VisitantService,
    private readonly emailService: EmailService,
  ) {}

  async execute(userEmail: string, emailData: EmailVisitantDto, files?: Express.Multer.File[]) {
    const visitant = await this.visitantService.findByUserEmail(userEmail);
    
    if (!visitant) {
      throw new NotFoundException('Visitante não encontrado');
    }

    const emailContent = `
      <h2>Informações do Visitante:</h2>
      <p><strong>Nome:</strong> ${visitant.name}</p>
      <p><strong>E-mail:</strong> ${visitant.email}</p>
      <p><strong>Telefone:</strong> ${visitant.phone}</p>
      <p><strong>Endereço:</strong> ${visitant.address}, ${visitant.number}</p>
      <p><strong>Bairro:</strong> ${visitant.neighborhood}</p>
      <p><strong>CEP:</strong> ${visitant.cep}</p>
      ${visitant.city ? `<p><strong>Cidade/UF:</strong> ${visitant.city.name} - ${visitant.city.state?.abbreviation}</p>` : ''}
      
      <h2>Mensagem:</h2>
      <p>${emailData.message}</p>
      
      <p><em>E-mail enviado através do sistema</em></p>
    `;

    const attachments = files?.map(file => ({
      filename: file.originalname,
      content: file.buffer,
      contentType: file.mimetype
    }));

    const inbox = process.env.CONTACT_INBOX || 'contato@redecooprs.com.br';

    await this.emailService.sendEmail({
      to: inbox,
      from: `RedeCoop RS <${inbox}>`,
      subject: `Contato de visitante: ${emailData.subject}`,
      body: emailContent,
      replyTo: `"${(visitant.name ?? '').replace(/"/g, '')}" <${visitant.email}>`,
      attachments
    });

    return { 
      success: true, 
      message: 'E-mail enviado com sucesso',
      data: {
        subject: emailData.subject,
        message: emailData.message,
        files: files ? files.map(file => file.originalname) : []
      }
    };
  }
}