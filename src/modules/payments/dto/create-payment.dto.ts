import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Min, MaxLength } from 'class-validator';
import { PaymentMethod } from '../entities/payment.entity';

export class CreatePaymentDto {
  @IsUUID()
  @IsNotEmpty()
  userId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  resourceType: string; // 'booking', 'daycare_reservation', 'insurance_subscription'

  @IsUUID()
  @IsNotEmpty()
  resourceId: string;

  @IsNumber()
  @Min(100)
  amount: number;

  @IsEnum(PaymentMethod)
  @IsNotEmpty()
  paymentMethod: PaymentMethod;

  @IsString()
  @IsOptional()
  @MaxLength(200)
  customerName?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  customerEmail?: string;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  customerMobilePhone?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @IsString()
  @IsOptional()
  @MaxLength(200)
  successUrl?: string;

  @IsString()
  @IsOptional()
  @MaxLength(200)
  failUrl?: string;
}
