-- Migration 037: Admin F5 standalone — lojas.admin_only + liberacoes_acesso + trigger
-- Fase 9.16B (correção) — Admin standalone separado do app operacional
--
-- Regras:
--   • Não dropa dados, tabelas ou colunas existentes.
--   • Não altera vendas, recompra, produtos, clientes ou lista de espera.

-- ── Parte A: flag admin_only em lojas ────────────────────────────────────────
-- Lojas marcadas com admin_only=true ficam invisíveis no contexto operacional.
ALTER TABLE lojas ADD COLUMN IF NOT EXISTS admin_only BOOLEAN DEFAULT FALSE;

-- ── Parte B: tabela liberacoes_acesso ─────────────────────────────────────────
-- Permite liberar acesso para usuário que ainda não criou conta no Auth.
-- Trigger (Parte C) aplica automaticamente ao criar conta.

CREATE TABLE IF NOT EXISTS liberacoes_acesso (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email           TEXT NOT NULL,
  nome            TEXT,
  whatsapp        TEXT,
  empresa_id      UUID REFERENCES empresas(id) ON DELETE CASCADE,
  loja_id         UUID REFERENCES lojas(id)   ON DELETE CASCADE,
  role            TEXT NOT NULL DEFAULT 'dono'
                    CHECK (role IN ('admin_f5', 'dono', 'gerente', 'vendedora')),
  plano_id        UUID REFERENCES planos(id)  ON DELETE SET NULL,
  status          TEXT NOT NULL DEFAULT 'pendente'
                    CHECK (status IN ('pendente', 'aplicado', 'cancelado')),
  origem          TEXT,
  valor_pago      NUMERIC(10,2),
  prazo_acesso    DATE,
  observacao      TEXT,
  comprovante_url TEXT,
  criado_por      UUID REFERENCES perfis(id)  ON DELETE SET NULL,
  criado_em       TIMESTAMPTZ DEFAULT NOW(),
  aplicado_em     TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_liberacoes_email  ON liberacoes_acesso(LOWER(email));
CREATE INDEX IF NOT EXISTS idx_liberacoes_status ON liberacoes_acesso(status);

-- ── Parte C: trigger de auto-aplicação ────────────────────────────────────────
-- Dispara AFTER INSERT em auth.users (mesmo evento que handle_new_user).
-- Independente: não modifica o trigger existente.

CREATE OR REPLACE FUNCTION aplicar_liberacoes_pendentes()
RETURNS TRIGGER AS $$
DECLARE
  lib RECORD;
BEGIN
  -- Garantir que perfis existe antes de inserir em membros_loja
  -- (defensive: handle_new_user já cria, mas evita race condition entre triggers)
  INSERT INTO perfis (id, nome)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;

  -- Aplicar todas as liberações pendentes para esse e-mail
  FOR lib IN
    SELECT * FROM liberacoes_acesso
    WHERE LOWER(email) = LOWER(NEW.email)
      AND status = 'pendente'
  LOOP
    INSERT INTO membros_loja (loja_id, perfil_id, role, ativo)
    VALUES (lib.loja_id, NEW.id, lib.role, true)
    ON CONFLICT (loja_id, perfil_id)
    DO UPDATE SET role = EXCLUDED.role, ativo = true;

    UPDATE liberacoes_acesso
    SET status = 'aplicado', aplicado_em = NOW()
    WHERE id = lib.id;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_liberacao ON auth.users;
CREATE TRIGGER on_auth_user_liberacao
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION aplicar_liberacoes_pendentes();

-- ── Validação ─────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'lojas' AND column_name = 'admin_only'
  ) THEN
    RAISE EXCEPTION 'Validação 037: coluna lojas.admin_only não existe';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'liberacoes_acesso'
  ) THEN
    RAISE EXCEPTION 'Validação 037: tabela liberacoes_acesso não existe';
  END IF;
END $$;
