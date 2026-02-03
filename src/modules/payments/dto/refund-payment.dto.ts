import { IsNotEmpty, IsNumber, IsOptional, IsString, Min, MaxLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class RefundAccountDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  bank: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  accountNumber: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  holderName: string;
}

export class RefundPaymentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  refundReason: string;

  @IsNumber()
  @IsOptional()
  @Min(100)
  refundAmount?: number; // Optional for partial refund

  @ValidateNested()
  @Type(() => RefundAccountDto)
  @IsOptional()
  refundReceiveAccount?: RefundAccountDto; // Required for virtual account refunds
}
