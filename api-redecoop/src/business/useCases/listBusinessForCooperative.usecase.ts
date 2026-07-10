import { InjectRepository } from '@nestjs/typeorm';
import { Business, BusinessStatus } from '../entities/business.entity';
import { Repository } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { paginate, PaginateQuery } from '@/_common/utils/paginate/paginate';
import { ConversationService } from '@/conversation/services/conversation.service';
import { plainToInstance } from 'class-transformer';
import { BusinessDto } from '../Dtos/business.dto';

@Injectable()
export class ListBusinessForCooperativeUseCase {
  constructor(
    @InjectRepository(Business)
    private readonly businessRepository: Repository<Business>,
    private readonly conversationService: ConversationService,
  ) {}

  async execute(query: PaginateQuery, cooperativeId: number) {
    const queryBuilder = this.businessRepository
      .createQueryBuilder('business')
      .leftJoinAndSelect('business.collectivePurchase', 'cp')
      .leftJoinAndSelect('business.travelOffer', 'to')
      .leftJoinAndSelect('to.travel', 'travel')
      .leftJoinAndSelect('business.businessDesk', 'bd')
      .leftJoinAndSelect('business.conversation', 'conversation')
      .leftJoinAndSelect('to.routes', 'routes')
      .andWhere(
        '(business.offeringCooperativeId = :cooperativeId OR business.requestingCooperativeId = :cooperativeId)',
        { cooperativeId },
      )
      .select([
        'business.id',
        'business.fee',
        'business.type',
        'business.status',
        'business.createdAt',
        'business.offeringCooperativeId',
        'business.requestingCooperativeId',
        'cp.id',
        'to.id',
        'bd.id',
        'travel.id',
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

    if (filter && filter.status) {
      queryBuilder.andWhere('business.status = :status', { status: filter.status });
    }

    if (filter && filter.createdAt) {
      const [start, end] = filter.createdAt.split(',');
      queryBuilder.andWhere('business.createdAt BETWEEN :start AND :end', { start, end });
    }

    if (filter && filter.type) {
      queryBuilder.andWhere('business.type = :type', { type: filter.type });
    }

    if (filter && filter.operation) {
      if (filter.operation === 'sended') {
        queryBuilder.andWhere('business.offeringCooperativeId != :cooperativeId', { cooperativeId });
      } else if (filter.operation === 'received') {
        queryBuilder.andWhere('business.offeringCooperativeId = :cooperativeId', { cooperativeId });
      }
    }

    const paginated = await paginate(query, queryBuilder);

    const cloneQueryBuilder = queryBuilder.clone();
    const negotiatingCount = await cloneQueryBuilder
      .andWhere('business.status = :status', { status: BusinessStatus.Negotiating })
      .getCount();

    const { data, ...pagination } = paginated;

    data.forEach((business) => {
      business.travelOffer?.routes.sort((a, b) => a.order - b.order);
    });

    const businessesWithUnreadMessages = await Promise.all(
      data.map(async (business) => {
        const totalMessagesNotSeenByMe = await this.conversationService.countMessagesNotSeenByMe(
          business.conversation.id,
          cooperativeId,
        );
        return {
          ...business,
          conversation: {
            ...business.conversation,
            totalMessagesNotSeenByMe,
          },
        };
      }),
    );

    const transformedData = plainToInstance(BusinessDto, businessesWithUnreadMessages);

    return {
      data: transformedData,
      ...pagination,
      negotiatingCount,
    };
  }
}
