import { Injectable } from '@nestjs/common';
import { ConfigSystem } from './entities/configSystem.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Transactional } from 'typeorm-transactional';
import { ProductType } from '@/productType/entities/productType.entity';
import { VehicleType } from '@/vehicleType/entities/vehicleType.entity';
import { plainToInstance } from 'class-transformer';
import { ProductTypeResponseDto } from '@/productType/Dtos/productTypeResponse.dto';
import { VehicleTypeResponseDto } from '@/vehicleType/dtos/vehicleTypeResponse.dto';
import { ConfigSystemDto } from './Dtos/configSystem.dto';
import { UpdateConfigSystemDto } from './Dtos/updateConfigSystem.dto';
import { ProductCategory } from '@/productCategory/entities/productCategory.entity';
import { Packaging } from '@/packaging/entities/packaging.entity';
import { DistanceRange } from '@/distanceRange/entities/distanceRange.entity';
import { WeightRange } from '@/weightRange/entities/weightRange.entity';
import { ValueRange } from '@/valueRange/entities/valueRange.entity';

@Injectable()
export class ConfigSystemService {
  constructor(
    @InjectRepository(ConfigSystem)
    private readonly configRepository: Repository<ConfigSystem>,
    @InjectRepository(ProductType)
    private readonly productTypeRepository: Repository<ProductType>,
    @InjectRepository(VehicleType)
    private readonly vehicleTypeRepository: Repository<VehicleType>,
    @InjectRepository(ProductCategory)
    private readonly productCategoryRepository: Repository<ProductCategory>,
    @InjectRepository(Packaging)
    private readonly packagingRepository: Repository<Packaging>,
    @InjectRepository(DistanceRange)
    private readonly distanceRangeRepository: Repository<DistanceRange>,
    @InjectRepository(WeightRange)
    private readonly weightRangeRepository: Repository<WeightRange>,
    @InjectRepository(ValueRange)
    private readonly valueRangeRepository: Repository<ValueRange>,
  ) {}

  async getMinimumServiceTax(): Promise<number> {
    const config = await this.configRepository.findOne({ where: { id: 1 } });
    if (!config) {
      throw new Error('Configuração de valor taxa minima não encontrada');
    }
    return Number(config.minimumServiceTax);
  }

  async getTaxService(): Promise<number> {
    const config = await this.configRepository.findOne({ where: { id: 1 } });
    if (!config) {
      throw new Error('Configuração de taxa de serviço não encontrada');
    }
    return Number(config.serviceTax);
  }

  @Transactional()
  async update(data: UpdateConfigSystemDto): Promise<void> {
    const { loadTypes, vehicleTypes, productCategories, packaging, distanceRanges, weightRanges, valueRanges, ...config } = data;

    await this.configRepository.upsert({ id: 1, ...config }, ['id']);

    if (loadTypes && loadTypes.length > 0) {
      await this.productTypeRepository.upsert(loadTypes, ['id']);
    }

    if (vehicleTypes && vehicleTypes.length > 0) {
      await this.vehicleTypeRepository.upsert(vehicleTypes, ['id']);
    }

    if (productCategories && productCategories.length > 0) {
      await this.productCategoryRepository.upsert(productCategories, ['id']);
    }

    if (packaging && packaging.length > 0) {
      await this.packagingRepository.upsert(packaging, ['id']);
    }

    await this.valueRangeRepository.delete({});
    await this.weightRangeRepository.delete({});
    await this.distanceRangeRepository.delete({});

    const newDistanceRanges = await this.distanceRangeRepository.save(distanceRanges);

    const newWeightRanges = await this.weightRangeRepository.save(weightRanges);

    const newValueRanges = [];
    for (let i = 0; i < valueRanges.length; i++) {
      for (let j = 0; j < valueRanges[i].length; j++) {
        newValueRanges.push({
          value: valueRanges[i][j],
          distanceRangeId: newDistanceRanges[i].id,
          weightRangeId: newWeightRanges[j].id,
        });
      }
    }

    await this.valueRangeRepository.save(newValueRanges);
  }

  async view() {
    const [config, loadTypes, vehicleTypes, productCategories, packaging, distanceRanges, weightRanges, valueRanges] = await Promise.all([
      this.configRepository.findOneBy({ id: 1 }),
      this.productTypeRepository.find(),
      this.vehicleTypeRepository.find(),
      this.productCategoryRepository.find(),
      this.packagingRepository.find(),
      this.distanceRangeRepository.find(),
      this.weightRangeRepository.find(),
      this.valueRangeRepository.find(),
    ]);

    const dataTransformed = plainToInstance(ConfigSystemDto, {
      serviceTax: config?.serviceTax ?? 0,
      minimumServiceTax: config?.minimumServiceTax ?? 0,
      loadTypes,
      vehicleTypes,
      productCategories,
      packaging,
      distanceRanges,
      weightRanges,
      valueRanges
    });

    return dataTransformed;
  }
}
