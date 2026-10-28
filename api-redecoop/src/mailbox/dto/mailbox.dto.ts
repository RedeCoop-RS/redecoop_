import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  IsISO8601,
  Matches,
  ValidateNested,
} from 'class-validator';

export class MailboxSignatureDto {
  @IsString()
  @Matches(/^[a-z0-9-]{1,64}$/i)
  id: string;

  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name: string;

  @IsString()
  @MaxLength(20000)
  html: string;
}

export class UpsertMailboxAccountDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  label?: string;

  @IsEmail()
  @MaxLength(191)
  email: string;

  @IsOptional()
  @IsString()
  @MaxLength(191)
  displayName?: string;

  @IsString()
  @MaxLength(191)
  imapHost: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(65535)
  imapPort: number;

  @IsBoolean()
  imapSecure: boolean;

  @IsString()
  @MaxLength(191)
  smtpHost: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(65535)
  smtpPort: number;

  @IsBoolean()
  smtpSecure: boolean;

  @IsString()
  @MaxLength(191)
  username: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  password?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20000)
  signatureHtml?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(30)
  @Max(3600)
  syncIntervalSeconds?: number;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => MailboxSignatureDto)
  signatures?: MailboxSignatureDto[];

  @IsOptional()
  @IsString()
  @MaxLength(64)
  defaultSignatureId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(30)
  undoSendSeconds?: number;
}

export class TestMailboxDto {
  @IsString()
  @MaxLength(191)
  imapHost: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(65535)
  imapPort: number;

  @IsBoolean()
  imapSecure: boolean;

  @IsString()
  @MaxLength(191)
  smtpHost: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(65535)
  smtpPort: number;

  @IsBoolean()
  smtpSecure: boolean;

  @IsString()
  @MaxLength(191)
  username: string;

  @IsOptional()
  @IsString()
  @MaxLength(191)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  password?: string;
}

export class SyncMailboxDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  folder?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(20)
  @Max(1000)
  limit?: number;
}

function toBool(value: unknown): boolean | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (value === true || value === 'true' || value === '1') return true;
  if (value === false || value === 'false' || value === '0') return false;
  return undefined;
}

function QueryBool() {
  return Transform(({ value }) => toBool(value));
}

export class ListMessagesDto {
  @IsString()
  @MaxLength(500)
  folder: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  q?: string;

  @IsOptional()
  @QueryBool()
  @IsBoolean()
  unread?: boolean;

  @IsOptional()
  @QueryBool()
  @IsBoolean()
  starred?: boolean;

  @IsOptional()
  @QueryBool()
  @IsBoolean()
  attachments?: boolean;

  @IsOptional()
  @IsIn(['date_desc', 'date_asc', 'subject', 'from'])
  sort?: 'date_desc' | 'date_asc' | 'subject' | 'from';

  @IsOptional()
  @QueryBool()
  @IsBoolean()
  threads?: boolean;
}

export class MessageRefDto {
  @IsString()
  @MaxLength(500)
  folder: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  uid: number;
}

export class ReceiptDto extends MessageRefDto {
  @IsBoolean()
  send: boolean;
}

export class AttachOriginalDto extends MessageRefDto {
  @IsBoolean()
  asAttachment: boolean;
}

export class FolderPathDto {
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  path: string;
}

const FOLDER_NAME = /^[^\\/\x00-\x1f*%"]{1,120}$/;

export class CreateFolderDto {
  @IsString()
  @Matches(FOLDER_NAME, { message: 'Nome de pasta inválido.' })
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  parent?: string;
}

export class RenameFolderDto extends FolderPathDto {
  @IsString()
  @Matches(FOLDER_NAME, { message: 'Nome de pasta inválido.' })
  name: string;
}

export class ContactsQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  q?: string;
}

export class ScheduleDraftDto {
  @IsISO8601()
  sendAt: string;
}

export class ReadMessageDto {
  @IsString()
  @MaxLength(500)
  folder: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  uid: number;

  @IsOptional()
  @QueryBool()
  @IsBoolean()
  loadRemoteImages?: boolean;

  @IsOptional()
  @QueryBool()
  @IsBoolean()
  peek?: boolean;
}

export class MessageUidsDto {
  @IsString()
  @MaxLength(500)
  folder: string;

  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(100)
  @Type(() => Number)
  @IsInt({ each: true })
  uids: number[];
}

export class SeenDto extends MessageUidsDto {
  @IsBoolean()
  seen: boolean;
}

export class FlaggedDto extends MessageUidsDto {
  @IsBoolean()
  flagged: boolean;
}

export class MoveMessagesDto extends MessageUidsDto {
  @IsString()
  @MaxLength(500)
  targetFolder: string;
}

export class AttachmentQueryDto {
  @IsString()
  @MaxLength(500)
  folder: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  uid: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  index: number;

  @IsOptional()
  @QueryBool()
  @IsBoolean()
  preview?: boolean;
}

export class SaveDraftDto {
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  to?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  cc?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  bcc?: string;

  @IsOptional()
  @IsString()
  @MaxLength(998)
  subject?: string;

  @IsOptional()
  @IsString()
  @MaxLength(12_000_000)
  html?: string;

  @IsOptional()
  @IsIn(['new', 'reply', 'replyAll', 'forward'])
  mode?: string;

  @IsOptional()
  @IsIn(['high', 'normal', 'low'])
  priority?: 'high' | 'normal' | 'low';

  @IsOptional()
  @IsBoolean()
  requestReceipt?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  signatureId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  sourceFolder?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sourceUid?: number;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  inReplyTo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  references?: string;

  @IsOptional()
  @IsBoolean()
  includeSignature?: boolean;
}

export class SendMailDto extends SaveDraftDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  draftId?: number;

  /** Atraso do "desfazer envio". 0 envia na hora. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(30)
  delaySeconds?: number;

  /** Envio agendado (ISO 8601). */
  @IsOptional()
  @IsISO8601()
  sendAt?: string;
}

export class AuditQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
