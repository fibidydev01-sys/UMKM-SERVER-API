import { IsString, IsNotEmpty, IsEnum, IsOptional } from 'class-validator';
import { MessageType } from '@prisma/client';

export class SendMessageDto {
  @IsString()
  @IsNotEmpty()
  conversationId: string;

  @IsEnum(MessageType)
  @IsNotEmpty()
  messageType: MessageType;

  @IsString()
  @IsNotEmpty()
  content: string;

  @IsOptional()
  @IsString()
  mediaUrl?: string;
}
