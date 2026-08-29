-- Gate de RLS (docs/ARQUITETURA_SISTEMA_PIZZA_SAAS.md secao 11): toda tabela com coluna
-- tenant_id precisa ter RLS habilitado E forcado. Excecao documentada: "tenants" (a
-- plataforma precisa enxergar todos os tenants, isolamento e por rota/RBAC, nao RLS).
DO $$
DECLARE
  offending RECORD;
  offending_count INT := 0;
BEGIN
  FOR offending IN
    SELECT c.relname AS table_name, c.relrowsecurity, c.relforcerowsecurity
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND c.relname <> 'tenants'
      AND EXISTS (
        SELECT 1 FROM information_schema.columns col
        WHERE col.table_schema = 'public'
          AND col.table_name = c.relname
          AND col.column_name = 'tenant_id'
      )
      AND (c.relrowsecurity IS NOT TRUE OR c.relforcerowsecurity IS NOT TRUE)
  LOOP
    RAISE WARNING 'RLS gate FAILED: table "%" has tenant_id but relrowsecurity=% relforcerowsecurity=%',
      offending.table_name, offending.relrowsecurity, offending.relforcerowsecurity;
    offending_count := offending_count + 1;
  END LOOP;

  IF offending_count > 0 THEN
    RAISE EXCEPTION 'RLS gate failed: % table(s) with tenant_id lack ENABLE+FORCE ROW LEVEL SECURITY', offending_count;
  END IF;
END $$;
