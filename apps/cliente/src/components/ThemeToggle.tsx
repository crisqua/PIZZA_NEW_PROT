import { Sun, Moon } from 'lucide-react';

interface ThemeToggleProps {
  theme: 'light' | 'dark';
  onToggle: () => void;
}

// Botao flutuante unico (App.tsx, sibling de todas as views) -- visivel em qualquer
// tela do app sem precisar de prop por componente, mesmo padrao ja usado por
// <UpdateBanner /> e pelo toast de "item adicionado".
export function ThemeToggle({ theme, onToggle }: ThemeToggleProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      title={theme === 'dark' ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
      aria-label={theme === 'dark' ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
      className="fixed top-6 right-[72px] z-[55] w-10 h-10 rounded-full border border-border bg-surface/90 backdrop-blur flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors shrink-0"
    >
      {theme === 'dark' ? <Sun className="w-4.5 h-4.5" /> : <Moon className="w-4.5 h-4.5" />}
    </button>
  );
}
