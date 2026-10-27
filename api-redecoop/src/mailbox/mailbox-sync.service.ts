import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ImapFlow } from 'imapflow';
import { onMailboxAccountChanged } from './mailbox.hooks';
import { MailboxImapService } from './mailbox-imap.service';
import { MailboxService } from './mailbox.service';

@Injectable()
export class MailboxSyncService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MailboxSyncService.name);
  private timer: NodeJS.Timeout | null = null;
  private debounce: NodeJS.Timeout | null = null;
  private idleClient: ImapFlow | null = null;
  private stopped = false;
  private generation = 0;
  private wake: (() => void) | null = null;
  private unsubscribe: (() => void) | null = null;

  constructor(
    private readonly mailbox: MailboxService,
    private readonly imap: MailboxImapService,
  ) {}

  onModuleInit() {
    this.unsubscribe = onMailboxAccountChanged(() => this.restartIdle());
    this.timer = setInterval(() => void this.mailbox.syncQuiet(false), 15000);
    void this.mailbox.syncQuiet(false);
    void this.idleLoop();
  }

  onModuleDestroy() {
    this.stopped = true;
    this.generation += 1;
    if (this.timer) clearInterval(this.timer);
    if (this.debounce) clearTimeout(this.debounce);
    this.unsubscribe?.();
    this.wake?.();
    this.closeIdle();
  }

  private restartIdle() {
    this.generation += 1;
    this.wake?.();
    this.closeIdle();
  }

  private closeIdle() {
    const client = this.idleClient;
    this.idleClient = null;
    if (!client) return;
    try {
      client.close();
    } catch {
      // A conexão já pode ter caído.
    }
  }

  private async idleLoop() {
    let generation = this.generation;
    while (!this.stopped) {
      generation = this.generation;
      let client: ImapFlow | null = null;
      try {
        const creds = await this.mailbox.getIdleCredentials();
        if (!creds || this.stopped || generation !== this.generation) {
          await this.sleep(4000);
          continue;
        }
        client = this.imap.createClient(creds, true);
        this.idleClient = client;
        client.on('error', (error) => this.logger.warn(`IDLE: ${error.message.slice(0, 180)}`));
        client.on('exists', () => this.scheduleSync());
        client.on('expunge', () => this.scheduleSync());
        await client.connect();
        if (this.stopped || generation !== this.generation) continue;
        await client.mailboxOpen('INBOX');
        while (!this.stopped && generation === this.generation && client.usable) {
          await client.idle();
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.warn(`Conexão IDLE interrompida: ${message.slice(0, 180)}`);
        await this.sleep(generation !== this.generation ? 500 : 10000);
      } finally {
        if (client) {
          try {
            if (client.usable) await client.logout();
            else client.close();
          } catch {
            client.close();
          }
        }
        if (this.idleClient === client) this.idleClient = null;
      }
    }
  }

  private scheduleSync() {
    if (this.debounce) clearTimeout(this.debounce);
    this.debounce = setTimeout(() => void this.mailbox.syncQuiet(true), 2000);
  }

  private sleep(ms: number) {
    return new Promise<void>((resolve) => {
      const timer = setTimeout(() => {
        if (this.wake) this.wake = null;
        resolve();
      }, ms);
      this.wake = () => {
        clearTimeout(timer);
        this.wake = null;
        resolve();
      };
    });
  }
}
