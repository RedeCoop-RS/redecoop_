import { DistanceRangeDto } from '@/distanceRange/dtos/distanceRange.dto';
import { PackagingDto } from '@/packaging/Dtos/packaging.dto';
import { UpdateOrCreatePackagingTypeDto } from '@/packaging/Dtos/updateorcreatePackaging.dto';
import { UpdateOrCreateProductCategory } from '@/productCategory/Dtos/updateOrCreateProductCategory.dto';
import { UpdateOrCreateProductType } from '@/productType/Dtos/updateOrCreateProductType.dto';
import { CreateVehicleTypeDto } from '@/vehicleType/dtos/createVehicleType.dto';
import { UpdateOrCreateVehicleType } from '@/vehicleType/dtos/updateOrCreateVehicleType.dto';
import { WeightRangeDto } from '@/weightRange/dtos/weightRange.dto';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsNotEmpty, IsNumber, ValidateNested } from 'class-validator';

export class UpdateConfigSystemDto {
  @ApiProperty({
    example: 5,
    required: true,
    description: 'Porcentagem taxa de Serviço',
  })
  @IsNotEmpty()
  @IsNumber()
  serviceTax: number;

  @ApiProperty({
    example: 2.5,
    required: true,
    description: 'Taxa minima de serviço',
  })
  @IsNotEmpty()
  @IsNumber()
  minimumServiceTax: number;

  @ApiProperty({
    required: true,
    description: 'Tipos de Cargas e seus multiplicadores',
    isArray: true,
    type: UpdateOrCreateProductType,
  })
  @IsNotEmpty()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateOrCreateProductType)
  loadTypes: UpdateOrCreateProductType[];

  @ApiProperty({
    required: true,
    description: 'Tipos de Veículos e seus multiplicadores',
    isArray: true,
    type: UpdateOrCreateVehicleType,
  })
  @IsNotEmpty()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateOrCreateVehicleType)
  vehicleTypes: UpdateOrCreateVehicleType[];

  @ApiProperty({
    required: true,
    description: 'Categorias de produtos',
    isArray: true,
    type: UpdateOrCreateProductCategory,
  })
  @IsNotEmpty()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateOrCreateProductCategory)
  productCategories: UpdateOrCreateProductCategory[];

  @ApiProperty({
    required: true,
    isArray:true,
    type:PackagingDto,
    description: 'Tipos de embalagens'
  })
  @IsNotEmpty()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateOrCreatePackagingTypeDto)
  packaging: UpdateOrCreatePackagingTypeDto[];

  @ApiProperty({
    required: true,
    description: 'Faixas de distância',
    isArray: true,
    type: DistanceRangeDto,
  })
  @IsNotEmpty()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DistanceRangeDto)
  distanceRanges: DistanceRangeDto[];

  @ApiProperty({
    required: true,
    description: 'Faixas de peso',
    isArray: true,
    type: WeightRangeDto,
  })
  @IsNotEmpty()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WeightRangeDto)
  weightRanges: WeightRangeDto[];

  @ApiProperty({
    required: true,
    example: [[2, 4,], [4, 1] ],
    description: 'Matriz de valores baseada nas faixas de peso e distância',
    isArray: true,
    type: [Number], // Matriz bidimensional de números
  })
  @IsNotEmpty()
  @IsArray()
  valueRanges: number[][];
}
