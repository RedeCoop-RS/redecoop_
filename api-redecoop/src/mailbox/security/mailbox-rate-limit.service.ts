import { HttpException, HttpStatus, Injectable } from '@nestjs/common';

@Injectable()
export class MailboxRateLimitService {
  private readonly hits = new Map<string, number[]>();

  consume(key: string, limit: number, windowMs: number): void {
    const now = Date.now();
    const recent = (this.hits.get(key) || []).filter((stamp) => now - stamp < windowMs);
    if (recent.length >= limit) {
      throw new HttpException(
        'Muitas tentativas em pouco tempo. Aguarde um instante e tente de novo.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    recent.push(now);
    this.hits.set(key, recent);
  }

  reset(key?: string) {
    if (key) this.hits.delete(key);
    else this.hits.clear();
  }
}
