import { useLoaderData } from "react-router";
import type { LoaderFunctionArgs } from "react-router";
import {
  Page,
  Card,
  DataTable,
  BlockStack,
  Text,
  Badge,
  EmptyState,
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
    return { orders: [] };
  }

  // Get attributed orders with influencer and campaign info
  const { data: orders } = await supabase
    .from("orders")
    .select(`
      id,
      shopify_order_number,
      subtotal_price,
      total_price,
      commissionable_amount,
      currency,
      shopify_status,
      financial_status,
      is_invalidated,
      created_at,
      influencer_id,
      campaign_id,
      influencers (
        id,
        first_name,
        last_name
      ),
      campaigns (
        id,
        name
      )
    `)
    .eq("merchant_id", merchant.id)
    .order("created_at", { ascending: false })
    .limit(200);

  // Get commissions for these orders
  const orderIds = (orders || []).map((o) => o.id);
  const { data: commissions } = await supabase
    .from("commissions")
    .select("order_id, commission_amount, net_amount, status")
    .in("order_id", orderIds.length > 0 ? orderIds : ["__none__"]);

  const commissionByOrder = new Map<
    string,
    { amount: number; status: string }
  >();
  for (const c of commissions || []) {
    commissionByOrder.set(c.order_id, {
      amount: Number(c.commission_amount || 0),
      status: c.status,
    });
  }

  const enrichedOrders = (orders || []).map((order) => {
    const influencer = order.influencers as any;
    const campaign = order.campaigns as any;
    const commission = commissionByOrder.get(order.id);

    return {
      id: order.id,
      orderNumber: order.shopify_order_number || "—",
      influencerName: influencer
        ? `${influencer.first_name || ""} ${influencer.last_name || ""}`.trim()
        : "Unknown",
      campaignName: campaign?.name || "—",
      amount: Number(order.total_price || 0),
      commissionableAmount: Number(order.commissionable_amount || 0),
      commission: commission?.amount || 0,
      commissionStatus: commission?.status || "—",
      status: order.is_invalidated
        ? "invalidated"
        : order.shopify_status || "pending",
      date: order.created_at,
    };
  });

  return { orders: enrichedOrders };
};

const statusBadge = (status: string) => {
  const toneMap: Record<string, "success" | "warning" | "critical" | "info"> = {
    pending: "warning",
    fulfilled: "success",
    cancelled: "critical",
    refunded: "critical",
    invalidated: "critical",
  };
  return <Badge tone={toneMap[status] || "info"}>{status}</Badge>;
};

const commissionStatusBadge = (status: string) => {
  const toneMap: Record<string, "success" | "warning" | "critical" | "info"> = {
    pending: "warning",
    validated: "info",
    payable: "success",
    paid: "success",
    invalidated: "critical",
  };
  if (status === "—") return <Text as="span" tone="subdued">—</Text>;
  return <Badge tone={toneMap[status] || "info"}>{status}</Badge>;
};

export default function OrdersIndex() {
  const { orders } = useLoaderData<typeof loader>();

  if (orders.length === 0) {
    return (
      <Page title="Attributed Orders">
        <Card>
          <EmptyState
            heading="No attributed orders yet"
            image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
          >
            <p>
              When customers use influencer affiliate links and discount codes
              to make purchases, the orders will appear here.
            </p>
          </EmptyState>
        </Card>
      </Page>
    );
  }

  const rows = orders.map((order) => [
    <Text as="span" fontWeight="semibold">
      #{order.orderNumber}
    </Text>,
    order.influencerName,
    order.campaignName,
    formatCurrency(order.amount),
    formatCurrency(order.commission),
    statusBadge(order.status),
    commissionStatusBadge(order.commissionStatus),
    new Date(order.date).toLocaleDateString(),
  ]);

  const totalAmount = orders.reduce((sum, o) => sum + o.amount, 0);
  const totalCommission = orders.reduce((sum, o) => sum + o.commission, 0);

  return (
    <Page title="Attributed Orders">
      <BlockStack gap="500">
        <Card>
          <BlockStack gap="400">
            <Text as="h2" variant="headingMd">
              All Attributed Orders
            </Text>
            <DataTable
              columnContentTypes={[
                "text",
                "text",
                "text",
                "numeric",
                "numeric",
                "text",
                "text",
                "text",
              ]}
              headings={[
                "Order #",
                "Influencer",
                "Campaign",
                "Amount",
                "Commission",
                "Order Status",
                "Commission Status",
                "Date",
              ]}
              rows={rows}
              totals={[
                "",
                "",
                "",
                formatCurrency(totalAmount),
                formatCurrency(totalCommission),
                "",
                "",
                "",
              ]}
              showTotalsInFooter
            />
          </BlockStack>
        </Card>
      </BlockStack>
    </Page>
  );
}
