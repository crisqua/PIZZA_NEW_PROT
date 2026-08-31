import { useState } from 'react';
import { LogIn } from 'lucide-react';
import { login } from '../data/repository';
import { Button, Card, CardContent, Input } from '@pizza/ui';

interface LoginProps {
  onAuthenticated: () => void;
}

// Tela de Login (Sprint 9, MVP.md item 2: "Owner/staff da pizzaria faz login") -- hoje
// nao existe nenhuma tela de autenticacao, o painel abre direto no dashboard. So' login,
// sem cadastro (diferente do Auth.tsx do apps/cliente): nao ha' cadastro publico de
// owner/staff, essas contas sao provisionadas pela plataforma.
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
            <h1 className="font-serif text-2xl text-foreground mb-1">Painel de Gestão</h1>
            <p className="text-sm text-muted-foreground">Entre com sua conta</p>
          </div>

          <Input
            label="Email"
            type="email"
            placeholder="voce@suapizzaria.com"
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
