-- PILOT-0003C: habilita Supabase Realtime (Postgres Changes) para public.avisos.
-- Idempotente — não falha se a tabela já estiver na publicação.
-- Não altera schema funcional de avisos. Não toca em nenhuma outra tabela.
-- Segurança: RLS já habilitado em public.avisos (policy membros_veem_avisos,
-- escopada por loja_id IN lojas_do_usuario()) — Realtime Postgres Changes
-- respeita essa RLS por assinante, sem necessidade de filtro adicional.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'avisos'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.avisos;
  END IF;
END $$;

-- Rollback:
-- ALTER PUBLICATION supabase_realtime DROP TABLE public.avisos;
