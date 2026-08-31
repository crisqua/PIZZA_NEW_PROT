import { LayoutDashboard, Pizza, ShoppingBag, Settings, LogOut, Package, Wallet, Lock } from 'lucide-react';
import { cn, Sidebar as SidebarShell } from '@pizza/ui';
import { AddonId } from '@pizza/types';

interface SidebarProps {
  activePage: string;
  onNavigate: (page: string) => void;
  tenantName: string;
  tenantLogo: string;
  activeAddons: AddonId[];
  onLogout: () => void;
}

export function Sidebar({ activePage, onNavigate, tenantName, tenantLogo, activeAddons, onLogout }: SidebarProps) {
  const menuItems: { id: string; name: string; icon: typeof LayoutDashboard; addonId?: AddonId }[] = [
    { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard },
    { id: 'orders', name: 'Pedidos', icon: ShoppingBag },
    { id: 'menu', name: 'Cardápio', icon: Pizza },
    { id: 'inventory', name: 'Estoque', icon: Package, addonId: 'estoque' },
    { id: 'financial', name: 'Financeiro', icon: Wallet, addonId: 'financeiro' },
    { id: 'settings', name: 'Configurações', icon: Settings },
  ];

  return (
    <SidebarShell
      activePage={activePage}
      mobileTitle={tenantName}
      widthClassName="w-72"
      header={
        <div className="p-6 flex items-center gap-3">
          <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center text-2xl text-primary-foreground">
            {tenantLogo}
          </div>
          <div>
            <h2 className="font-bold text-lg text-foreground">{tenantName}</h2>
            <p className="text-xs text-muted-foreground">Painel de Gestão</p>
          </div>
        </div>
      }
      footer={
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-4 py-3 m-4 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium">Sair</span>
        </button>
      }
    >
      {menuItems.map((item) => {
        const Icon = item.icon;
        const isActive = activePage === item.id;
        const isLocked = item.addonId ? !activeAddons.includes(item.addonId) : false;
        return (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={cn(
              'w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all',
              isActive
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            <Icon className="w-5 h-5" />
            <span className="font-medium flex-1 text-left">{item.name}</span>
            {isLocked && <Lock className="w-3.5 h-3.5 shrink-0 opacity-60" />}
          </button>
        );
      })}
    </SidebarShell>
  );
}
