interface Category {
  id: string;
  name: string;
}

interface CategoryTabsProps {
  categories: Category[];
  activeId: string;
  onSelect: (id: string) => void;
}

// Nav de categorias em texto sublinhado (PROTCLINEW, Sprint 1) -- substitui o
// acordeao de categorias empilhadas (Menu.tsx/FlavorSelector guardavam
// "openCategoryId" e mostravam TODAS as categorias, uma de cada vez expandida).
// Aqui so' existe UMA categoria ativa por vez (escolha de quem usa, via
// "activeId"/"onSelect") -- a lista de produtos de quem chama renderiza so' a
// categoria ativa.
export function CategoryTabs({ categories, activeId, onSelect }: CategoryTabsProps) {
  return (
    <div className="flex gap-4.5 overflow-x-auto -mx-6 px-6">
      {categories.map((category) => {
        const isActive = category.id === activeId;
        return (
          <button
            key={category.id}
            onClick={() => onSelect(category.id)}
            className={`shrink-0 font-serif text-sm pb-1 border-b-[1.5px] transition-colors ${
              isActive
                ? 'text-primary border-primary font-semibold'
                : 'text-muted-foreground border-transparent hover:text-foreground'
            }`}
          >
            {category.name}
          </button>
        );
      })}
    </div>
  );
}
