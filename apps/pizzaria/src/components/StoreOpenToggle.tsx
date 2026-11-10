import { useState } from 'react';
import { Switch } from '@pizza/ui';
import { mockTenant, toggleStoreOpen } from '../data/repository';

// Interruptor manual de loja aberta/fechada (Sprint 27) -- mesmo binding de
// mockTenant.isOpen, entao alternar reflete em qualquer outro lugar que leia
// mockTenant.isOpen assim que remontar (mesma tecnica ja usada pro resto de mockTenant
// neste painel). A garantia de verdade de que pedido nao entra com a loja fechada e' o
// backend (OrdersService.create) -- isto aqui e' so' o controle, nao o gate.
// Unico lugar de uso: Sidebar.tsx, embaixo do nome da pizzaria (Sprint 36) -- antes
// vivia duplicado no cabecalho do Dashboard e de Pedidos, cada copia com seu proprio
// estado local (useState) que so' sincronizava ao trocar de tela.
export function StoreOpenToggle() {
  const [isOpen, setIsOpen] = useState(mockTenant.isOpen ?? true);
  const [saving, setSaving] = useState(false);

  const handleToggle = async (next: boolean) => {
    setIsOpen(next);
    setSaving(true);
    try {
      await toggleStoreOpen(next);
    } catch {
      // Reverte a UI se o PATCH falhar -- nao deixar o dono achar que fechou a loja
      // quando na verdade o servidor rejeitou a mudanca.
      setIsOpen(!next);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex items-center gap-2.5 bg-card border border-border rounded-lg px-3 py-2">
      <span className={`text-sm font-medium ${isOpen ? 'text-success' : 'text-destructive'}`}>
        {isOpen ? 'Loja Aberta' : 'Loja Fechada'}
      </span>
      <Switch checked={isOpen} disabled={saving} onCheckedChange={handleToggle} />
    </div>
  );
}
