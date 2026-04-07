import { useLoaderData } from "react-router";
import type { LoaderFunctionArgs } from "react-router";
import {
  Page,
  Layout,
  Card,
  Text,
  BlockStack,
  InlineGrid,
  Box,
  DataTable,
  Badge,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { createServiceClient } from "@adltix/database";
import { formatCurrency } from "@adltix/utils";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const supabase = createServiceClient();

  // Get merchant
  const { data: merchant } = await supabase
    .from("merchants")
    .select("id")
    .eq("shopify_domain", session.shop)
    .single();

  if (!merchant) {
    return {
      stats: { totalRevenue: 0, activeInfluencers: 0, activeCampaigns: 0, pendingCommissions: 0 },
      recentOrders: [],
    };
  }

  // Aggregate stats
  const [
    { data: campaigns },
    { data: orders },
    { data: commissions },
  ] = await Promise.all([
    supabase
      .from("campaigns")
      .select("id")
      .eq("merchant_id", merchant.id)
      .eq("status", "active"),
    supabase
      .from("orders")
      .select("id, shopify_order_number, total_price, commissionable_amount, created_at, influencer_id, shopify_status")
      .eq("merchant_id", merchant.id)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("commissions")
      .select("net_amount, status")
      .eq("merchant_id", merchant.id),
  ]);

  const totalRevenue = (orders || []).reduce(
    (sum, o) => sum + Number(o.commissionable_amount || 0), 0
  );
  const pendingCommissions = (commissions || [])
    .filter((c) => c.status === "pending" || c.status === "validated")
    .reduce((sum, c) => sum + Number(c.net_amount || 0), 0);

  // Count unique active influencers
  const activeInfluencerIds = new Set(
    (orders || []).map((o) => o.influencer_id).filter(Boolean)
  );

  return {
    stats: {
      totalRevenue,
      activeCampaigns: (campaigns || []).length,
      activeInfluencers: activeInfluencerIds.size,
      pendingCommissions,
    },
    recentOrders: orders || [],
  };
};

export default function Dashboard() {
  const { stats, recentOrders } = useLoaderData<typeof loader>();

  const statCards = [
    { title: "Total Revenue", value: formatCurrency(stats.totalRevenue) },
    { title: "Active Campaigns", value: String(stats.activeCampaigns) },
    { title: "Active Influencers", value: String(stats.activeInfluencers) },
    { title: "Pending Commissions", value: formatCurrency(stats.pendingCommissions) },
  ];

  const orderRows = recentOrders.map((order) => [
    order.shopify_order_number || "—",
    formatCurrency(Number(order.total_price)),
    formatCurrency(Number(order.commissionable_amount)),
    order.shopify_status || "pending",
    new Date(order.created_at).toLocaleDateString(),
  ]);

  return (
    <Page title="Dashboard">
      <BlockStack gap="500">
        <InlineGrid columns={4} gap="400">
          {statCards.map((stat) => (
            <Card key={stat.title}>
              <BlockStack gap="200">
                <Text as="p" variant="bodyMd" tone="subdued">
                  {stat.title}
                </Text>
                <Text as="p" variant="headingLg" fontWeight="semibold">
                  {stat.value}
                </Text>
              </BlockStack>
            </Card>
          ))}
        </InlineGrid>

        <Card>
          <BlockStack gap="400">
            <Text as="h2" variant="headingMd">
              Recent Attributed Orders
            </Text>
            {orderRows.length > 0 ? (
              <DataTable
                columnContentTypes={["text", "numeric", "numeric", "text", "text"]}
                headings={["Order #", "Total", "Commissionable", "Status", "Date"]}
                rows={orderRows}
              />
            ) : (
              <Box padding="400">
                <Text as="p" tone="subdued">
                  No attributed orders yet. Once influencers start driving sales,
                  they will appear here.
                </Text>
              </Box>
            )}
          </BlockStack>
        </Card>
      </BlockStack>
    </Page>
  );
}
