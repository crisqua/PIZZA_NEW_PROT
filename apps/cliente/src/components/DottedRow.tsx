interface DottedRowProps {
  name: string;
  price: string; // ja' formatado (ex. "R$ 40,00") -- quem chama decide a formatacao.
  featured?: boolean;
}

// Layout "nome ........ preco" (leader pontilhado), estilo cardapio impresso
// (PROTCLINEW, Sprint 1) -- bloco base de todo item de lista nas telas seguintes
// (Menu, FlavorSelector, Cart). As telas continuam compondo o resto (descricao,
// tamanhos, botoes de acao) em volta deste componente, ele so' cobre a linha
// nome+preco.
export function DottedRow({ name, price, featured }: DottedRowProps) {
  return (
    <div className="flex items-baseline gap-2">
      {featured && (
        <span className="text-primary text-[13px] leading-none -translate-y-px" aria-hidden="true">
          ✶
        </span>
      )}
      <span className="font-serif text-lg font-semibold text-foreground whitespace-nowrap">{name}</span>
      <span className="flex-1 border-b border-dotted border-border/80 h-px self-center -mb-px" />
      <span className="font-serif text-base font-semibold text-primary whitespace-nowrap">{price}</span>
    </div>
  );
}
