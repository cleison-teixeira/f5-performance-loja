-- Rede operacional entre lojas (grupo_rede_id)
-- Substitui empresa_id como identificador de rede para Demandas da Rede.
-- Cada loja pode pertencer a exatamente um grupo operacional (grupo_rede_id nullable).
-- Lojas sem grupo_rede_id continuam funcionando normalmente — sem acesso a demandas da rede.

-- ─── 1. Tabela grupos_rede ────────────────────────────────────────────────────

CREATE TABLE grupos_rede (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  nome          text        NOT NULL,
  ativo         boolean     NOT NULL DEFAULT true,
  criado_em     timestamptz NOT NULL DEFAULT NOW(),
  atualizado_em timestamptz NOT NULL DEFAULT NOW()
);

ALTER TABLE grupos_rede ENABLE ROW LEVEL SECURITY;

-- Usuários autenticados podem ler grupos (necessário para joins no client)
CREATE POLICY "grupos_rede_select" ON grupos_rede
  FOR SELECT USING (true);

-- ─── 2. grupo_rede_id em lojas ────────────────────────────────────────────────

ALTER TABLE lojas
  ADD COLUMN grupo_rede_id uuid REFERENCES grupos_rede(id) ON DELETE SET NULL;

CREATE INDEX idx_lojas_grupo_rede
  ON lojas(grupo_rede_id)
  WHERE grupo_rede_id IS NOT NULL;

-- ─── 3. grupo_rede_id em demandas_rede ────────────────────────────────────────

ALTER TABLE demandas_rede
  ADD COLUMN grupo_rede_id uuid REFERENCES grupos_rede(id) ON DELETE SET NULL;

CREATE INDEX idx_demandas_rede_grupo_rede
  ON demandas_rede(grupo_rede_id)
  WHERE grupo_rede_id IS NOT NULL;

-- empresa_id torna-se nullable para compatibilidade com dados existentes.
-- Não é mais usado como escopo de rede — mantido apenas como referência histórica.
ALTER TABLE demandas_rede
  ALTER COLUMN empresa_id DROP NOT NULL;

-- ─── 4. Atualizar RLS de demandas_rede para usar grupo_rede_id ────────────────

DROP POLICY IF EXISTS "demandas_rede_select"          ON demandas_rede;
DROP POLICY IF EXISTS "demandas_rede_respostas_select" ON demandas_rede_respostas;

-- SELECT: membro de qualquer loja do mesmo grupo_rede_id pode ler
CREATE POLICY "demandas_rede_select" ON demandas_rede
  FOR SELECT USING (
    grupo_rede_id IS NOT NULL
    AND grupo_rede_id IN (
      SELECT l.grupo_rede_id
      FROM lojas l
      WHERE l.id IN (SELECT lojas_do_usuario())
        AND l.grupo_rede_id IS NOT NULL
    )
  );

-- SELECT respostas: mesmo critério via demanda pai
CREATE POLICY "demandas_rede_respostas_select" ON demandas_rede_respostas
  FOR SELECT USING (
    demanda_id IN (
      SELECT dr.id FROM demandas_rede dr
      WHERE dr.grupo_rede_id IS NOT NULL
        AND dr.grupo_rede_id IN (
          SELECT l.grupo_rede_id
          FROM lojas l
          WHERE l.id IN (SELECT lojas_do_usuario())
            AND l.grupo_rede_id IS NOT NULL
        )
    )
  );
