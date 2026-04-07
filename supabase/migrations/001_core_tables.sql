-- ============================================
-- Migration 001: Core Tables
-- Merchants, Influencers, Campaigns, Applications, Affiliate Links
-- ============================================

-- MERCHANTS (linked to Shopify stores)
CREATE TABLE merchants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shopify_domain text UNIQUE NOT NULL,
  shopify_access_token text NOT NULL,
  shopify_shop_id text NOT NULL,
  name text NOT NULL,
  email text NOT NULL,
  logo_url text,
  stripe_customer_id text,
  stripe_subscription_id text,
  subscription_plan text DEFAULT 'starter' CHECK (subscription_plan IN ('starter', 'growth', 'enterprise')),
  subscription_status text DEFAULT 'trialing' CHECK (subscription_status IN ('trialing', 'active', 'past_due', 'cancelled')),
  platform_fee_percent numeric(5,2) DEFAULT 10.00,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- INFLUENCERS (authenticated via Supabase Auth)
CREATE TABLE influencers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text UNIQUE NOT NULL,
  avatar_url text,
  bio text,
  website_url text,
  instagram_handle text,
  tiktok_handle text,
  youtube_channel text,
  primary_niche text CHECK (primary_niche IN (
    'fashion', 'beauty', 'tech', 'lifestyle', 'fitness',
    'food', 'travel', 'gaming', 'other'
  )),
  audience_size int,
  audience_demographics jsonb DEFAULT '{}'::jsonb,
  stripe_account_id text,
  stripe_account_status text DEFAULT 'pending' CHECK (stripe_account_status IN ('pending', 'active', 'restricted')),
  total_earnings numeric(12,2) DEFAULT 0,
  total_paid_out numeric(12,2) DEFAULT 0,
  is_verified boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_influencers_user_id ON influencers(user_id);
CREATE INDEX idx_influencers_email ON influencers(email);

-- CAMPAIGNS (created by merchants)
CREATE TABLE campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  cover_image_url text,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'ended')),
  product_scope text DEFAULT 'all' CHECK (product_scope IN ('all', 'specific')),
  product_ids text[],
  cookie_duration_days int DEFAULT 30,
  max_influencers int,
  application_required boolean DEFAULT true,
  start_date date,
  end_date date,
  commission_tiers jsonb NOT NULL DEFAULT '[
    {"name": "Starter", "min_revenue": 0, "max_revenue": 1000, "percent": 5},
    {"name": "Silver", "min_revenue": 1001, "max_revenue": 5000, "percent": 8},
    {"name": "Gold", "min_revenue": 5001, "max_revenue": 20000, "percent": 12},
    {"name": "Platinum", "min_revenue": 20001, "max_revenue": null, "percent": 15}
  ]'::jsonb,
  validation_days int DEFAULT 14,
  total_revenue_generated numeric(12,2) DEFAULT 0,
  total_commissions_paid numeric(12,2) DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_campaigns_merchant_id ON campaigns(merchant_id);
CREATE INDEX idx_campaigns_status ON campaigns(status);

-- CAMPAIGN APPLICATIONS
CREATE TABLE campaign_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  influencer_id uuid NOT NULL REFERENCES influencers(id) ON DELETE CASCADE,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  message text,
  rejection_reason text,
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES merchants(id),
  created_at timestamptz DEFAULT now(),
  UNIQUE(campaign_id, influencer_id)
);

CREATE INDEX idx_applications_campaign_id ON campaign_applications(campaign_id);
CREATE INDEX idx_applications_influencer_id ON campaign_applications(influencer_id);
CREATE INDEX idx_applications_status ON campaign_applications(status);

-- AFFILIATE LINKS
CREATE TABLE affiliate_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  influencer_id uuid NOT NULL REFERENCES influencers(id) ON DELETE CASCADE,
  short_code text UNIQUE NOT NULL,
  discount_code text UNIQUE NOT NULL, -- Shopify discount code for attribution
  full_url text NOT NULL,
  utm_source text,
  utm_medium text DEFAULT 'influencer',
  utm_campaign text,
  total_clicks int DEFAULT 0,
  unique_clicks int DEFAULT 0,
  total_conversions int DEFAULT 0,
  total_revenue numeric(12,2) DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(campaign_id, influencer_id)
);

CREATE INDEX idx_affiliate_links_short_code ON affiliate_links(short_code);
CREATE INDEX idx_affiliate_links_discount_code ON affiliate_links(discount_code);
CREATE INDEX idx_affiliate_links_campaign_id ON affiliate_links(campaign_id);
CREATE INDEX idx_affiliate_links_influencer_id ON affiliate_links(influencer_id);
