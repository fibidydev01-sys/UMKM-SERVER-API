import { IsArray, IsString, ArrayMinSize, ArrayMaxSize } from 'class-validator';

export class BulkDeleteDto {
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1, { message: 'Minimal 1 product ID' })
  @ArrayMaxSize(50, { message: 'Maksimal 50 products per request' })
  ids: string[];
}
