import { CSSProperties, ReactNode } from 'react';

// Moldura de celular so' em telas largas (regras em styles/theme.css, dentro de
// @media (min-width: 461px)). Sem logica nenhuma -- em celular real as classes nao
// tem efeito algum e os filhos renderizam exatamente como antes.
//
// "style" recebe as custom properties de cor por tenant (--primary/--accent, ver
// App.tsx) aplicadas aqui, no wrapper mais externo -- nao no proprio App.tsx como
// antes: a barra de rolagem (.app-frame-scroll, estilizada via var(--primary) em
// theme.css) fica FORA da div que o App.tsx estiliza, entao precisa herdar a cor da
// mesma origem que o resto do app, senao ficaria sempre no dourado padrao mesmo numa
// pizzaria com cor propria configurada.
export function AppFrame({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div className="app-frame-backdrop" style={style}>
      <div className="app-frame">
        <div className="app-frame-scroll">{children}</div>
      </div>
    </div>
  );
}
