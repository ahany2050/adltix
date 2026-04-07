import { useLoaderData, useNavigate } from "react-router";
import type { LoaderFunctionArgs } from "react-router";
import {
  Page,
  Layout,
  Card,
  DataTable,
  Badge,
  Button,
  BlockStack,
  InlineStack,
  Text,
  Box,
  EmptyState,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { createServiceClient } from "@adltix/database";
import { formatCurrency } from "@adltix/utils";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const supabase = createServiceClient();

  const { data: merchant } = await supabase
    .from("merchants")
    .select("id")
    .eq("shopify_domain", session.shop)
    .single();

  if (!merchant) return { campaigns: [] };

  const { data: campaigns } = await supabase
    .from("campaigns")
    .select(`
      id,
      name,
      status,
      start_date,
      end_date,
      total_revenue_generated,
      total_commissions_paid,
      max_influencers,
      created_at
    `)
    .eq("merchant_id", merchant.id)
    .order("created_at", { ascending: false });

  // Get application counts per campaign
  const campaignIds = (campaigns || []).map((c) => c.id);
  const { data: applicationCounts } = await supabase
    .from("campaign_applications")
    .select("campaign_id, status")
    .in("campaign_id", campaignIds);

  const enriched = (campaigns || []).map((campaign) => {
    const apps = (applicationCounts || []).filter(
      (a) => a.campaign_id === campaign.id
    );
    return {
      ...campaign,
      approvedInfluencers: apps.filter((a) => a.status === "approved").length,
      pendingApplications: apps.filter((a) => a.status === "pending").length,
    };
  });

  return { campaigns: enriched };
};

const statusBadge = (status: string) => {
  const toneMap: Record<string, "success" | "warning" | "critical" | "info"> = {
    active: "success",
    draft: "info",
    paused: "warning",
    ended: "critical",
  };
  return <Badge tone={toneMap[status] || "info"}>{status}</Badge>;
};

export default function CampaignsIndex() {
  const { campaigns } = useLoaderData<typeof loader>();
  const navigate = useNavigate();

  if (campaigns.length === 0) {
    return (
      <Page
        title="Campaigns"
        primaryAction={{
          content: "Create Campaign",
          onAction: () => navigate("/app/campaigns/new"),
        }}
      >
        <Card>
          <EmptyState
            heading="Create your first campaign"
            image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
            action={{
              content: "Create Campaign",
              onAction: () => navigate("/app/campaigns/new"),
            }}
          >
            <p>
              Set up a campaign with commission tiers and start inviting
              influencers to promote your products.
            </p>
          </EmptyState>
        </Card>
      </Page>
    );
  }

  const rows = campaigns.map((campaign) => [
    <Text as="span" fontWeight="semibold">
      {campaign.name}
    </Text>,
    statusBadge(campaign.status),
    `${campaign.approvedInfluencers}${campaign.max_influencers ? `/${campaign.max_influencers}` : ""}`,
    String(campaign.pendingApplications),
    formatCurrency(Number(campaign.total_revenue_generated)),
    formatCurrency(Number(campaign.total_commissions_paid)),
    <Button
      variant="plain"
      onClick={() => navigate(`/app/campaigns/${campaign.id}`)}
    >
      View
    </Button>,
  ]);

  return (
    <Page
      title="Campaigns"
      primaryAction={{
        content: "Create Campaign",
        onAction: () => navigate("/app/campaigns/new"),
      }}
    >
      <Card>
        <DataTable
          columnContentTypes={[
            "text", "text", "numeric", "numeric", "numeric", "numeric", "text",
          ]}
          headings={[
            "Name", "Status", "Influencers", "Pending", "Revenue", "Commissions", "",
          ]}
          rows={rows}
        />
      </Card>
    </Page>
  );
}
