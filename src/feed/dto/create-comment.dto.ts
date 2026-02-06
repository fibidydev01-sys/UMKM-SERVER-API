import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class CreateCommentDto {
  @IsString()
  @IsNotEmpty({ message: 'Komentar tidak boleh kosong' })
  @MaxLength(500, { message: 'Komentar maksimal 500 karakter' })
  content: string;
}
