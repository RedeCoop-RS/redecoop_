import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  Req,
  Res,
  UnauthorizedException,
  UploadedFile,
  UseFilters,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { MailboxService } from './mailbox.service';
import { MailboxSuperAdminGuard } from './security/mailbox-super-admin.guard';
import { MailboxUploadExceptionFilter, mailboxMulterOptions } from './mailbox.upload';
import {
  AttachOriginalDto,
  AttachmentQueryDto,
  AuditQueryDto,
  ContactsQueryDto,
  CreateFolderDto,
  FolderPathDto,
  MessageRefDto,
  ReceiptDto,
  RenameFolderDto,
  FlaggedDto,
  ListMessagesDto,
  MessageUidsDto,
  MoveMessagesDto,
  ReadMessageDto,
  SaveDraftDto,
  SeenDto,
  SendMailDto,
  SyncMailboxDto,
  TestMailboxDto,
  UpsertMailboxAccountDto,
} from './dto/mailbox.dto';

interface AuthRequest extends Request {
  user?: { role?: string; userId?: number; sub?: number; email?: string };
}

@ApiBearerAuth()
@ApiTags('Mailbox')
/**
 * Sem @Roles de propósito: o AuthGuard global só autentica (401 sem token) e o
 * MailboxSuperAdminGuard devolve 403 para quem não é ADMIN. Com @Roles o guard
 * global responderia 401 e o painel trataria como sessão expirada.
 */
@Controller('root/mailbox')
@UseGuards(MailboxSuperAdminGuard)
export class MailboxController {
  constructor(private readonly mailbox: MailboxService) {}

  @Get('account')
  @ApiOperation({ summary: 'Ver configuração da caixa (sem senha)' })
  account() {
    return this.mailbox.getAccountView();
  }

  @Put('account')
  @ApiOperation({ summary: 'Salvar conexão IMAP/SMTP' })
  saveAccount(@Req() req: AuthRequest, @Body() dto: UpsertMailboxAccountDto) {
    return this.mailbox.saveAccount(this.userId(req), dto);
  }

  @Delete('account')
  @ApiOperation({ summary: 'Remover a caixa configurada' })
  deleteAccount() {
    return this.mailbox.deleteAccount();
  }

  @Post('account/test')
  @ApiOperation({ summary: 'Testar IMAP e SMTP sem gravar' })
  test(@Req() req: AuthRequest, @Body() dto: TestMailboxDto) {
    return this.mailbox.testConnection(this.userId(req), dto);
  }

  @Get('folders')
  folders() {
    return this.mailbox.listFolders();
  }

  @Post('folders')
  @ApiOperation({ summary: 'Criar pasta' })
  createFolder(@Body() dto: CreateFolderDto) {
    return this.mailbox.createFolder(dto);
  }

  @Put('folders')
  @ApiOperation({ summary: 'Renomear pasta' })
  renameFolder(@Body() dto: RenameFolderDto) {
    return this.mailbox.renameFolder(dto);
  }

  @Post('folders/delete')
  @ApiOperation({ summary: 'Excluir pasta (vazia de subpastas)' })
  deleteFolder(@Body() dto: FolderPathDto) {
    return this.mailbox.deleteFolder(dto.path);
  }

  @Post('folders/read-all')
  @ApiOperation({ summary: 'Marcar todas as mensagens da pasta como lidas' })
  readAll(@Body() dto: FolderPathDto) {
    return this.mailbox.markAllSeen(dto.path);
  }

  @Post('folders/empty')
  @ApiOperation({ summary: 'Esvaziar lixeira ou spam' })
  emptyFolder(@Body() dto: FolderPathDto) {
    return this.mailbox.emptyFolder(dto.path);
  }

  @Get('quota')
  quota() {
    return this.mailbox.quota();
  }

  @Get('contacts')
  contacts(@Query() query: ContactsQueryDto) {
    return this.mailbox.contacts(query.q);
  }

  @Post('sync')
  sync(@Req() req: AuthRequest, @Body() dto: SyncMailboxDto) {
    return this.mailbox.sync(this.userId(req), dto);
  }

  @Get('unread')
  unread() {
    return this.mailbox.unread();
  }

  @Get('messages')
  messages(@Query() query: ListMessagesDto) {
    return this.mailbox.listMessages(query);
  }

  @Get('messages/read')
  read(@Query() query: ReadMessageDto) {
    return this.mailbox.readMessage(query);
  }

  @Post('messages/seen')
  seen(@Body() dto: SeenDto) {
    return this.mailbox.setSeen(dto);
  }

  @Post('messages/star')
  star(@Body() dto: FlaggedDto) {
    return this.mailbox.setFlagged(dto);
  }

  @Post('messages/move')
  move(@Body() dto: MoveMessagesDto) {
    return this.mailbox.move(dto);
  }

  @Post('messages/archive')
  archive(@Body() dto: MessageUidsDto) {
    return this.mailbox.archive(dto.folder, dto.uids);
  }

  @Post('messages/spam')
  spam(@Body() dto: MessageUidsDto) {
    return this.mailbox.spam(dto.folder, dto.uids);
  }

  @Post('messages/delete')
  remove(@Body() dto: MessageUidsDto) {
    return this.mailbox.remove(dto.folder, dto.uids);
  }

  @Post('messages/restore')
  restore(@Body() dto: MessageUidsDto) {
    return this.mailbox.restore(dto.uids);
  }

