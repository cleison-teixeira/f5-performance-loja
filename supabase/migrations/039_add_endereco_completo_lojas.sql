-- Adiciona campos de endereço estruturado à tabela lojas.
-- Os campos cidade e endereco existentes são mantidos por compatibilidade.
ALTER TABLE lojas
  ADD COLUMN IF NOT EXISTS cep         text,
  ADD COLUMN IF NOT EXISTS rua         text,
  ADD COLUMN IF NOT EXISTS numero      text,
  ADD COLUMN IF NOT EXISTS bairro      text,
  ADD COLUMN IF NOT EXISTS estado      text,
  ADD COLUMN IF NOT EXISTS complemento text;
