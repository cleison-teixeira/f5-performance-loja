-- Migration 024: Cadência Inteligente, Follow-up, Templates e Ciclo de Recompra
--

-- 1. Auditar e remover dinamicamente qualquer check constraint existente nas tabelas e colunas alvo no schema public
DO $$
DECLARE
    r RECORD;
BEGIN
    -- Drop check constraints on public.mensagens_produto for column 'tipo'
    FOR r IN (
        SELECT c.conname 
        FROM pg_constraint c
        JOIN pg_attribute a ON a.attnum = ANY(c.conkey) AND a.attrelid = c.conrelid
        WHERE c.conrelid = 'public.mensagens_produto'::regclass 
          AND c.contype = 'c' 
          AND a.attname = 'tipo'
    ) LOOP
        EXECUTE 'ALTER TABLE public.mensagens_produto DROP CONSTRAINT ' || quote_ident(r.conname);
    END LOOP;

    -- Drop check constraints on public.mensagens_produto for column 'ordem'
    FOR r IN (
        SELECT c.conname 
        FROM pg_constraint c
        JOIN pg_attribute a ON a.attnum = ANY(c.conkey) AND a.attrelid = c.conrelid
        WHERE c.conrelid = 'public.mensagens_produto'::regclass 
          AND c.contype = 'c' 
          AND a.attname = 'ordem'
    ) LOOP
        EXECUTE 'ALTER TABLE public.mensagens_produto DROP CONSTRAINT ' || quote_ident(r.conname);
    END LOOP;

    -- Drop check constraints on public.produtos for column 'qtd_mensagens'
    FOR r IN (
        SELECT c.conname 
        FROM pg_constraint c
        JOIN pg_attribute a ON a.attnum = ANY(c.conkey) AND a.attrelid = c.conrelid
        WHERE c.conrelid = 'public.produtos'::regclass 
          AND c.contype = 'c' 
          AND a.attname = 'qtd_mensagens'
    ) LOOP
        EXECUTE 'ALTER TABLE public.produtos DROP CONSTRAINT ' || quote_ident(r.conname);
    END LOOP;
END $$;

-- 2. Criar ou garantir colunas nas tabelas public (sem constraints inline)
ALTER TABLE public.mensagens_produto ADD COLUMN IF NOT EXISTS estilo TEXT DEFAULT 'clean';
ALTER TABLE public.mensagens_produto ADD COLUMN IF NOT EXISTS tipo_incentivo TEXT DEFAULT 'nenhum';
ALTER TABLE public.mensagens_produto ADD COLUMN IF NOT EXISTS cupom_codigo TEXT;
ALTER TABLE public.mensagens_produto ADD COLUMN IF NOT EXISTS desconto_percentual NUMERIC(5,2);
ALTER TABLE public.mensagens_produto ADD COLUMN IF NOT EXISTS desconto_valor NUMERIC(10,2);
ALTER TABLE public.mensagens_produto ADD COLUMN IF NOT EXISTS beneficio_texto TEXT;
ALTER TABLE public.mensagens_produto ADD COLUMN IF NOT EXISTS validade_oferta TEXT;

ALTER TABLE public.itens_venda ADD COLUMN IF NOT EXISTS ciclo_recompra_dias INTEGER;

-- 3. Adicionar check constraints nomeados e blindados com checks adicionais
ALTER TABLE public.mensagens_produto DROP CONSTRAINT IF EXISTS check_mensagens_produto_estilo;
ALTER TABLE public.mensagens_produto ADD CONSTRAINT check_mensagens_produto_estilo CHECK (estilo IN ('clean', 'consultivo', 'persuasivo', 'incentivo'));

ALTER TABLE public.mensagens_produto DROP CONSTRAINT IF EXISTS check_mensagens_produto_tipo_incentivo;
ALTER TABLE public.mensagens_produto ADD CONSTRAINT check_mensagens_produto_tipo_incentivo CHECK (tipo_incentivo IN ('nenhum', 'cupom', 'desconto_percentual', 'desconto_valor', 'brinde', 'condicao_especial', 'frete_gratis', 'combo'));

ALTER TABLE public.mensagens_produto DROP CONSTRAINT IF EXISTS check_mensagens_produto_ordem;
ALTER TABLE public.mensagens_produto ADD CONSTRAINT check_mensagens_produto_ordem CHECK (ordem IN (1, 2, 3, 4, 5));

