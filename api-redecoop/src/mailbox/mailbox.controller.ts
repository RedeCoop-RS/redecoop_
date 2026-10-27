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
import { Roles } from '@/_common/decorators/role.decorator';
import { UserRole } from '@/User/entities/user.entity';
import { MailboxService } from './mailbox.service';
import { MailboxSuperAdminGuard } from './security/mailbox-super-admin.guard';
import { MailboxUploadExceptionFilter, mailboxMulterOptions } from './mailbox.upload';
import {
  AttachmentQueryDto,
  AuditQueryDto,
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
@Controller('root/mailbox')
@Roles(UserRole.ADMIN)
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

  @Get('messages/attachment')
  async attachment(@Query() query: AttachmentQueryDto, @Res() res: Response) {
    const file = await this.mailbox.downloadAttachment(query.folder, query.uid, query.index);
    this.sendFile(res, file, Boolean(query.preview));
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
    const ascii = file.filename.replace(/[^\x20-\x7E]/g, '_') || 'anexo';
    const type = inline ? 'inline' : 'attachment';
    res.setHeader('Content-Type', file.contentType || 'application/octet-stream');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader(
      'Content-Disposition',
      `${type}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(file.filename)}`,
    );
    res.send(file.content);
  }
}
