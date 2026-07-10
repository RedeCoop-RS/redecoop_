import { Injectable } from '@nestjs/common';
import { Conversation } from '../entities/conversation.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserLoggedDto } from '@/_common/dto/userLogged.dto';
import { paginate, PaginateQuery } from '@/_common/utils/paginate/paginate';
import { ConversationService } from '../services/conversation.service';
import { plainToInstance } from 'class-transformer';
import { ConversationDto } from '../Dtos/conversation.dto';

@Injectable()
export class GetDirectConversationsUseCase {
  constructor(
    @InjectRepository(Conversation)
    private readonly conversationRepository: Repository<Conversation>,
    private readonly conversationService: ConversationService,
  ) {}

  async execute(query: PaginateQuery, user: UserLoggedDto) {
    const queryBuilder = this.conversationRepository
      .createQueryBuilder('conversation')
      .leftJoinAndSelect('conversation.participantCooperative', 'participantCooperative')
      .leftJoinAndSelect('conversation.initiatorCooperative', 'initiatorCooperative')
      .leftJoin('conversation.business','business')
      .where('business.id IS NULL')
      .select([
        'conversation.id',
        'conversation.createdAt',
        'conversation.title',
        'participantCooperative.id',
        'participantCooperative.companyName',
        'participantCooperative.fantasyName',
        'initiatorCooperative.id',
        'initiatorCooperative.companyName',
        'initiatorCooperative.fantasyName',
        'conversation.messageCount',
        'conversation.lastMessage',
      ])
      .andWhere('conversation.deletedAt IS NULL')
      .andWhere(
        '(participantCooperative.id = :cooperativeLoggedId OR initiatorCooperative.id = :cooperativeLoggedId)',
        { cooperativeLoggedId: user.sub },
      );

    const { filter } = query;

    if (filter && filter.cooperativeId) {
      queryBuilder.andWhere(
        '(participantCooperative.id = :filterCooperativeId OR initiatorCooperative.id = :filterCooperativeId)',
        { filterCooperativeId: filter.cooperativeId },
      );
    }

    const paginated = await paginate(query, queryBuilder);

    const allConversations = await queryBuilder.getMany();

    const totalUnreadMessages = await Promise.all(
      allConversations.map(async (conversation) => {
        return await this.conversationService.countMessagesNotSeenByMe(conversation.id, user.sub);
      }),
    );

    const totalUnreadCount = totalUnreadMessages.reduce((acc, counts) => acc + counts, 0);

    const { data, ...pagination } = paginated;

    const transformedData = await Promise.all(
      data.map(async (conversation) => {
        const totalMessagesNotSeenByMe = await this.conversationService.countMessagesNotSeenByMe(
          conversation.id,
          user.sub,
        );

        const totalMyMessagesNotSeen = await this.conversationService.countMyMessagesNotSeen(
          conversation.id,
          user.sub,
        );

        return plainToInstance(ConversationDto, {
          ...conversation,
          totalMessagesNotSeenByMe,
          totalMyMessagesNotSeen,
        });
      }),
    );

    return {
      data: transformedData,
      ...pagination,
      totalUnreadMessages: totalUnreadCount,
    };
  }
}
