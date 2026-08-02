-- SEC-0002B — Etapa B: prova controlada, instrução única e autocontida.
-- Cria uma tabela descartável em public, valida objetivamente (dentro da
-- mesma instrução DO) se owner e privilégios de anon/authenticated/
-- service_role batem com o previsto pelos defaults já auditados (Etapa A,
-- Q4/Q5), remove a tabela e confirma a remoção — tudo dentro de um único
-- bloco DO. Não faz parte da correção funcional do SEC-0002B.
-- Escopo: somente tabela (tipo 'r'), schema public.

DO $$
DECLARE
  v_owner text;
  v_expected text[] := ARRAY['DELETE','INSERT','MAINTAIN','REFERENCES','SELECT','TRIGGER','TRUNCATE','UPDATE'];
  v_privs text[];
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'zzz_sec0002b_probe_postgres'
  ) THEN
    RAISE EXCEPTION 'SEC-0002B Etapa B: objeto de prova já existe, abortando sem criar nada';
  END IF;

  CREATE TABLE public.zzz_sec0002b_probe_postgres (id integer PRIMARY KEY);
  COMMENT ON TABLE public.zzz_sec0002b_probe_postgres IS 'SEC-0002B Etapa B - prova controlada, removida na mesma instrução.';

  SELECT tableowner INTO v_owner FROM pg_tables
  WHERE schemaname = 'public' AND tablename = 'zzz_sec0002b_probe_postgres';
  IF v_owner IS DISTINCT FROM 'postgres' THEN
    RAISE EXCEPTION 'SEC-0002B Etapa B: owner divergente. Esperado postgres, obtido %', v_owner;
  END IF;

  SELECT coalesce(array_agg(a.privilege_type ORDER BY a.privilege_type), ARRAY[]::text[]) INTO v_privs
  FROM pg_class c, aclexplode(c.relacl) a
  WHERE c.relnamespace = 'public'::regnamespace AND c.relname = 'zzz_sec0002b_probe_postgres' AND a.grantee = 'anon'::regrole;
  IF v_privs IS DISTINCT FROM v_expected THEN
    RAISE EXCEPTION 'SEC-0002B Etapa B: ACL de anon divergente. Esperado %, obtido %', v_expected, v_privs;
  END IF;

  SELECT coalesce(array_agg(a.privilege_type ORDER BY a.privilege_type), ARRAY[]::text[]) INTO v_privs
  FROM pg_class c, aclexplode(c.relacl) a
  WHERE c.relnamespace = 'public'::regnamespace AND c.relname = 'zzz_sec0002b_probe_postgres' AND a.grantee = 'authenticated'::regrole;
  IF v_privs IS DISTINCT FROM v_expected THEN
    RAISE EXCEPTION 'SEC-0002B Etapa B: ACL de authenticated divergente. Esperado %, obtido %', v_expected, v_privs;
  END IF;

  SELECT coalesce(array_agg(a.privilege_type ORDER BY a.privilege_type), ARRAY[]::text[]) INTO v_privs
  FROM pg_class c, aclexplode(c.relacl) a
  WHERE c.relnamespace = 'public'::regnamespace AND c.relname = 'zzz_sec0002b_probe_postgres' AND a.grantee = 'service_role'::regrole;
  IF v_privs IS DISTINCT FROM v_expected THEN
    RAISE EXCEPTION 'SEC-0002B Etapa B: ACL de service_role divergente. Esperado %, obtido %', v_expected, v_privs;
  END IF;

  DROP TABLE public.zzz_sec0002b_probe_postgres;

  IF EXISTS (
    SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'zzz_sec0002b_probe_postgres'
  ) THEN
    RAISE EXCEPTION 'SEC-0002B Etapa B: falha na remoção interna, objeto ainda existe após DROP';
  END IF;
END $$;
