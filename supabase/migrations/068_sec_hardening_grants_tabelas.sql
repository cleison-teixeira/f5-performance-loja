-- SEC-0002: hardening de grants (defesa em profundidade pós-SEC-0001).
--
-- Contexto: o SEC-0001 (migration 067) fechou a escalação de privilégio
-- habilitando RLS sem policy nas 7 tabelas abaixo, o que já bloqueia
-- anon/authenticated por padrão (deny-all). Porém os GRANTs de tabela
-- continuavam amplos no catálogo (SELECT/INSERT/UPDATE/DELETE/TRUNCATE/
-- REFERENCES/TRIGGER para anon e authenticated) — a proteção real hoje
-- depende só do RLS, não do próprio grant.
--
-- Auditoria (SEC-0002, somente leitura, staging e produção):
--   - 37 ocorrências de acesso a essas 7 tabelas em todo o código da
--     aplicação; 37/37 usam o client admin (service role), que bypassa
--     RLS e grants. Zero uso do client anon/authenticated (browser ou
--     sessão do usuário). Nenhuma rota pública (/login, /cadastro,
--     /recuperar-senha, /atualizar-senha) toca qualquer uma delas.
--   - assinaturas: zero uso em todo o código-fonte.
--   - Única função que referencia essas tabelas é
--     aplicar_liberacoes_pendentes (SECURITY DEFINER, dono postgres,
--     trigger em auth.users) — roda com o privilégio do dono, não do
--     anon/authenticated que dispara o cadastro. Revogar grants diretos
--     não afeta esse fluxo.
--   - Zero views, materialized views ou triggers nas 7 tabelas.
--
-- Conclusão: nenhuma das 7 tabelas tem uso comprovado via anon ou
-- authenticated. Revogação total para essas duas roles, sem GRANT de
-- substituição — o acesso legítimo (admin/service_role) não é afetado.
--
-- Idempotente: REVOKE não falha se o privilégio já não existir.
-- Não desabilita RLS. Não cria policy. Não altera dados, triggers,
-- schema funcional ou owners. Não concede nenhum privilégio novo.

BEGIN;

REVOKE ALL PRIVILEGES ON TABLE public.liberacoes_acesso FROM PUBLIC, anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.assinaturas FROM PUBLIC, anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.planos FROM PUBLIC, anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.parceiros FROM PUBLIC, anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.bibliotecas FROM PUBLIC, anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.biblioteca_itens FROM PUBLIC, anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.instalacoes_biblioteca FROM PUBLIC, anon, authenticated;

COMMIT;

-- Rollback (restaura o grant amplo original — não usar sem prova de que
-- algo legítimo passou a depender do grant direto, e não do RLS):
-- BEGIN;
-- GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public.liberacoes_acesso TO anon, authenticated;
-- GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public.assinaturas TO anon, authenticated;
-- GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public.planos TO anon, authenticated;
-- GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public.parceiros TO anon, authenticated;
-- GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public.bibliotecas TO anon, authenticated;
-- GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public.biblioteca_itens TO anon, authenticated;
-- GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public.instalacoes_biblioteca TO anon, authenticated;
-- COMMIT;
