import { IsOptional, IsString } from 'class-validator';

export class ConnectWhatsAppDto {
  @IsOptional()
  @IsString()
  phoneNumber?: string;
}
