import { ReactNode } from 'react';

// Moldura de celular so' em telas largas (regras em styles/theme.css, dentro de
// @media (min-width: 461px)). Sem logica nenhuma -- em celular real as classes nao
// tem efeito algum e os filhos renderizam exatamente como antes.
export function AppFrame({ children }: { children: ReactNode }) {
  return (
    <div className="app-frame-backdrop">
      <div className="app-frame">
        <div className="app-frame-scroll">{children}</div>
      </div>
    </div>
  );
}
