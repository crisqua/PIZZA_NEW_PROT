import { useEffect, useRef, useState } from 'react';
import { Input, formatCep } from '@pizza/ui';
import { lookupCep } from '../data/cep';

// Componente compartilhado (Sprint 12) -- usado por Checkout.tsx nesta sprint; desenhado
// pra ser reaproveitado depois pela secao opcional de endereco em Auth.tsx (Sprint 13),
// mesma logica de trava/erro/CEP-nao-encontrado nos dois lugares, implementada uma vez
// so' aqui.
export interface AddressFormValue {
  cep: string;
  address: string;
  addressNumber: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
}

interface AddressFormProps {
  value: AddressFormValue;
  onChange: (value: AddressFormValue) => void;
  errors?: Partial<Record<'cep' | 'address' | 'addressNumber' | 'neighborhood', string>>;
}

export function AddressForm({ value, onChange, errors }: AddressFormProps) {
  // Comeca travado se ja' vier com endereco resolvido (ex.: prefill de uma compra
  // anterior) -- so' destrava se o cliente clicar em "editar manualmente".
  const [locked, setLocked] = useState(Boolean(value.cep && value.address));
  const [cepStatus, setCepStatus] = useState<'idle' | 'loading' | 'not-found' | 'error'>('idle');
  // Digitos do ultimo CEP que a busca ja resolveu -- e' ISSO que evita refazer a busca
  // a toa (ex.: o proprio onChange do resultado disparando o effect nele mesmo), nao o
  // "locked". Antes o guard usava "|| locked", o que travava a busca PRA SEMPRE apos a
  // primeira resolucao -- trocar o CEP depois (bug real reportado pelo usuario) nunca
  // atualizava a rua, porque o effect nem chegava a rodar de novo.
  const lastResolvedCepRef = useRef<string | null>(value.cep ? value.cep.replace(/\D/g, '') : null);

  // So' dispara com os 8 digitos completos (nao a cada tecla), e so' quando o CEP
  // realmente mudou desde a ultima resolucao -- nunca trava por causa de "locked":
  // trocar o CEP tem que re-resolver mesmo com os campos de endereco travados.
  useEffect(() => {
    const digits = value.cep.replace(/\D/g, '');
    if (digits.length !== 8 || digits === lastResolvedCepRef.current) {
      return;
    }
    let cancelled = false;
    setCepStatus('loading');
    lookupCep(digits).then((result) => {
      if (cancelled) return;
      if (result.status === 'found') {
        lastResolvedCepRef.current = digits;
        onChange({
          ...value,
          address: result.address,
          // Numero e' especifico do endereco anterior -- trocar de CEP pra uma rua
          // diferente nao pode manter um numero de casa que nao tem nada a ver (pedido
          // do usuario, mesmo raciocinio do bug do endereco travado corrigido antes).
          addressNumber: '',
          neighborhood: result.neighborhood,
          city: result.city,
          state: result.state,
        });
        setLocked(true);
        setCepStatus('idle');
      } else {
        setCepStatus(result.status);
      }
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value.cep]);

  const update = (field: keyof AddressFormValue, fieldValue: string) => {
    onChange({ ...value, [field]: fieldValue });
  };

  return (
    <div className="space-y-3">
      <div>
        <Input
          label="CEP"
          placeholder="00000-000"
          inputMode="numeric"
          maxLength={9}
          value={value.cep}
          onChange={(e) => update('cep', formatCep(e.target.value))}
          error={errors?.cep ?? (cepStatus === 'not-found' ? 'CEP não encontrado' : undefined)}
        />
        {cepStatus === 'loading' && (
          <p className="mt-1.5 text-sm text-muted-foreground">Buscando endereço...</p>
        )}
        {cepStatus === 'error' && (
          <p className="mt-1.5 text-sm text-muted-foreground">
            Não foi possível verificar o CEP agora. Preencha o endereço manualmente.
          </p>
        )}
      </div>

      <Input
        label="Rua / Avenida"
        placeholder="Digite o endereço"
        value={value.address}
        onChange={(e) => update('address', e.target.value)}
        error={errors?.address}
        disabled={locked}
      />

      <div className="grid grid-cols-3 gap-3">
        <Input
          label="Número"
          placeholder="000"
          value={value.addressNumber}
          onChange={(e) => update('addressNumber', e.target.value)}
          error={errors?.addressNumber}
        />
        <div className="col-span-2">
          <Input
            label="Complemento"
            placeholder="Apto, Bloco..."
            value={value.complement}
            onChange={(e) => update('complement', e.target.value)}
          />
        </div>
      </div>

      <Input
        label="Bairro"
        placeholder="Digite o bairro"
        value={value.neighborhood}
        onChange={(e) => update('neighborhood', e.target.value)}
        error={errors?.neighborhood}
        disabled={locked}
      />

      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Cidade"
          value={value.city}
          onChange={(e) => update('city', e.target.value)}
          disabled={locked}
        />
        <Input
          label="Estado"
          value={value.state}
          onChange={(e) => update('state', e.target.value.toUpperCase())}
          maxLength={2}
          disabled={locked}
        />
      </div>

      {locked && (
        <button
          type="button"
          onClick={() => setLocked(false)}
          className="text-sm text-primary hover:underline"
        >
          Não é o endereço certo? Editar manualmente
        </button>
      )}
    </div>
  );
}
