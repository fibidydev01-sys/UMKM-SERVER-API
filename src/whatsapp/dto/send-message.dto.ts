import { IsString, IsNotEmpty, IsEnum, IsOptional } from 'class-validator';

export enum MessageTypeEnum {
  TEXT = 'text',
  IMAGE = 'image',
  AUDIO = 'audio',
  DOCUMENT = 'document',
}

export class SendMessageDto {
  @IsString()
  @IsNotEmpty()
  to: string;

  @IsEnum(MessageTypeEnum)
  @IsNotEmpty()
  messageType: MessageTypeEnum;

  @IsString()
  @IsNotEmpty()
  content: string;

  @IsOptional()
  @IsString()
  mediaUrl?: string;
}
