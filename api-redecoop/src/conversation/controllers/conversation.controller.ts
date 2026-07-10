import { Roles } from '@/_common/decorators/role.decorator';
import {
  Body,
  Controller,
  Get,
  Param,
  ParseBoolPipe,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ConversationService } from '../services/conversation.service';
import { ConversationMessageService } from '../services/conversationMessage.service';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PaginatedSwagger } from '@/_common/decorators/paginateSwagger.decorator';
import { UserRole } from '@/User/entities/user.entity';
import { UserLoggedDto } from '@/_common/dto/userLogged.dto';
import { UserLogged } from '@/_common/decorators/userLogged.decorator';
import { Paginate } from '@/_common/utils/paginate/decorator';
import { PaginateQuery } from '@/_common/utils/paginate/paginate';
import { StartDirectConversationUseCase } from '../useCases/startDirectConversation.usecase';
import { StartDirectConversationDto } from '../Dtos/startDirectConversation.dto';
import { GetLastCooperativesTalkedToUseCase } from '../useCases/getLastCooperativesTalkedTo.usecase';
import { GetDirectConversationsUseCase } from '../useCases/getDirectConversations.usecase';
import { GetConversationUseCase } from '../useCases/getConversation.usecase';
import { ApproveOrRejectMessageUseCase } from '../useCases/approveOrRejectMessage.usecase';

@ApiBearerAuth()
@ApiTags('Conversation')
@Controller('conversation')
export class CommonConversationController {
  constructor(
    private readonly startDirectConversationUseCase: StartDirectConversationUseCase,
    private readonly getLastCooperativesTalkedToUseCase: GetLastCooperativesTalkedToUseCase,
    private readonly getDirectConversationsUseCase: GetDirectConversationsUseCase,
    private readonly getConversationUseCase: GetConversationUseCase,
    private readonly approveOrRejectMessageUseCase: ApproveOrRejectMessageUseCase,
  ) {}

  @Get('list')
  @Roles(UserRole.COOPERATIVE, UserRole.ADMIN)
  @PaginatedSwagger({
    filterableColumns: ['cooperativeId'],
  })
  @ApiOperation({
    summary: 'Listar as as conversas da cooperativa/admin logado',
  })
  async list(@Paginate() query: PaginateQuery, @UserLogged() user: UserLoggedDto) {
    return await this.getDirectConversationsUseCase.execute(query, user);
  }

  @Get('view/:conversationId')
  @ApiOperation({
    summary: 'Ver uma unica conversa e suas mensagens',
  })
  async view(@Param('conversationId', ParseIntPipe) id: number, @UserLogged() user: UserLoggedDto) {
    return await this.getConversationUseCase.execute(id, user);
  }

  @Post('start-direct')
  @ApiOperation({
    summary: 'Criar uma nova conversa com uma cooperativa',
  })
  async startDirectConversation(
    @Body() postData: StartDirectConversationDto,
    @UserLogged() user: UserLoggedDto,
  ) {
    return await this.startDirectConversationUseCase.execute(postData, user);
  }

  @Get('contacts-recent')
  @ApiOperation({
    summary:
      'Listar as cooperativas mais recentes que entraram em contato com o usuário logado ou com as quais o usuário entrou em contato.',
  })
  async contactsRecent(@UserLogged() user: UserLoggedDto) {
    return await this.getLastCooperativesTalkedToUseCase.execute(user);
  }

  @Patch('approve-reject-message/:messageId')
  async approveOrRejectMessage(
    @Param('messageId', ParseIntPipe) id: number,
    @Body('approved', ParseBoolPipe) approved: boolean,
  ) {
    await this.approveOrRejectMessageUseCase.execute(id, approved);
  }
}