  @Post('messages/not-spam')
  notSpam(@Body() dto: MessageUidsDto) {
    return this.mailbox.notSpam(dto.folder, dto.uids);
  }

  @Post('messages/receipt')
  @ApiOperation({ summary: 'Enviar ou ignorar a confirmação de leitura pedida pelo remetente' })
  receipt(@Req() req: AuthRequest, @Body() dto: ReceiptDto) {
    return this.mailbox.handleReceipt(this.userId(req), dto);
  }

  @Get('messages/source')
  @ApiOperation({ summary: 'Baixar o original (.eml)' })
  async source(@Query() query: MessageRefDto, @Res() res: Response) {
    const file = await this.mailbox.messageSource(query.folder, query.uid);
    this.sendFile(res, file, false);
  }

  @Get('messages/attachment')
  async attachment(@Query() query: AttachmentQueryDto, @Res() res: Response) {
    const file = await this.mailbox.downloadAttachment(query.folder, query.uid, query.index);
    const previewType = query.preview ? previewableType(file.contentType) : null;
    this.sendFile(res, previewType ? { ...file, contentType: previewType } : file, Boolean(previewType));
  }

  @Get('drafts')
  drafts() {
    return this.mailbox.listDrafts();
  }

  @Post('drafts')
  createDraft(@Body() dto: SaveDraftDto) {
    return this.mailbox.saveDraft(dto);
  }

  @Put('drafts/:id')
  updateDraft(@Param('id', ParseIntPipe) id: number, @Body() dto: SaveDraftDto) {
    return this.mailbox.saveDraft(dto, id);
  }

  @Post('drafts/:id/original')
  @ApiOperation({ summary: 'Anexar a mensagem original ou os anexos dela ao rascunho' })
  attachOriginal(@Param('id', ParseIntPipe) id: number, @Body() dto: AttachOriginalDto) {
    return this.mailbox.attachOriginal(id, dto);
  }

  @Delete('drafts/:id/schedule')
  @ApiOperation({ summary: 'Desfazer envio / cancelar agendamento' })
  cancelSchedule(@Param('id', ParseIntPipe) id: number) {
    return this.mailbox.cancelScheduled(id);
  }

  @Delete('drafts/:id')
  deleteDraft(@Param('id', ParseIntPipe) id: number) {
    return this.mailbox.deleteDraft(id);
  }

  @Post('drafts/:id/attachments')
  @ApiConsumes('multipart/form-data')
  @UseFilters(MailboxUploadExceptionFilter)
  @UseInterceptors(FileInterceptor('file', mailboxMulterOptions()))
  upload(
    @Req() req: AuthRequest,
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.mailbox.addAttachment(this.userId(req), id, file);
  }

  @Delete('drafts/:id/attachments/:attachmentId')
  deleteAttachment(
    @Param('id', ParseIntPipe) id: number,
    @Param('attachmentId', ParseIntPipe) attachmentId: number,
  ) {
    return this.mailbox.deleteDraftAttachment(id, attachmentId);
  }

  @Get('drafts/:id/attachments/:attachmentId')
  async draftAttachment(
    @Param('id', ParseIntPipe) id: number,
    @Param('attachmentId', ParseIntPipe) attachmentId: number,
    @Res() res: Response,
  ) {
    const file = await this.mailbox.readDraftAttachment(id, attachmentId);
    this.sendFile(res, file, false);
  }

  @Post('send')
  send(@Req() req: AuthRequest, @Body() dto: SendMailDto) {
    return this.mailbox.send(this.userId(req), dto);
  }

  @Get('audit')
  audit(@Query() query: AuditQueryDto) {
    return this.mailbox.listAudit(query.page, query.limit);
  }

  private userId(req: AuthRequest): number {
    const id = req.user?.userId ?? req.user?.sub;
    if (!id) throw new UnauthorizedException('Sessão inválida.');
    return Number(id);
  }

  private sendFile(
    res: Response,
    file: { filename: string; contentType: string; content: Buffer },
    inline: boolean,
  ) {
    const ascii = file.filename.replace(/[^\x20-\x7E]/g, '_').replace(/["\\]/g, '_') || 'anexo';
    const type = inline ? 'inline' : 'attachment';
    const contentType = inline
      ? file.contentType
      : safeDownloadType(file.contentType || 'application/octet-stream');
    res.setHeader('Content-Type', contentType);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('Content-Security-Policy', "default-src 'none'; img-src data:; sandbox");
    res.setHeader(
      'Content-Disposition',
      `${type}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(file.filename)}`,
    );
    res.send(file.content);
  }
}

const PREVIEWABLE = new Set([
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'image/bmp',
  'application/pdf',
  'text/plain',
]);

/** Só abre na tela tipos que não executam código. HTML, SVG e XML viram download. */
export function previewableType(contentType: string): string | null {
  const type = (contentType || '').split(';')[0].trim().toLowerCase();
  const normalized = type === 'image/jpg' ? 'image/jpeg' : type;
  return PREVIEWABLE.has(normalized) ? normalized : null;
}

function safeDownloadType(contentType: string): string {
  const type = contentType.split(';')[0].trim().toLowerCase();
  if (/html|xml|svg|javascript|ecmascript/.test(type)) return 'application/octet-stream';
  return /^[a-z0-9.+-]+\/[a-z0-9.+-]+$/.test(type) ? type : 'application/octet-stream';
}
