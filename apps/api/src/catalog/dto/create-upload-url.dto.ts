import { IsIn, IsString, MaxLength, MinLength } from 'class-validator';

// Tipos aceitos pra imagem de produto -- mesma lista configurada no bucket do Supabase
// Storage (defesa em profundidade: validado aqui E no bucket, nao so' um dos dois).
export const ALLOWED_IMAGE_CONTENT_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

export class CreateUploadUrlDto {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  fileName!: string;

  @IsIn(ALLOWED_IMAGE_CONTENT_TYPES)
  contentType!: string;
}
