import { Client } from 'pg';

// Cria/atualiza uma role Postgres restrita (NOSUPERUSER NOBYPASSRLS) para a aplicacao
// usar em runtime. Sem isso, testar RLS contra a role "postgres" (superuser) da falso
// positivo — superuser sempre ignora RLS/FORCE RLS, mesmo com policy quebrada.
// Precisa rodar DEPOIS de `prisma migrate deploy` (os GRANTs sao sobre as tabelas
// existentes no momento da execucao).

const APP_ROLE = process.env.APP_DB_ROLE ?? 'pizza_app';
const APP_ROLE_PASSWORD = process.env.APP_DB_PASSWORD;
const BOOTSTRAP_URL = process.env.SUPERUSER_DATABASE_URL ?? process.env.DIRECT_URL;

function escapeLiteral(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

async function main() {
  if (!APP_ROLE_PASSWORD) {
    throw new Error('APP_DB_PASSWORD nao definido — necessario para criar/atualizar a role restrita.');
  }
  if (!BOOTSTRAP_URL) {
    throw new Error('SUPERUSER_DATABASE_URL ou DIRECT_URL nao definido.');
  }

  const client = new Client({ connectionString: BOOTSTRAP_URL });
  await client.connect();

  try {
    const { rows } = await client.query('SELECT 1 FROM pg_roles WHERE rolname = $1', [APP_ROLE]);

    if (rows.length === 0) {
      console.log(`Criando role "${APP_ROLE}" (NOSUPERUSER NOBYPASSRLS)...`);
      await client.query(
        `CREATE ROLE "${APP_ROLE}" WITH LOGIN PASSWORD ${escapeLiteral(APP_ROLE_PASSWORD)} NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE`,
      );
    } else {
      console.log(`Role "${APP_ROLE}" ja existe — atualizando senha e reafirmando NOBYPASSRLS...`);
      await client.query(
        `ALTER ROLE "${APP_ROLE}" WITH LOGIN PASSWORD ${escapeLiteral(APP_ROLE_PASSWORD)} NOSUPERUSER NOBYPASSRLS`,
      );
    }

    const { rows: dbRows } = await client.query('SELECT current_database() AS db');
    const dbName = dbRows[0].db;

    await client.query(`GRANT CONNECT ON DATABASE "${dbName}" TO "${APP_ROLE}"`);
    await client.query(`GRANT USAGE ON SCHEMA public TO "${APP_ROLE}"`);
    await client.query(`GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO "${APP_ROLE}"`);
    await client.query(`GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO "${APP_ROLE}"`);
    await client.query(
      `ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO "${APP_ROLE}"`,
    );
    await client.query(
      `ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO "${APP_ROLE}"`,
    );

    console.log(`Role "${APP_ROLE}" configurada com sucesso no banco "${dbName}".`);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('Falha ao configurar a role restrita:', err);
  process.exit(1);
});
