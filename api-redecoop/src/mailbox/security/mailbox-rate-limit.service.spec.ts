import { HttpException } from '@nestjs/common';
import { MailboxRateLimitService } from './mailbox-rate-limit.service';

describe('MailboxRateLimitService', () => {
  it('bloqueia depois do limite na janela', () => {
    const limiter = new MailboxRateLimitService();
    limiter.consume('envio:1', 2, 60_000);
    limiter.consume('envio:1', 2, 60_000);
    expect(() => limiter.consume('envio:1', 2, 60_000)).toThrow(HttpException);
    limiter.consume('envio:2', 2, 60_000);
  });
});
