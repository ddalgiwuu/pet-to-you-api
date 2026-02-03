import { IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';

export class ConfirmPaymentDto {
  @IsString()
  @IsNotEmpty()
  paymentKey: string;

  @IsString()
  @IsNotEmpty()
  orderId: string;

  @IsNumber()
  @Min(100)
  amount: number;
}
