import { ReactNode, useEffect, useState } from 'react';
import { Menu, X } from 'lucide-react';
import { cn } from './lib/utils';

interface SidebarShellProps {
  header: ReactNode;
  footer: ReactNode;
  children: ReactNode;
  /** Muda sempre que o usuario navega -- usado so' pra fechar a gaveta automaticamente. */
  activePage: string;
  /** Titulo mostrado na barra superior mobile, ao lado do botao hamburguer. */
  mobileTitle: string;
  /** Largura da sidebar em telas >=1024px (lg:) -- cada app mantem a propria largura. */
  widthClassName?: string;
}

// Shell responsivo compartilhado (packages/ui, nao apps/pizzaria ou apps/admin-pizzarias
// individualmente) -- as duas telas ja compartilhavam a mesma estrutura visual (header +
// lista de itens + rodape com "Sair"), so' os itens de navegacao mudam. Duplicar a logica
// inteira de abrir/fechar/backdrop/fechar-ao-navegar duas vezes seria pior que um
// componente com 2 pontos de uso.
//
// >=1024px (lg:): sidebar fixa, sempre visivel -- exatamente como sempre foi, sem
// nenhuma mudanca de layout/largura no desktop.
// <1024px: vira uma gaveta off-canvas (translate-x-full por padrao), acionada por um
// botao hamburguer numa barra superior fixa. Backdrop fecha ao tocar fora, Escape
// tambem fecha, e a gaveta fecha sozinha sempre que activePage muda (usuario navegou).
export function Sidebar({ header, footer, children, activePage, mobileTitle, widthClassName = 'w-72' }: SidebarShellProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [activePage]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open]);

  return (
    <>
      {/* Barra superior mobile -- fixed (nao flex item), escapa do layout flex do App.tsx
          de proposito, senao viraria irma de largura total ao lado do conteudo principal
          em vez de ficar por cima. O conteudo principal precisa de padding-top pra
          compensar (ver App.tsx de cada app: "pt-14 lg:pt-0"). */}
      <div className="lg:hidden fixed top-0 inset-x-0 z-30 h-14 flex items-center gap-3 bg-card border-b border-border px-4">
        <button
          onClick={() => setOpen(true)}
          aria-label="Abrir menu"
          className="p-2 -ml-2 rounded-lg hover:bg-muted text-foreground transition-colors"
        >
          <Menu className="w-6 h-6" />
        </button>
        <span className="font-bold text-foreground truncate">{mobileTitle}</span>
      </div>

      {open && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/50"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      <div
        className={cn(
          'fixed top-0 left-0 z-50 h-screen bg-card border-r border-border flex flex-col transition-transform duration-200 ease-in-out',
          'lg:static lg:translate-x-0',
          widthClassName,
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <button
          onClick={() => setOpen(false)}
          aria-label="Fechar menu"
          className="lg:hidden absolute top-3 right-3 p-2 rounded-lg hover:bg-muted text-muted-foreground transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
        <div className="border-b border-border">{header}</div>
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">{children}</nav>
        <div className="border-t border-border">{footer}</div>
      </div>
    </>
  );
}
