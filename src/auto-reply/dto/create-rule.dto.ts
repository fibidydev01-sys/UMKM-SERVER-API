import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsArray,
  IsBoolean,
  IsInt,
  IsObject,
  ValidateNested,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AutoReplyTriggerType, KeywordMatchType } from '@prisma/client';

class WorkingHoursDto {
  @IsString()
  @IsNotEmpty()
  start: string; // "09:00"

  @IsString()
  @IsNotEmpty()
  end: string; // "21:00"

  @IsString()
  @IsNotEmpty()
  timezone: string; // "Asia/Jakarta"

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  days?: number[]; // [1,2,3,4,5] = Mon-Fri
}

export class CreateRuleDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(AutoReplyTriggerType)
  @IsNotEmpty()
  triggerType: AutoReplyTriggerType;

  // Keywords Array (used for multiple trigger types)
  // - KEYWORD: ["harga", "promo", "order"] - array of keywords to match
  // - ORDER_STATUS: ["PENDING"] - single status value in array
  // - PAYMENT_STATUS: ["PAID"] - single status value in array
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  keywords?: string[];

  @IsOptional()
  @IsEnum(KeywordMatchType)
  matchType?: KeywordMatchType;

  @IsOptional()
  @IsBoolean()
  caseSensitive?: boolean;

  // For time_based type
  @IsOptional()
  @ValidateNested()
  @Type(() => WorkingHoursDto)
  workingHours?: WorkingHoursDto;

  // Response
  @IsString()
  @IsNotEmpty()
  responseMessage: string;

  // Behavior
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  priority?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(60)
  delaySeconds?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
