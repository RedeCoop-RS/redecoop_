import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MailboxAccount } from './entities/mailbox-account.entity';
import { MailboxFolder } from './entities/mailbox-folder.entity';
import { MailboxMessage } from './entities/mailbox-message.entity';
import { MailboxDraft } from './entities/mailbox-draft.entity';
import { MailboxDraftAttachment } from './entities/mailbox-draft-attachment.entity';
import { MailboxAuditLog } from './entities/mailbox-audit-log.entity';
import { MailboxCryptoService } from './crypto/mailbox-crypto.service';
import { MailboxRateLimitService } from './security/mailbox-rate-limit.service';
import { MailboxSuperAdminGuard } from './security/mailbox-super-admin.guard';
import { MailboxImapService } from './mailbox-imap.service';
import { MailboxSmtpService } from './mailbox-smtp.service';
import { MailboxService } from './mailbox.service';
import { MailboxSyncService } from './mailbox-sync.service';
import { MailboxController } from './mailbox.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      MailboxAccount,
      MailboxFolder,
      MailboxMessage,
      MailboxDraft,
      MailboxDraftAttachment,
      MailboxAuditLog,
    ]),
  ],
  controllers: [MailboxController],
  providers: [
    MailboxCryptoService,
    MailboxRateLimitService,
    MailboxSuperAdminGuard,
    MailboxImapService,
    MailboxSmtpService,
    MailboxService,
    MailboxSyncService,
  ],
})
export class MailboxModule {}
