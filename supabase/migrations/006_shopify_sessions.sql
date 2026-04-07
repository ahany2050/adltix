-- ============================================
-- Migration 006: Shopify Session Storage
-- Used by @shopify/shopify-app-session-storage-postgresql
-- ============================================

CREATE TABLE shopify_sessions (
  id text PRIMARY KEY,
  shop text NOT NULL,
  state text,
  is_online boolean DEFAULT false,
  scope text,
  expires timestamptz,
  access_token text,
  user_id bigint,
  first_name text,
  last_name text,
  email text,
  account_owner boolean DEFAULT false,
  locale text,
  collaborator boolean DEFAULT false,
  email_verified boolean DEFAULT false
);

CREATE INDEX idx_shopify_sessions_shop ON shopify_sessions(shop);

-- No RLS needed — only accessed via service_role key from Shopify app backend
ALTER TABLE shopify_sessions ENABLE ROW LEVEL SECURITY;
