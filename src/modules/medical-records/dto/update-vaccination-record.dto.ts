import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateVaccinationRecordDto } from './create-vaccination-record.dto';

/**
 * Update Vaccination Record DTO
 *
 * All fields are optional for partial updates.
 * Cannot change petId after creation.
 */
export class UpdateVaccinationRecordDto extends PartialType(
  OmitType(CreateVaccinationRecordDto, ['petId'] as const),
) {}