ALTER TABLE public.mensagens_produto DROP CONSTRAINT IF EXISTS check_mensagens_produto_tipo;
ALTER TABLE public.mensagens_produto ADD CONSTRAINT check_mensagens_produto_tipo CHECK (tipo IN ('agradecimento', 'relacionamento', 'recompra', 'oferta', 'follow_up'));

ALTER TABLE public.mensagens_produto DROP CONSTRAINT IF EXISTS check_mensagens_produto_desconto_percentual;
ALTER TABLE public.mensagens_produto ADD CONSTRAINT check_mensagens_produto_desconto_percentual CHECK (desconto_percentual IS NULL OR (desconto_percentual >= 0 AND desconto_percentual <= 100));

ALTER TABLE public.mensagens_produto DROP CONSTRAINT IF EXISTS check_mensagens_produto_desconto_valor;
ALTER TABLE public.mensagens_produto ADD CONSTRAINT check_mensagens_produto_desconto_valor CHECK (desconto_valor IS NULL OR desconto_valor >= 0);

ALTER TABLE public.produtos DROP CONSTRAINT IF EXISTS check_produtos_qtd_mensagens;
ALTER TABLE public.produtos ADD CONSTRAINT check_produtos_qtd_mensagens CHECK (qtd_mensagens IN (1, 2, 3, 4, 5));

ALTER TABLE public.itens_venda DROP CONSTRAINT IF EXISTS check_itens_venda_ciclo_recompra_dias;
ALTER TABLE public.itens_venda ADD CONSTRAINT check_itens_venda_ciclo_recompra_dias CHECK (ciclo_recompra_dias IS NULL OR ciclo_recompra_dias > 0);

-- 4. Bloco de validação pós-migration (com schema public explícito e verificação completa)
DO $$
DECLARE
    col_name TEXT;
    cols_to_check TEXT[] := ARRAY['estilo', 'tipo_incentivo', 'cupom_codigo', 'desconto_percentual', 'desconto_valor', 'beneficio_texto', 'validade_oferta'];
BEGIN
    -- Validar que a coluna ciclo_recompra_dias existe em public.itens_venda
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'itens_venda' AND column_name = 'ciclo_recompra_dias'
    ) THEN
        RAISE EXCEPTION 'Erro de Validação: Coluna ciclo_recompra_dias não existe na tabela public.itens_venda';
    END IF;

    -- Validar todas as novas colunas em public.mensagens_produto
    FOREACH col_name IN ARRAY cols_to_check LOOP
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'mensagens_produto' AND column_name = col_name
        ) THEN
            RAISE EXCEPTION 'Erro de Validação: Coluna % não existe na tabela public.mensagens_produto', col_name;
        END IF;
    END LOOP;

    -- Validar as constraints na tabela public.mensagens_produto
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conrelid = 'public.mensagens_produto'::regclass AND conname = 'check_mensagens_produto_tipo'
    ) THEN
        RAISE EXCEPTION 'Erro de Validação: Constraint check_mensagens_produto_tipo não existe em public.mensagens_produto';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conrelid = 'public.mensagens_produto'::regclass AND conname = 'check_mensagens_produto_ordem'
    ) THEN
        RAISE EXCEPTION 'Erro de Validação: Constraint check_mensagens_produto_ordem não existe em public.mensagens_produto';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conrelid = 'public.mensagens_produto'::regclass AND conname = 'check_mensagens_produto_desconto_percentual'
    ) THEN
        RAISE EXCEPTION 'Erro de Validação: Constraint check_mensagens_produto_desconto_percentual não existe em public.mensagens_produto';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conrelid = 'public.mensagens_produto'::regclass AND conname = 'check_mensagens_produto_desconto_valor'
    ) THEN
        RAISE EXCEPTION 'Erro de Validação: Constraint check_mensagens_produto_desconto_valor não existe em public.mensagens_produto';
    END IF;

    -- Validar a constraint na tabela public.produtos
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conrelid = 'public.produtos'::regclass AND conname = 'check_produtos_qtd_mensagens'
    ) THEN
        RAISE EXCEPTION 'Erro de Validação: Constraint check_produtos_qtd_mensagens não existe em public.produtos';
    END IF;

    -- Validar a constraint na tabela public.itens_venda
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conrelid = 'public.itens_venda'::regclass AND conname = 'check_itens_venda_ciclo_recompra_dias'
    ) THEN
        RAISE EXCEPTION 'Erro de Validação: Constraint check_itens_venda_ciclo_recompra_dias não existe em public.itens_venda';
    END IF;
END $$;
