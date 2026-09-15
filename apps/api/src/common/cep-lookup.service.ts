import { BadRequestException, Injectable, Logger } from '@nestjs/common';

export interface CepLookupResult {
  address: string;
  neighborhood: string;
  city: string;
  state: string;
}

interface ViaCepResponse {
  erro?: boolean;
  logradouro?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
}

// Dupla checagem de verdade (Sprint 12): o frontend ja' consulta o ViaCEP antes de
// enviar, mas o backend consulta de novo aqui -- e' isso que fecha o buraco de um
// cliente mandar um CEP valido com bairro/cidade forjados no body.
@Injectable()
export class CepLookupService {
  private readonly logger = new Logger(CepLookupService.name);

  // null = ViaCEP indisponivel (timeout/erro de rede) -- fail-open, quem chama decide
  // confiar no que o cliente ja mandou. Lanca BadRequestException pra formato invalido
  // ou CEP genuinamente inexistente ({erro:true}) -- esses dois casos SEMPRE devem
  // travar, nunca cair no fail-open.
  async resolve(rawCep: string): Promise<CepLookupResult | null> {
    const digits = rawCep.replace(/\D/g, '');
    if (digits.length !== 8) {
      throw new BadRequestException('CEP invalido.');
    }

    let response: Response;
    try {
      response = await fetch(`https://viacep.com.br/ws/${digits}/json/`, {
        signal: AbortSignal.timeout(3000),
      });
    } catch (err) {
      this.logger.warn(`ViaCEP indisponivel, seguindo com o endereco ja informado: ${String(err)}`);
      return null;
    }

    if (!response.ok) {
      this.logger.warn(`ViaCEP respondeu status ${response.status}, seguindo com o endereco ja informado.`);
      return null;
    }

    const data = (await response.json()) as ViaCepResponse;
    if (data.erro) {
      throw new BadRequestException('CEP nao encontrado.');
    }

    return {
      address: data.logradouro ?? '',
      neighborhood: data.bairro ?? '',
      city: data.localidade ?? '',
      state: data.uf ?? '',
    };
  }
}
