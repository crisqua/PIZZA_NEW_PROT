import { IsBoolean } from 'class-validator';

// Estado desejado, nao "flip" -- evita corrida de dois cliques concorrentes no switch da
// UI resultando no estado errado.
export class ToggleTenantActiveDto {
  @IsBoolean()
  active!: boolean;
}
