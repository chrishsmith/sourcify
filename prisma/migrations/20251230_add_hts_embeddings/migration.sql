-- Migration: Add pgvector for semantic HTS search
-- This enables hierarchical embeddings for fast, accurate classification

-- 1. Enable pgvector extension (Supabase/Neon have this pre-installed)
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Add embedding column to hts_code table
-- Using 1536 dimensions (OpenAI text-embedding-3-small)
ALTER TABLE hts_code 
ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- 3. Add hierarchical context column for richer embeddings
-- This stores the full path description used to generate the embedding
ALTER TABLE hts_code
ADD COLUMN IF NOT EXISTS embedding_context TEXT;

-- 4. Create HNSW index for fast approximate nearest neighbor search
-- HNSW is faster than IVFFlat for high-recall queries
CREATE INDEX IF NOT EXISTS idx_hts_code_embedding 
ON hts_code 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- 5. Create a function to search HTS codes by embedding similarity
CREATE OR REPLACE FUNCTION search_hts_by_embedding(
  query_embedding vector(1536),
  match_count INT DEFAULT 20,
  min_similarity FLOAT DEFAULT 0.5
)
RETURNS TABLE (
  code TEXT,
  code_formatted TEXT,
  level TEXT,
  description TEXT,
  chapter TEXT,
  heading TEXT,
  general_rate TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    h.code,
    h.code_formatted,
    h.level::TEXT,
    h.description,
    h.chapter,
    h.heading,
    h.general_rate,
    1 - (h.embedding <=> query_embedding) AS similarity
  FROM hts_code h
  WHERE h.embedding IS NOT NULL
    AND h.level IN ('tariff_line', 'statistical')
    AND 1 - (h.embedding <=> query_embedding) > min_similarity
  ORDER BY h.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- 6. Create a materialized view for heading-level embeddings (for faster chapter/heading search)
CREATE MATERIALIZED VIEW IF NOT EXISTS hts_heading_embeddings AS
SELECT 
  h.heading,
  h.chapter,
  MAX(h.description) AS heading_description,
  AVG(h.embedding) AS avg_embedding
FROM hts_code h
WHERE h.level = 'heading' AND h.embedding IS NOT NULL
GROUP BY h.heading, h.chapter;

-- Index for the materialized view
CREATE INDEX IF NOT EXISTS idx_hts_heading_embedding 
ON hts_heading_embeddings 
USING hnsw (avg_embedding vector_cosine_ops);

-- 7. Track embedding generation status
ALTER TABLE hts_code
ADD COLUMN IF NOT EXISTS embedding_generated_at TIMESTAMP;


