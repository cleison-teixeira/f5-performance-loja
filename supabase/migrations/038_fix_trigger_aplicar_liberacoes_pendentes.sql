-- Causa do bug: ambas as funções de trigger referenciam tabelas sem schema qualifier.
-- Quando disparadas por auth.users, o search_path padrão não inclui public,
-- causando "relation perfis does not exist" e rollback de toda a transação de signup.
--
-- Fix: SET search_path = public + prefixos public. explícitos + EXCEPTION defensivo.

CREATE OR REPLACE FUNCTION public.aplicar_liberacoes_pendentes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  lib RECORD;
BEGIN
  -- Garante perfil antes de vincular membros_loja
  INSERT INTO public.perfis (id, nome)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'nome',
      NEW.raw_user_meta_data->>'name',
      split_part(NEW.email, '@', 1)
    )
  )
  ON CONFLICT (id) DO NOTHING;

  FOR lib IN
    SELECT * FROM public.liberacoes_acesso
    WHERE LOWER(email) = LOWER(NEW.email)
      AND status = 'pendente'
  LOOP
    INSERT INTO public.membros_loja (loja_id, perfil_id, role, ativo)
    VALUES (lib.loja_id, NEW.id, lib.role, true)
    ON CONFLICT (loja_id, perfil_id)
    DO UPDATE SET role = EXCLUDED.role, ativo = true;

    UPDATE public.liberacoes_acesso
    SET status = 'aplicado', aplicado_em = NOW()
    WHERE id = lib.id;
  END LOOP;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Nunca bloquear o cadastro por falha na liberação pendente
    RETURN NEW;
END;
$$;

-- Também corrigir handle_new_user: adicionar ON CONFLICT + EXCEPTION + search_path
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.perfis (id, nome)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'nome',
      NEW.raw_user_meta_data->>'name',
      split_part(NEW.email, '@', 1)
    )
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NEW;
END;
$$;
