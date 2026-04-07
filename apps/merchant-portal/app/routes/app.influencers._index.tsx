import { useState, useCallback } from "react";
import { useLoaderData } from "react-router";
import type { LoaderFunctionArgs } from "react-router";
import {
  Page,
  Card,
  DataTable,
  BlockStack,
  Text,
  Box,
  Select,
  InlineStack,
  EmptyState,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { createServiceClient } from "@adltix/database";
import { formatCurrency } from "@adltix/utils";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const supabase = createServiceClient();

  const url = new URL(request.url);
  const campaignFilter = url.searchParams.get("campaign") || "all";

  // Get merchant
  const { data: merchant } = await supabase
    .from("merchants")
    .select("id")
    .eq("shopify_domain", session.shop)
    .single();

  if (!merchant) {
    return { influencers: [], campaigns: [], selectedCampaign: "all" };
  }

  // Get merchant's campaigns for filter dropdown
  const { data: campaigns } = await supabase
    .from("campaigns")
    .select("id, name")
    .eq("merchant_id", merchant.id)
    .order("name");

  // Get all affiliate links for this merchant (with influencer data)
  let linksQuery = supabase
    .from("affiliate_links")
    .select(`
      id,
      campaign_id,
      influencer_id,
      total_clicks,
      total_conversions,
      total_revenue,
      is_active,
      influencers (
        id,
        first_name,
        last_name,
        email,
        niche
      ),
      campaigns (
        id,
        name
      )
    `)
    .eq("merchant_id", merchant.id)
    .eq("is_active", true);

  if (campaignFilter && campaignFilter !== "all") {
    linksQuery = linksQuery.eq("campaign_id", campaignFilter);
  }

  const { data: links } = await linksQuery;

  // Get commissions for each influencer
  const { data: commissions } = await supabase
    .from("commissions")
    .select("influencer_id, net_amount")
    .eq("merchant_id", merchant.id);

  const commissionsByInfluencer = new Map<string, number>();
  for (const c of commissions || []) {
    const current = commissionsByInfluencer.get(c.influencer_id) || 0;
    commissionsByInfluencer.set(c.influencer_id, current + Number(c.net_amount || 0));
  }

  // Aggregate by influencer
  const influencerMap = new Map<
    string,
    {
      id: string;
      name: string;
      email: string;
      niche: string;
      campaignNames: Set<string>;
      totalRevenue: number;
      totalCommission: number;
    }
  >();

  for (const link of links || []) {
    const influencer = link.influencers as any;
    const campaign = link.campaigns as any;
    if (!influencer) continue;

    const existing = influencerMap.get(link.influencer_id);
    if (existing) {
      if (campaign?.name) existing.campaignNames.add(campaign.name);
      existing.totalRevenue += Number(link.total_revenue || 0);
    } else {
      const name =
        `${influencer.first_name || ""} ${influencer.last_name || ""}`.trim() || "Unknown";
      influencerMap.set(link.influencer_id, {
        id: link.influencer_id,
        name,
        email: influencer.email || "",
        niche: influencer.niche || "",
        campaignNames: new Set(campaign?.name ? [campaign.name] : []),
        totalRevenue: Number(link.total_revenue || 0),
        totalCommission: commissionsByInfluencer.get(link.influencer_id) || 0,
      });
    }
  }

  const influencers = Array.from(influencerMap.values()).map((inf) => ({
    ...inf,
    campaignsCount: inf.campaignNames.size,
    campaignNames: Array.from(inf.campaignNames),
  }));

  // Sort by total revenue descending
  influencers.sort((a, b) => b.totalRevenue - a.totalRevenue);

  return {
    influencers,
    campaigns: campaigns || [],
    selectedCampaign: campaignFilter,
  };
};

export default function InfluencersIndex() {
  const { influencers, campaigns, selectedCampaign } =
    useLoaderData<typeof loader>();
  const [campaignFilter, setCampaignFilter] = useState(selectedCampaign);

  const handleFilterChange = useCallback((value: string) => {
    setCampaignFilter(value);
    const url = new URL(window.location.href);
    if (value === "all") {
      url.searchParams.delete("campaign");
    } else {
      url.searchParams.set("campaign", value);
    }
    window.location.href = url.toString();
  }, []);

  const campaignOptions = [
    { label: "All Campaigns", value: "all" },
    ...campaigns.map((c) => ({ label: c.name, value: c.id })),
  ];

  if (influencers.length === 0) {
    return (
      <Page title="Influencers">
        <Card>
          <EmptyState
            heading="No influencers yet"
            image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
          >
            <p>
              Once influencers are approved for your campaigns, they will
              appear here with their performance data.
            </p>
          </EmptyState>
        </Card>
      </Page>
    );
  }

  const rows = influencers.map((inf) => [
    <Text as="span" fontWeight="semibold">
      {inf.name}
    </Text>,
    inf.email,
    inf.niche || "—",
    String(inf.campaignsCount),
    formatCurrency(inf.totalRevenue),
    formatCurrency(inf.totalCommission),
  ]);

  return (
    <Page title="Influencers">
      <BlockStack gap="500">
        <Card>
          <BlockStack gap="400">
            <InlineStack align="space-between" blockAlign="end">
              <Text as="h2" variant="headingMd">
                All Influencers
              </Text>
              <div style={{ width: "250px" }}>
                <Select
                  label="Filter by Campaign"
                  labelHidden
                  options={campaignOptions}
                  value={campaignFilter}
                  onChange={handleFilterChange}
                />
              </div>
            </InlineStack>
            <DataTable
              columnContentTypes={[
                "text",
                "text",
                "text",
                "numeric",
                "numeric",
                "numeric",
              ]}
              headings={[
                "Name",
                "Email",
                "Niche",
                "Campaigns",
                "Total Revenue",
                "Total Commission",
              ]}
              rows={rows}
              totals={[
                "",
                "",
                "",
                "",
                formatCurrency(
                  influencers.reduce((sum, i) => sum + i.totalRevenue, 0)
                ),
                formatCurrency(
                  influencers.reduce((sum, i) => sum + i.totalCommission, 0)
                ),
              ]}
              showTotalsInFooter
            />
          </BlockStack>
        </Card>
      </BlockStack>
    </Page>
  );
}
