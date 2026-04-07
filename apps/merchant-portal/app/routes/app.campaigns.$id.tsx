import { useState, useCallback } from "react";
import {
  useLoaderData,
  useActionData,
  useSubmit,
  useNavigation,
  useNavigate,
} from "react-router";
import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
import {
  Page,
  Card,
  BlockStack,
  InlineStack,
  InlineGrid,
  Text,
  Badge,
  Button,
  DataTable,
  Tabs,
  Box,
  Banner,
  EmptyState,
  Divider,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { createServiceClient } from "@adltix/database";
import { formatCurrency, generateAffiliateCode } from "@adltix/utils";

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const supabase = createServiceClient();

  const campaignId = params.id;
  if (!campaignId) {
    throw new Response("Campaign ID required", { status: 400 });
  }

  // Get merchant
  const { data: merchant } = await supabase
    .from("merchants")
    .select("id")
    .eq("shopify_domain", session.shop)
    .single();

  if (!merchant) {
    throw new Response("Merchant not found", { status: 404 });
  }

  // Get campaign
  const { data: campaign } = await supabase
    .from("campaigns")
    .select("*")
    .eq("id", campaignId)
    .eq("merchant_id", merchant.id)
    .single();

  if (!campaign) {
    throw new Response("Campaign not found", { status: 404 });
  }

  // Get campaign stats from orders
  const { data: orders } = await supabase
    .from("orders")
    .select("commissionable_amount, influencer_id")
    .eq("campaign_id", campaignId)
    .eq("is_invalidated", false);

  const totalRevenue = (orders || []).reduce(
    (sum, o) => sum + Number(o.commissionable_amount || 0),
    0
  );
  const totalConversions = (orders || []).length;
  const activeInfluencerIds = new Set(
    (orders || []).map((o) => o.influencer_id).filter(Boolean)
  );

  // Get pending applications
  const { data: applications } = await supabase
    .from("campaign_applications")
    .select(`
      id,
      status,
      message,
      created_at,
      influencer_id,
      influencers (
        id,
        first_name,
        last_name,
        email,
        niche,
        instagram_handle,
        tiktok_handle,
        youtube_handle
      )
    `)
    .eq("campaign_id", campaignId)
    .order("created_at", { ascending: false });

  const pendingApplications = (applications || []).filter(
    (a) => a.status === "pending"
  );
  const allApplications = applications || [];

  // Get active influencers with their stats
  const { data: affiliateLinks } = await supabase
    .from("affiliate_links")
    .select(`
      id,
      influencer_id,
      short_code,
      discount_code,
      total_clicks,
      total_conversions,
      total_revenue,
      is_active,
      influencers (
        id,
        first_name,
        last_name,
        email
      )
    `)
    .eq("campaign_id", campaignId)
    .eq("is_active", true);

  // Get commissions for active influencers
  const { data: commissions } = await supabase
    .from("commissions")
    .select("influencer_id, net_amount, status")
    .eq("campaign_id", campaignId);

  const commissionsByInfluencer = new Map<string, number>();
  for (const c of commissions || []) {
    const current = commissionsByInfluencer.get(c.influencer_id) || 0;
    commissionsByInfluencer.set(c.influencer_id, current + Number(c.net_amount || 0));
  }

  const activeInfluencers = (affiliateLinks || []).map((link) => {
    const influencer = link.influencers as any;
    return {
      id: link.influencer_id,
      name: influencer
        ? `${influencer.first_name || ""} ${influencer.last_name || ""}`.trim()
        : "Unknown",
      email: influencer?.email || "",
      shortCode: link.short_code,
      discountCode: link.discount_code,
      clicks: link.total_clicks || 0,
      conversions: link.total_conversions || 0,
      revenue: Number(link.total_revenue || 0),
      commission: commissionsByInfluencer.get(link.influencer_id) || 0,
    };
  });

  return {
    campaign,
    stats: {
      totalRevenue,
      totalConversions,
      activeInfluencers: activeInfluencerIds.size,
    },
    pendingApplications,
    allApplications,
    activeInfluencers,
    shopDomain: session.shop,
  };
};

