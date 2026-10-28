import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

const COLUMNS: Record<string, TableColumn[]> = {
  mailbox_account: [
    new TableColumn({ name: 'signatures', type: 'text', isNullable: true }),
    new TableColumn({ name: 'default_signature_id', type: 'varchar', length: '64', isNullable: true }),
    new TableColumn({ name: 'undo_send_seconds', type: 'int', default: 10 }),
  ],
  mailbox_message: [
    new TableColumn({ name: 'priority', type: 'varchar', length: '8', default: "'normal'" }),
    new TableColumn({ name: 'list_unsubscribe', type: 'varchar', length: '1024', isNullable: true }),
    new TableColumn({ name: 'receipt_to', type: 'varchar', length: '320', isNullable: true }),
    new TableColumn({ name: 'receipt_handled', type: 'tinyint', default: 0 }),
    new TableColumn({ name: 'headers_cached', type: 'tinyint', default: 0 }),
  ],
  mailbox_draft: [
    new TableColumn({ name: 'scheduled_at', type: 'datetime', isNullable: true }),
    new TableColumn({ name: 'scheduled_by_user_id', type: 'int', isNullable: true }),
    new TableColumn({ name: 'sending_at', type: 'datetime', isNullable: true }),
    new TableColumn({ name: 'schedule_error', type: 'varchar', length: '500', isNullable: true }),
    new TableColumn({ name: 'priority', type: 'varchar', length: '8', default: "'normal'" }),
    new TableColumn({ name: 'request_receipt', type: 'tinyint', default: 0 }),
    new TableColumn({ name: 'signature_id', type: 'varchar', length: '64', isNullable: true }),
  ],
  mailbox_draft_attachment: [
    new TableColumn({ name: 'content_id', type: 'varchar', length: '191', isNullable: true }),
  ],
};

export class MailboxWebmail1772100000000 implements MigrationInterface {
  name = 'MailboxWebmail1772100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const [table, columns] of Object.entries(COLUMNS)) {
      for (const column of columns) {
        if (!(await queryRunner.hasColumn(table, column.name))) {
          await queryRunner.addColumn(table, column);
        }
      }
    }
    await queryRunner.query(
      'CREATE INDEX `IDX_mailbox_draft_scheduled` ON `mailbox_draft` (`scheduled_at`)',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX `IDX_mailbox_draft_scheduled` ON `mailbox_draft`');
    for (const [table, columns] of Object.entries(COLUMNS)) {
      for (const column of columns) {
        if (await queryRunner.hasColumn(table, column.name)) {
          await queryRunner.dropColumn(table, column.name);
        }
      }
    }
  }
}
