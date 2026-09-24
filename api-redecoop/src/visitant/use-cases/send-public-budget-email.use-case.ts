import { Injectable } from '@nestjs/common';
import { EmailService } from '../../email/services/email.service';
import { PublicBudgetDto } from '../Dtos/public-budget.dto';

@Injectable()
export class SendPublicBudgetEmailUseCase {
  constructor(private readonly emailService: EmailService) {}

  async execute(budgetData: PublicBudgetDto, files?: Express.Multer.File[]) {
    const emailContent = `
      <h2>Nova solicitação de orçamento</h2>
      <p><strong>Nome:</strong> ${budgetData.name}</p>
      <p><strong>E-mail:</strong> ${budgetData.email}</p>
      <p><strong>Telefone:</strong> ${budgetData.phone}</p>
      
      <h3>Mensagem:</h3>
      <p>${budgetData.message}</p>
      
      <p><em>Solicitação enviada pelo site (formulário público)</em></p>
    `;

    const attachments = files?.map((file) => ({
      filename: file.originalname,
      content: file.buffer,
      contentType: file.mimetype,
    }));

    await this.emailService.sendEmail({
      to: 'redecoop.rs@gmail.com',
      subject: `[Orçamento Site] ${budgetData.subject}`,
      body: emailContent,
      attachments,
    });

    return {
      success: true,
      message: 'Solicitação de orçamento enviada com sucesso',
      data: {
        subject: budgetData.subject,
        files: files ? files.map((file) => file.originalname) : [],
      },
    };
  }
}
