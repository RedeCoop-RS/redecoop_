// src/email/templates/email.template.ts
export class EmailTemplates {
  static getBasicTemplate(content: string, title?: string) {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
        ${title ? `<h1 style="color: #2c3e50; text-align: center; margin-bottom: 20px;">${title}</h1>` : ''}
        
        <div style="font-size: 16px; line-height: 1.6; color: #34495e;">
          ${content}
        </div>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ecf0f1; text-align: center;">
          <p style="font-size: 12px; color: #95a5a6;">
            © ${new Date().getFullYear()} Redecoop - Todos os direitos reservados.
          </p>
        </div>
      </div>
    `;
  }
}