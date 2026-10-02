interface SectionDividerProps {
  label: string;
}

// Separador de secao do cardapio editorial (PROTCLINEW, Sprint 1) -- linha fina,
// rotulo small-caps centralizado, linha fina. Usado pelo Menu.tsx (Sprint 2) e pelo
// FlavorSelector dentro de PizzaBuilder.tsx (Sprint 3) pra marcar cada categoria.
export function SectionDivider({ label }: SectionDividerProps) {
  return (
    <div className="flex items-center gap-3 my-2">
      <div className="flex-1 h-px bg-border" />
      <span className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </span>
      <div className="flex-1 h-px bg-border" />
    </div>
  );
}
