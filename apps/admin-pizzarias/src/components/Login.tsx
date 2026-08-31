import { useState } from 'react';
import { LogIn } from 'lucide-react';
import { login } from '../data/repository';
import { Button, Card, CardContent, Input } from '@pizza/ui';

interface LoginProps {
  onAuthenticated: () => void;
}

// Tela de Login do platform_superadmin (Sprint 10) -- hoje nao existe, o painel abre
// direto. Sem tenantSlug (diferente de apps/cliente/apps/pizzaria): superadmin nao
// pertence a nenhum tenant -- LoginDto trata tenantSlug ausente como login de plataforma.
export function Login({ onAuthenticated }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setError('');
    if (!email.trim() || !password.trim()) {
      setError('Preencha email e senha.');
      return;
    }
    setSubmitting(true);
    try {
      await login(email, password);
      onAuthenticated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nao foi possivel entrar. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-sm w-full rounded-xl">
        <CardContent className="p-8 space-y-4">
          <div className="text-center mb-2">
            <h1 className="font-serif text-2xl text-foreground mb-1">Painel Admin</h1>
            <p className="text-sm text-muted-foreground">DESENVOLVAINC — Plataforma</p>
          </div>

          <Input
            label="Email"
            type="email"
            placeholder="voce@desenvolvainc.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            label="Senha"
            type="password"
            placeholder="Digite sua senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          />

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button fullWidth size="lg" onClick={handleSubmit} disabled={submitting} className="h-12 rounded-lg">
            <LogIn className="w-5 h-5" />
            {submitting ? 'Entrando...' : 'Entrar'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
