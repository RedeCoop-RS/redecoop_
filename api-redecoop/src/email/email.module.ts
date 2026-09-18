import { Global, Module } from '@nestjs/common';
import { EmailService } from './services/email.service';
import { MailerModule } from '@nestjs-modules/mailer';

@Global()
@Module({
  imports: [
    MailerModule.forRootAsync({
      useFactory: async () => ({
        defaults: { from: process.env.SMTP_FROM },
        transport: {
          port: Number(process.env.SMTP_PORT || 465),
          host: process.env.SMTP_HOST,
          secure: Number(process.env.SMTP_PORT || 465) === 465,
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
          tls: {
            rejectUnauthorized: process.env.SMTP_REJECT_UNAUTHORIZED === 'true',
          },
        },
      }),
    }),
  ],
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}
