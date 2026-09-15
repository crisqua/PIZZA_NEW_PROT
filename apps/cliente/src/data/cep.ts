// Consulta o ViaCEP direto do navegador (Sprint 12) -- API publica externa, sem
// apiFetch/auth. O backend consulta de novo em paralelo (dupla checagem de verdade,
// OrdersService/UsersController), isso aqui e' so' pra travar os campos e dar feedback
// imediato ao cliente antes de enviar o pedido.
export type CepLookupResult =
  | { status: 'found'; address: string; neighborhood: string; city: string; state: string }
  | { status: 'not-found' }
  | { status: 'error' };

interface ViaCepResponse {
  erro?: boolean;
  logradouro?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
}

export async function lookupCep(cep: string): Promise<CepLookupResult> {
  const digits = cep.replace(/\D/g, '');
  if (digits.length !== 8) {
    return { status: 'error' };
  }
  try {
    const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
    if (!res.ok) {
      return { status: 'error' };
    }
    const data = (await res.json()) as ViaCepResponse;
    if (data.erro) {
      return { status: 'not-found' };
    }
    return {
      status: 'found',
      address: data.logradouro ?? '',
      neighborhood: data.bairro ?? '',
      city: data.localidade ?? '',
      state: data.uf ?? '',
    };
  } catch {
    return { status: 'error' };
  }
}
