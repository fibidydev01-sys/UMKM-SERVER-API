import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class CreateReplyDto {
  @IsString()
  @IsNotEmpty({ message: 'Balasan tidak boleh kosong' })
  @MaxLength(500, { message: 'Balasan maksimal 500 karakter' })
  content: string;
}
