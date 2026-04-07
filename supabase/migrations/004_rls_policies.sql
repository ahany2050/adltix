-- ============================================
-- Migration 004: Row Level Security Policies
-- ============================================
-- Strategy:
-- - Merchants: Access via service_role key (bypasses RLS) from Shopify app backend
-- - Influencers: Access via Supabase Auth with auth.uid() = influencer.user_id
-- - Clicks: Anonymous inserts allowed (redirect handler)

-- Enable RLS on all tables
ALTER TABLE merchants ENABLE ROW LEVEL SECURITY;
ALTER TABLE influencers ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- INFLUENCER POLICIES (using auth.uid())
-- ==========================================

-- Influencers can read their own profile
CREATE POLICY "influencers_select_own" ON influencers
  FOR SELECT USING (user_id = auth.uid());

-- Influencers can update their own profile
CREATE POLICY "influencers_update_own" ON influencers
  FOR UPDATE USING (user_id = auth.uid());

-- Influencers can insert their own profile (registration)
CREATE POLICY "influencers_insert_own" ON influencers
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Influencers can read all active campaigns (browsing)
CREATE POLICY "influencers_select_active_campaigns" ON campaigns
  FOR SELECT USING (status = 'active');

-- Influencers can read their own applications
CREATE POLICY "influencers_select_own_applications" ON campaign_applications
  FOR SELECT USING (influencer_id IN (
    SELECT id FROM influencers WHERE user_id = auth.uid()
  ));

-- Influencers can create applications
CREATE POLICY "influencers_insert_applications" ON campaign_applications
  FOR INSERT WITH CHECK (influencer_id IN (
    SELECT id FROM influencers WHERE user_id = auth.uid()
  ));

-- Influencers can read their own affiliate links
CREATE POLICY "influencers_select_own_links" ON affiliate_links
  FOR SELECT USING (influencer_id IN (
    SELECT id FROM influencers WHERE user_id = auth.uid()
  ));

-- Influencers can read their own orders
CREATE POLICY "influencers_select_own_orders" ON orders
  FOR SELECT USING (influencer_id IN (
    SELECT id FROM influencers WHERE user_id = auth.uid()
  ));

-- Influencers can read their own commissions
CREATE POLICY "influencers_select_own_commissions" ON commissions
  FOR SELECT USING (influencer_id IN (
    SELECT id FROM influencers WHERE user_id = auth.uid()
  ));

-- Influencers can read their own payouts
CREATE POLICY "influencers_select_own_payouts" ON payouts
  FOR SELECT USING (influencer_id IN (
    SELECT id FROM influencers WHERE user_id = auth.uid()
  ));

-- ==========================================
-- ANONYMOUS / PUBLIC POLICIES
-- ==========================================

-- Anonymous users can insert clicks (affiliate redirect handler uses anon key)
CREATE POLICY "anon_insert_clicks" ON clicks
  FOR INSERT WITH CHECK (true);

-- Anonymous users can read affiliate links (for the redirect handler)
CREATE POLICY "anon_select_affiliate_links" ON affiliate_links
  FOR SELECT USING (is_active = true);

-- ==========================================
-- SERVICE ROLE NOTE
-- ==========================================
-- The service_role key bypasses RLS entirely.
-- Merchant-facing operations in the Shopify app use service_role,
-- with application-level filtering by merchant_id/shopify_domain.
-- No explicit policies needed for merchant CRUD operations.
