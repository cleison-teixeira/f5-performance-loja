-- Migration 023: Enrich produtos table with metadata
-- Add columns for niche, partner, category, gallery URLs, and variants safely.

ALTER TABLE produtos ADD COLUMN IF NOT EXISTS nicho TEXT;
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS parceiro TEXT;
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS categoria TEXT;
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS galeria_urls TEXT[] DEFAULT '{}';
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS variantes TEXT[] DEFAULT '{}';
