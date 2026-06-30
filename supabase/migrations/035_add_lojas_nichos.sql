-- Migration 035: Add lojas.nichos array column
-- Fase 9.15B — Nichos e Categorias Padronizadas por Loja

ALTER TABLE lojas ADD COLUMN IF NOT EXISTS nichos TEXT[] DEFAULT '{}';
