import { InjectRepository } from '@nestjs/typeorm';
import { Business, BusinessStatus } from '../entities/business.entity';
import { Repository } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { paginate, PaginateQuery } from '@/_common/utils/paginate/paginate';
import { ConversationService } from '@/conversation/services/conversation.service';
import { plainToInstance } from 'class-transformer';
import { BusinessDto } from '../Dtos/business.dto';
import { UserLoggedDto } from '@/_common/dto/userLogged.dto';
import { MessageStatus } from '@/conversation/entities/conversationMessage.entity';

@Injectable()
export class ListBusinessForAdminUseCase {
  constructor(
    @InjectRepository(Business)
    private readonly businessRepository: Repository<Business>,
    private readonly conversationService: ConversationService,
  ) {}

  async execute(query: PaginateQuery, userLogged: UserLoggedDto) {
    const queryBuilder = this.businessRepository
      .createQueryBuilder('business')
      .leftJoinAndSelect('business.collectivePurchase', 'cp')
      .leftJoinAndSelect('business.travelOffer', 'to')
      .leftJoinAndSelect('to.travel', 'travel')
      .leftJoinAndSelect('business.businessDesk', 'bd')
      .leftJoinAndSelect('business.offeringCooperative', 'offering')
      .leftJoinAndSelect('business.requestingCooperative', 'requesting')
      .leftJoinAndSelect('business.conversation', 'conversation')
      .leftJoinAndSelect('to.routes', 'routes')
      .select([
        'business.id',
        'business.fee',
        'business.type',
        'business.status',
        'business.createdAt',
        'business.offeringCooperativeId',
        'business.requestingCooperative',
        'cp.id',
        'to.id',
        'bd.id',
        'travel.id',
        'offering.id',
        'offering.companyName',
        'offering.fantasyName',
        'requesting.id',
        'requesting.companyName',
        'requesting.fantasyName',
        'conversation.id',
        'conversation.messageCount',
        'conversation.awaitingMediation',
        'routes.id',
        'routes.address',
        'routes.order',
      ])
      .orderBy('business.createdAt', 'DESC')
      .addOrderBy('routes.order', 'ASC');

    const { filter } = query;

    if (filter && filter.awaitingMediation && filter.awaitingMediation == 'true') {
      queryBuilder.andWhere(
        `EXISTS (
          SELECT 1 FROM conversation_message cm
          WHERE cm.conversation_id = conversation.id
            AND cm.status = :pendingStatus
        )`,
        { pendingStatus: MessageStatus.Pending },
      );
    }

    if (filter && filter.status) {
      queryBuilder.andWhere('business.status = :status', { status: filter.status });
    }

    if (filter && filter.createdAt) {
      const [start, end] = filter.createdAt.split(',');
      queryBuilder.andWhere('business.createdAt BETWEEN :start AND :end', { start, end });
    }

    const paginated = await paginate(query, queryBuilder);

    const negotiatingCount = await queryBuilder
      .clone()
      .andWhere('business.status = :negotiatingStatus', {
        negotiatingStatus: BusinessStatus.Negotiating,
      })
      .getCount();

    const { data, ...pagination } = paginated;

    data.forEach((business) => {
      business.travelOffer?.routes.sort((a, b) => a.order - b.order);
    });

    const businessesWithUnreadMessages = await Promise.all(
      data.map(async (business) => {
        const unreadMessagesCount =
          business.offeringCooperative.id == userLogged.sub ||
          business.requestingCooperative.id == userLogged.sub
            ? await this.conversationService.countMessagesNotSeenByMe(
                business.conversation.id,
                userLogged.sub,
              )
            : 0;

        return {
          ...business,
          conversation: {
            ...business.conversation,
            unreadMessagesCount,
          },
        };
      }),
    );

    const transformedData = plainToInstance(BusinessDto, businessesWithUnreadMessages);

    return { data: transformedData, ...pagination, negotiatingCount };
  }
}
