import { IsString, IsNotEmpty, IsOptional, IsInt } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryMessageDto {
  @IsString()
  @IsNotEmpty()
  conversationId: string;

  @IsOptional()
  @IsString()
  before?: string; // Message ID for cursor-based pagination

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  limit?: number = 50;
}
