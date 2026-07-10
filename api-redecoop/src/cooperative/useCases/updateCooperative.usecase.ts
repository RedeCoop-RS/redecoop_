import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Cooperative } from '../entities/cooperative.entity';
import { Repository } from 'typeorm';
import { UpdateCooperativeProfileDto } from '../Dtos/updateCooperativeProfile.dto';
import { UpdateCooperativeDto } from '../Dtos/updateCooperative.dto';
import { CooperativeService } from '../cooperative.service';
import { UserService } from '@/User/user.service';

@Injectable()
export class UpdateCooperativeUseCase {
  constructor(
    @InjectRepository(Cooperative)
    private readonly cooperativeRepository: Repository<Cooperative>,
    private readonly cooperativeService: CooperativeService,
    private readonly userService: UserService,
  ) {}

  async execute(
    id: number,
    data: UpdateCooperativeDto | UpdateCooperativeProfileDto,
  ): Promise<void> {
    const cooperative = await this.cooperativeRepository.findOne({
      where: { id },
      relations: { user: true },
    });

    if (!cooperative) {
      throw new NotFoundException('Cooperativa não encontrada.');
    }

    const { img, website, instagram, facebook, ...updateFields } = data;
    const emailLogin = 'emailLogin' in data ? data.emailLogin : undefined;

    if (
      website &&
      website !== '' &&
      !website.startsWith('http://') &&
      !website.startsWith('https://')
    ) {
      cooperative.website = 'https://' + website;
    } else {
      cooperative.website = '';
    }

    if (
      instagram &&
      instagram !== '' &&
      !instagram.startsWith('http://') &&
      !instagram.startsWith('https://')
    ) {
      cooperative.instagram = 'https://' + instagram;
    } else {
      cooperative.instagram = '';
    }

    if (
      facebook &&
      facebook !== '' &&
      !facebook.startsWith('http://') &&
      !facebook.startsWith('https://')
    ) {
      cooperative.facebook = 'https://' + facebook;
    } else {
      cooperative.facebook = '';
    }

    Object.assign(cooperative, updateFields);

    if (img) {
      cooperative.img = img.filename;
    }

    await this.cooperativeRepository.save(cooperative);

    if (emailLogin) {
      const userSameEmail = await this.userService.findByUsername(emailLogin);

      if (userSameEmail && cooperative.userId !== userSameEmail.id) {
        throw new BadRequestException(
          'Já existe um usuario utilizando esse e-mail para realizar login',
        );
      }

      await this.userService.updateUser(cooperative.user, { username: emailLogin });
    }

    await this.cooperativeService.updateDeliveryCities(cooperative.id, data.serviceCityIds);
  }
}
