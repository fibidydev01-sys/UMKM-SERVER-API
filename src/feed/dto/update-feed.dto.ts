import { IsString, IsOptional, MaxLength } from 'class-validator';

export class UpdateFeedDto {
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Caption maksimal 500 karakter' })
  caption?: string;
}
