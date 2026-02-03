import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateHealthNoteDto } from './create-health-note.dto';

/**
 * Update Health Note DTO
 *
 * All fields are optional for partial updates.
 * Cannot change petId after creation.
 */
export class UpdateHealthNoteDto extends PartialType(
  OmitType(CreateHealthNoteDto, ['petId'] as const),
) {}
