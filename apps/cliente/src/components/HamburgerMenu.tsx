import { useEffect } from 'react';
import { X, Truck, History, LogOut, LogIn } from 'lucide-react';
import { mockTenant } from '../data/repository';

interface HamburgerMenuProps {
  open: boolean;
  onClose: () => void;
  isLoggedIn: boolean;
  customerName?: string;
  onTrackOrders: () => void;
  onOrderHistory: () => void;
  onLogout: () => void;
  onLogin: () => void;
}

// Drawer lateral do app Cliente. "Sair" mora aqui dentro de proposito -- antes, tocar no
// icone de conta deslogava na hora, sem nenhuma confirmacao (toque acidental = sessao
// perdida). Posicionado com `fixed` e, em tela larga, fica contido na moldura
// (AppFrame cria o containing block via transform).
export function HamburgerMenu({
  open,
  onClose,
  isLoggedIn,
  customerName,
  onTrackOrders,
  onOrderHistory,
  onLogout,
  onLogin,
}: HamburgerMenuProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  // Cada item fecha o drawer antes de executar a acao.
  const run = (action: () => void) => () => {
    onClose();
    action();
  };

  return (
    <div className="fixed inset-0 z-[70]">
      <button type="button" aria-label="Fechar menu" onClick={onClose} className="absolute inset-0 bg-black/55" />
      <nav
        aria-label="Menu principal"
        className="absolute top-0 left-0 bottom-0 w-[78%] max-w-[300px] bg-surface border-r border-border flex flex-col"
      >
        <div className="flex items-center justify-between px-5 pt-6 pb-4 border-b border-border">
          <div className="min-w-0">
            <p className="font-serif text-lg font-semibold text-foreground truncate">{mockTenant.name}</p>
            <p className="text-xs text-muted-foreground truncate">
              {isLoggedIn && customerName ? `Olá, ${customerName.split(' ')[0]}` : 'Você não está logado'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar menu"
            className="w-9 h-9 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-foreground shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 py-2">
          {isLoggedIn ? (
            <>
              <DrawerItem icon={<Truck className="w-5 h-5" />} label="Acompanhe meus pedidos" onClick={run(onTrackOrders)} />
              <DrawerItem icon={<History className="w-5 h-5" />} label="Histórico de pedidos" onClick={run(onOrderHistory)} />
            </>
          ) : (
            <DrawerItem icon={<LogIn className="w-5 h-5" />} label="Entrar" onClick={run(onLogin)} />
          )}
        </div>

        {isLoggedIn && (
          <div className="border-t border-border py-2">
            <DrawerItem icon={<LogOut className="w-5 h-5" />} label="Sair" onClick={run(onLogout)} tone="destructive" />
          </div>
        )}
      </nav>
    </div>
  );
}

function DrawerItem({
  icon,
  label,
  onClick,
  tone = 'default',
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  tone?: 'default' | 'destructive';
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-5 py-3.5 text-left text-sm font-medium transition-colors hover:bg-secondary ${
        tone === 'destructive' ? 'text-destructive' : 'text-foreground'
      }`}
    >
      <span className={tone === 'destructive' ? '' : 'text-primary'}>{icon}</span>
      {label}
    </button>
  );
}
