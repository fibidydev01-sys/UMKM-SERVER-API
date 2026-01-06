import { IsString, IsNotEmpty, IsIn, IsOptional } from 'class-validator';

export class UpdateOrderStatusDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(['PENDING', 'PROCESSING', 'COMPLETED', 'CANCELLED'])
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'CANCELLED';
}

export class UpdatePaymentStatusDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(['PENDING', 'PAID', 'PARTIAL', 'FAILED'])
  paymentStatus: 'PENDING' | 'PAID' | 'PARTIAL' | 'FAILED';

  @IsOptional()
  paidAmount?: number;
}
