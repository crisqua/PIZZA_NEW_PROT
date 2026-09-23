import { randomUUID } from 'crypto';
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface SignedUploadUrl {
  uploadUrl: string;
  publicUrl: string;
}

// Sprint 16: upload de imagem de produto via Supabase Storage. O navegador do dono da
// pizzaria sobe o arquivo DIRETO pro storage usando a uploadUrl assinada devolvida aqui
// -- o arquivo em si nunca passa pelo backend (docs/MVP.md: "nunca upload direto no
// servidor de app"), so' este service gera a permissao temporaria de escrita.
@Injectable()
export class ProductUploadService {
  // Cliente montado sob demanda (nao no construtor) -- Nest instancia todo provider no
  // boot da aplicacao, inclusive em teste e2e que sobem o AppModule inteiro; falhar
  // rapido aqui quebraria TODOS os testes/o dev local sempre que as vars de ambiente do
  // Supabase nao estiverem setadas, nao so' o fluxo de upload em si.
  private supabase: SupabaseClient | undefined;

  private getClient(): SupabaseClient {
    if (this.supabase) return this.supabase;
    const url = process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceRoleKey) {
      throw new InternalServerErrorException('Upload de imagem nao configurado (SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY ausentes).');
    }
    // service_role key -- nunca vai pro frontend, so' o backend gera a URL assinada.
    this.supabase = createClient(url, serviceRoleKey);
    return this.supabase;
  }

  private get bucket(): string {
    return process.env.SUPABASE_STORAGE_BUCKET ?? 'product-images';
  }

  async createSignedUploadUrl(tenantId: string, fileName: string): Promise<SignedUploadUrl> {
    const supabase = this.getClient();

    // Path isolado por tenant + nome unico -- evita colisao entre uploads (do mesmo
    // tenant ou de tenants diferentes) e evita um tenant conseguir sobrescrever/adivinhar
    // o arquivo de outro so' pelo nome.
    const extension = fileName.includes('.') ? fileName.split('.').pop() : undefined;
    const path = `products/${tenantId}/${randomUUID()}${extension ? `.${extension}` : ''}`;

    const { data, error } = await supabase.storage.from(this.bucket).createSignedUploadUrl(path);
    if (error || !data) {
      throw new InternalServerErrorException('Nao foi possivel gerar a URL de upload.');
    }

    const { data: publicUrlData } = supabase.storage.from(this.bucket).getPublicUrl(path);

    return { uploadUrl: data.signedUrl, publicUrl: publicUrlData.publicUrl };
  }
}
