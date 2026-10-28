import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Com utf8mb4_general_ci, "Ação" e "Acao" colidiam no índice único (account_id, path)
 * e a sincronização de pastas falhava. Caminhos IMAP diferenciam acento e caixa.
 */
export class MailboxFolderPathBinary1772200000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `mailbox_folder` MODIFY `path` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `mailbox_folder` MODIFY `path` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL',
    );
  }
}
