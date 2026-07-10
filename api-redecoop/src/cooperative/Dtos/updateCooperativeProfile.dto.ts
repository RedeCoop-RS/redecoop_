import { OmitType } from '@nestjs/mapped-types';
import { UpdateCooperativeDto } from './updateCooperative.dto';

export class UpdateCooperativeProfileDto extends OmitType(UpdateCooperativeDto, ['type', 'DAP', 'emailLogin'] as const){
  
}