export const action = async ({ request, params }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const supabase = createServiceClient();
  const formData = await request.formData();
  const intent = formData.get("intent") as string;
  const campaignId = params.id;

  // Get merchant
  const { data: merchant } = await supabase
    .from("merchants")
    .select("id")
    .eq("shopify_domain", session.shop)
    .single();

  if (!merchant) {
    return { error: "Merchant not found" };
  }

  if (intent === "approve") {
    const applicationId = formData.get("applicationId") as string;

    // Get application details
    const { data: application } = await supabase
      .from("campaign_applications")
      .select("id, influencer_id, campaign_id")
      .eq("id", applicationId)
      .single();

    if (!application) {
      return { error: "Application not found" };
    }

    // Update application status
    const { error: updateError } = await supabase
      .from("campaign_applications")
      .update({
        status: "approved",
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", applicationId);

    if (updateError) {
      return { error: "Failed to approve application" };
    }

    // Generate affiliate link and discount code
    const shortCode = generateAffiliateCode();
    const discountCode = `ADLTIX-${generateAffiliateCode()}`;

    const { error: linkError } = await supabase
      .from("affiliate_links")
      .insert({
        campaign_id: application.campaign_id,
        influencer_id: application.influencer_id,
        merchant_id: merchant.id,
        short_code: shortCode,
        discount_code: discountCode,
        destination_url: `https://${session.shop}`,
        is_active: true,
        total_clicks: 0,
        total_conversions: 0,
        total_revenue: 0,
      });

    if (linkError) {
      console.error("Failed to create affiliate link:", linkError);
      return { error: "Approved but failed to create affiliate link. Please try again." };
    }

    return {
      success: true,
      message: `Application approved. Affiliate code: ${shortCode}, Discount: ${discountCode}`,
    };
  }

  if (intent === "reject") {
    const applicationId = formData.get("applicationId") as string;

    const { error: updateError } = await supabase
      .from("campaign_applications")
      .update({
        status: "rejected",
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", applicationId);

    if (updateError) {
      return { error: "Failed to reject application" };
    }

    return { success: true, message: "Application rejected." };
  }

  return { error: "Unknown action" };
};

const statusBadge = (status: string) => {
  const toneMap: Record<string, "success" | "warning" | "critical" | "info"> = {
    active: "success",
    draft: "info",
    paused: "warning",
    ended: "critical",
    pending: "warning",
    approved: "success",
    rejected: "critical",
  };
  return <Badge tone={toneMap[status] || "info"}>{status}</Badge>;
};

export default function CampaignDetail() {
  const {
    campaign,
    stats,
    pendingApplications,
    allApplications,
    activeInfluencers,
  } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const submit = useSubmit();
  const navigation = useNavigation();
  const navigate = useNavigate();
  const isSubmitting = navigation.state === "submitting";

  const [selectedTab, setSelectedTab] = useState(0);

  const handleApprove = useCallback(
    (applicationId: string) => {
      const formData = new FormData();
      formData.set("intent", "approve");
      formData.set("applicationId", applicationId);
      submit(formData, { method: "post" });
    },
    [submit]
  );

  const handleReject = useCallback(
    (applicationId: string) => {
      const formData = new FormData();
      formData.set("intent", "reject");
      formData.set("applicationId", applicationId);
      submit(formData, { method: "post" });
    },
    [submit]
  );

  const tabs = [
    {
      id: "applications",
      content: `Applications (${pendingApplications.length} pending)`,
      panelID: "applications-panel",
    },
    {
      id: "influencers",
      content: `Active Influencers (${activeInfluencers.length})`,
      panelID: "influencers-panel",
    },
  ];

  const applicationRows = allApplications.map((app: any) => {
    const influencer = app.influencers;
    const name = influencer
      ? `${influencer.first_name || ""} ${influencer.last_name || ""}`.trim()
      : "Unknown";
    const handles = [
      influencer?.instagram_handle ? `IG: @${influencer.instagram_handle}` : null,
      influencer?.tiktok_handle ? `TT: @${influencer.tiktok_handle}` : null,
      influencer?.youtube_handle ? `YT: ${influencer.youtube_handle}` : null,
    ]
      .filter(Boolean)
      .join(", ");

    return [
      <Text as="span" fontWeight="semibold">
        {name}
      </Text>,
      influencer?.email || "—",
      influencer?.niche || "—",
      handles || "—",
      app.message || "—",
      statusBadge(app.status),
      app.status === "pending" ? (
        <InlineStack gap="200">
          <Button
            variant="primary"
            size="slim"
            onClick={() => handleApprove(app.id)}
            loading={isSubmitting}
          >
            Approve
          </Button>
          <Button
            tone="critical"
            size="slim"
            onClick={() => handleReject(app.id)}
            loading={isSubmitting}
          >
            Reject
          </Button>
        </InlineStack>
      ) : (
        <Text as="span" tone="subdued">
          {new Date(app.reviewed_at || app.created_at).toLocaleDateString()}
        </Text>
      ),
    ];
  });

  const influencerRows = activeInfluencers.map((inf) => [
    <Text as="span" fontWeight="semibold">
      {inf.name}
    </Text>,
    inf.email,
    inf.shortCode,
    String(inf.clicks),
    String(inf.conversions),
    formatCurrency(inf.revenue),
    formatCurrency(inf.commission),
  ]);

  const commissionTiers = (campaign.commission_tiers as any[]) || [];

  return (
    <Page
      title={campaign.name}
      backAction={{ onAction: () => navigate("/app/campaigns") }}
      titleMetadata={statusBadge(campaign.status)}
      subtitle={campaign.description || undefined}
    >
      <BlockStack gap="500">
        {actionData && "error" in actionData && (
          <Banner tone="critical">{actionData.error}</Banner>
        )}
        {actionData && "success" in actionData && actionData.message && (
          <Banner tone="success">{actionData.message}</Banner>
        )}

        {/* Stats */}
        <InlineGrid columns={3} gap="400">
          <Card>
            <BlockStack gap="200">
              <Text as="p" variant="bodyMd" tone="subdued">
                Total Revenue
              </Text>
              <Text as="p" variant="headingLg" fontWeight="semibold">
                {formatCurrency(stats.totalRevenue)}
              </Text>
            </BlockStack>
          </Card>
          <Card>
            <BlockStack gap="200">
              <Text as="p" variant="bodyMd" tone="subdued">
                Total Conversions
              </Text>
              <Text as="p" variant="headingLg" fontWeight="semibold">
                {String(stats.totalConversions)}
              </Text>
            </BlockStack>
          </Card>
          <Card>
            <BlockStack gap="200">
              <Text as="p" variant="bodyMd" tone="subdued">
                Active Influencers
              </Text>
              <Text as="p" variant="headingLg" fontWeight="semibold">
                {String(stats.activeInfluencers)}
              </Text>
            </BlockStack>
          </Card>
        </InlineGrid>

        {/* Campaign Info */}
        <Card>
          <BlockStack gap="300">
            <Text as="h2" variant="headingMd">
              Campaign Settings
            </Text>
            <InlineGrid columns={3} gap="400">
              <BlockStack gap="100">
                <Text as="p" variant="bodyMd" tone="subdued">
                  Product Scope
                </Text>
                <Text as="p" variant="bodyMd">
                  {campaign.product_scope === "all" ? "All Products" : "Specific Products"}
                </Text>
              </BlockStack>
              <BlockStack gap="100">
                <Text as="p" variant="bodyMd" tone="subdued">
                  Cookie Duration
                </Text>
                <Text as="p" variant="bodyMd">
                  {campaign.cookie_duration_days} days
                </Text>
              </BlockStack>
              <BlockStack gap="100">
                <Text as="p" variant="bodyMd" tone="subdued">
                  Max Influencers
                </Text>
                <Text as="p" variant="bodyMd">
                  {campaign.max_influencers || "Unlimited"}
                </Text>
              </BlockStack>
              <BlockStack gap="100">
                <Text as="p" variant="bodyMd" tone="subdued">
                  Application Required
                </Text>
                <Text as="p" variant="bodyMd">
                  {campaign.application_required ? "Yes" : "No"}
                </Text>
              </BlockStack>
              <BlockStack gap="100">
                <Text as="p" variant="bodyMd" tone="subdued">
                  Start Date
                </Text>
                <Text as="p" variant="bodyMd">
                  {campaign.start_date
                    ? new Date(campaign.start_date).toLocaleDateString()
                    : "—"}
                </Text>
              </BlockStack>
              <BlockStack gap="100">
                <Text as="p" variant="bodyMd" tone="subdued">
                  End Date
                </Text>
                <Text as="p" variant="bodyMd">
                  {campaign.end_date
                    ? new Date(campaign.end_date).toLocaleDateString()
                    : "Ongoing"}
                </Text>
              </BlockStack>
            </InlineGrid>
          </BlockStack>
        </Card>

        {/* Commission Tiers */}
        <Card>
          <BlockStack gap="300">
            <Text as="h2" variant="headingMd">
              Commission Tiers
            </Text>
            {commissionTiers.length > 0 ? (
              <DataTable
                columnContentTypes={["text", "numeric", "numeric", "numeric"]}
                headings={["Tier", "Min Revenue", "Max Revenue", "Commission %"]}
                rows={commissionTiers.map((tier: any) => [
                  tier.name,
                  formatCurrency(tier.min_revenue || 0),
                  tier.max_revenue ? formatCurrency(tier.max_revenue) : "Unlimited",
                  `${tier.percent}%`,
                ])}
              />
            ) : (
              <Text as="p" tone="subdued">
                No commission tiers configured.
              </Text>
            )}
          </BlockStack>
        </Card>

        {/* Tabs: Applications + Active Influencers */}
        <Card>
          <Tabs tabs={tabs} selected={selectedTab} onSelect={setSelectedTab}>
            <Box paddingBlockStart="400">
              {selectedTab === 0 && (
                <>
                  {applicationRows.length > 0 ? (
                    <DataTable
                      columnContentTypes={[
                        "text",
                        "text",
                        "text",
                        "text",
                        "text",
                        "text",
                        "text",
                      ]}
                      headings={[
                        "Name",
                        "Email",
                        "Niche",
                        "Socials",
                        "Message",
                        "Status",
                        "Actions",
                      ]}
                      rows={applicationRows}
                    />
                  ) : (
                    <Box padding="400">
                      <Text as="p" tone="subdued">
                        No applications yet.
                      </Text>
                    </Box>
                  )}
                </>
              )}
              {selectedTab === 1 && (
                <>
                  {influencerRows.length > 0 ? (
                    <DataTable
                      columnContentTypes={[
                        "text",
                        "text",
                        "text",
                        "numeric",
                        "numeric",
                        "numeric",
                        "numeric",
                      ]}
                      headings={[
                        "Name",
                        "Email",
                        "Code",
                        "Clicks",
                        "Conversions",
                        "Revenue",
                        "Commission",
                      ]}
                      rows={influencerRows}
                    />
                  ) : (
                    <Box padding="400">
                      <Text as="p" tone="subdued">
                        No active influencers yet. Approve applications to add
                        influencers.
                      </Text>
                    </Box>
                  )}
                </>
              )}
            </Box>
          </Tabs>
        </Card>

        <Box paddingBlockEnd="600" />
      </BlockStack>
    </Page>
  );
}
