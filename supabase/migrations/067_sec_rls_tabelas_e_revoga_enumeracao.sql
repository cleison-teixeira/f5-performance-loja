-- SEC-0001: corta cadeia de escalação de privilégio confirmada em auditoria.
--
-- Causa raiz: public.liberacoes_acesso estava sem RLS e gravável por anon/
-- authenticated via REST direto (grants completos SELECT/INSERT/UPDATE/DELETE
-- confirmados em information_schema.role_table_grants). A trigger
-- on_auth_user_liberacao (AFTER INSERT ON auth.users, SECURITY DEFINER)
-- aplica automaticamente qualquer linha pendente casada por e-mail, inserindo
-- o role indicado (inclusive admin_f5/dono) em membros_loja. Um atacante
-- podia inserir uma liberação com role arbitrário e se auto-cadastrar com o
-- mesmo e-mail para virar dono/admin_f5 de uma loja real, sem pagamento.
--
-- Mesma ausência de RLS + mesmos grants completos confirmada em mais 6
-- tabelas (assinaturas, planos, parceiros, bibliotecas, biblioteca_itens,
-- instalacoes_biblioteca). 100% do acesso legítimo a essas 7 tabelas no
-- código da aplicação passa pelo client admin (service role), que bypassa
-- RLS — habilitar RLS sem nenhuma policy adicional não quebra o fluxo
-- legítimo e bloqueia por padrão qualquer acesso via anon/authenticated.
--
-- Também revoga EXECUTE de anon/authenticated em
-- buscar_auth_user_por_email(text) — SECURITY DEFINER que permitia
-- enumeração de e-mails cadastrados em auth.users sem autenticação.
--
-- Idempotente: ENABLE ROW LEVEL SECURITY e REVOKE não falham se já
-- aplicados. Não cria policies. Não altera dados, triggers, functions
-- (exceto grants) ou outras tabelas.

BEGIN;

ALTER TABLE public.liberacoes_acesso ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assinaturas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parceiros ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bibliotecas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.biblioteca_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instalacoes_biblioteca ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON FUNCTION public.buscar_auth_user_por_email(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.buscar_auth_user_por_email(text) FROM anon, authenticated;

COMMIT;

-- Rollback (não usar sem autorização explícita — reabre a escalação de privilégio):
-- BEGIN;
-- ALTER TABLE public.liberacoes_acesso DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.assinaturas DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.planos DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.parceiros DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.bibliotecas DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.biblioteca_itens DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.instalacoes_biblioteca DISABLE ROW LEVEL SECURITY;
-- GRANT EXECUTE ON FUNCTION public.buscar_auth_user_por_email(text) TO anon, authenticated;
-- COMMIT;
