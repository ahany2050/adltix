import { createClient } from "@/lib/supabase/server";
import { formatCurrency } from "@adltix/utils";
import { redirect } from "next/navigation";

interface Props {
  searchParams: { status?: string };
}

const STATUS_OPTIONS = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "paid", label: "Paid" },
  { value: "rejected", label: "Rejected" },
];

function getStatusBadgeClass(status: string) {
  switch (status) {
    case "pending":
      return "badge-warning";
    case "approved":
    case "payable":
      return "badge-success";
    case "paid":
      return "badge-info";
    case "rejected":
      return "badge-error";
    default:
      return "badge-neutral";
  }
}

export default async function EarningsPage({ searchParams }: Props) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const statusFilter = searchParams.status ?? "all";

  // Build query
  let query = supabase
    .from("commissions")
    .select(
      `
      id,
      amount,
      status,
      order_subtotal,
      commission_percent,
      created_at,
      campaign:campaigns(name),
      affiliate_link:affiliate_links(short_code)
    `
    )
    .eq("influencer_id", user.id)
    .order("created_at", { ascending: false });

  if (statusFilter !== "all") {
    query = query.eq("status", statusFilter);
  }

  const { data: commissions } = await query;

  // Calculate totals
  const totalAmount = (commissions ?? []).reduce(
    (sum, c) => sum + (c.amount ?? 0),
    0
  );

  return (
    <div>
      {/* Page header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-title-1 text-primary">Earnings</h1>
          <p className="mt-1 text-callout text-secondary">
            Track all your commissions and payouts.
          </p>
        </div>
        <div className="text-right">
          <p className="text-footnote text-secondary">
            {statusFilter === "all" ? "Total" : `Total (${statusFilter})`}
          </p>
          <p className="font-display text-title-2 text-primary">
            {formatCurrency(totalAmount)}
          </p>
        </div>
      </div>

      {/* Status filter */}
      <div className="mb-6 flex flex-wrap gap-2">
        {STATUS_OPTIONS.map((option) => (
          <a
            key={option.value}
            href={
              option.value === "all"
                ? "/earnings"
                : `/earnings?status=${option.value}`
            }
            className={`rounded-pill px-4 py-2 text-subheadline font-medium transition-all duration-150 ease-apple ${
              statusFilter === option.value
                ? "bg-apple-blue text-white"
                : "bg-white text-secondary shadow-card hover:shadow-card-hover"
            }`}
          >
            {option.label}
          </a>
        ))}
      </div>

      {/* Commissions table */}
      <div className="apple-card overflow-hidden p-0">
        {!commissions || commissions.length === 0 ? (
          <div className="py-16 text-center">
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mx-auto mb-3 text-tertiary"
            >
              <line x1="12" y1="1" x2="12" y2="23" />
              <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
            </svg>
            <p className="text-callout text-secondary">No commissions found</p>
            <p className="mt-1 text-footnote text-tertiary">
              Commissions will appear here once your affiliate links generate
              sales.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-separator bg-surface/50">
                  <th className="px-6 py-3 text-left text-footnote font-medium text-secondary">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-footnote font-medium text-secondary">
                    Campaign
                  </th>
                  <th className="px-6 py-3 text-left text-footnote font-medium text-secondary">
                    Order Total
                  </th>
                  <th className="px-6 py-3 text-left text-footnote font-medium text-secondary">
                    Rate
                  </th>
                  <th className="px-6 py-3 text-left text-footnote font-medium text-secondary">
                    Commission
                  </th>
                  <th className="px-6 py-3 text-left text-footnote font-medium text-secondary">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-separator">
                {commissions.map((commission) => (
                  <tr
                    key={commission.id}
                    className="transition-colors duration-100 hover:bg-surface/30"
                  >
                    <td className="px-6 py-4 text-subheadline text-secondary">
                      {new Date(commission.created_at).toLocaleDateString(
                        "en-US",
                        {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        }
                      )}
                    </td>
                    <td className="px-6 py-4 text-subheadline font-medium text-primary">
                      {(commission.campaign as any)?.name ?? "Unknown"}
                    </td>
                    <td className="px-6 py-4 text-subheadline text-secondary">
                      {commission.order_subtotal != null
                        ? formatCurrency(commission.order_subtotal)
                        : "-"}
                    </td>
                    <td className="px-6 py-4 text-subheadline text-secondary">
                      {commission.commission_percent != null
                        ? `${commission.commission_percent}%`
                        : "-"}
                    </td>
                    <td className="px-6 py-4 font-display text-subheadline font-semibold text-primary">
                      {formatCurrency(commission.amount ?? 0)}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={getStatusBadgeClass(commission.status ?? "")}
                      >
                        {commission.status ?? "unknown"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
