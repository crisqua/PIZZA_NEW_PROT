import { LayoutDashboard, Pizza, ShoppingBag, Settings, LogOut, Package, Wallet, Lock } from 'lucide-react';
import { cn } from '@pizza/ui';
import { AddonId } from '@pizza/types';

interface SidebarProps {
  activePage: string;
  onNavigate: (page: string) => void;
  tenantName: string;
  tenantLogo: string;
  activeAddons: AddonId[];
}

export function Sidebar({ activePage, onNavigate, tenantName, tenantLogo, activeAddons }: SidebarProps) {
  const menuItems: { id: string; name: string; icon: typeof LayoutDashboard; addonId?: AddonId }[] = [
    { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard },
    { id: 'orders', name: 'Pedidos', icon: ShoppingBag },
    { id: 'menu', name: 'Cardápio', icon: Pizza },
    { id: 'inventory', name: 'Estoque', icon: Package, addonId: 'estoque' },
    { id: 'financial', name: 'Financeiro', icon: Wallet, addonId: 'financeiro' },
    { id: 'settings', name: 'Configurações', icon: Settings },
  ];

  return (
    <div className="w-72 bg-card border-r border-border/50 h-screen flex flex-col shadow-sm relative z-10">
      <div className="p-6 border-b border-border/50 bg-gradient-to-b from-primary/5 to-transparent">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-2xl shadow-sm border border-border/50">
            {tenantLogo}
          </div>
          <div>
            <h2 className="font-extrabold text-lg tracking-tight text-foreground">{tenantName}</h2>
            <p className="text-xs font-medium text-primary">Painel de Gestão</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activePage === item.id;
          const isLocked = item.addonId ? !activeAddons.includes(item.addonId) : false;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-200 group relative',
                isActive
                  ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20'
                  : 'text-muted-foreground hover:bg-muted/80 hover:text-foreground hover:shadow-sm'
              )}
            >
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-8 bg-white rounded-r-full shadow-sm" />
              )}
              <Icon className={cn("w-5 h-5 transition-transform", isActive ? "scale-110" : "group-hover:scale-110")} />
              <span className="font-bold flex-1 text-left">{item.name}</span>
              {isLocked && <Lock className="w-3.5 h-3.5 shrink-0 opacity-60" />}
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-border/50 bg-muted/20">
        <button className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all group font-bold">
          <LogOut className="w-5 h-5 group-hover:scale-110 transition-transform" />
          <span>Sair</span>
        </button>
      </div>
    </div>
  );
}
