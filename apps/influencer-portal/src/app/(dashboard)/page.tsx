import { createClient } from "@/lib/supabase/server";
import { formatCurrency } from "@adltix/utils";
import { redirect } from "next/navigation";

interface EarningsSummary {
  total_earned: number;
  pending: number;
  payable: number;
  paid_out: number;
}

interface RecentActivity {
  id: string;
  type: "commission" | "click" | "application";
  description: string;
  amount?: number;
  created_at: string;
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Fetch earnings summary
  const { data: commissions } = await supabase
    .from("commissions")
    .select("amount, status")
    .eq("influencer_id", user.id);

  const summary: EarningsSummary = {
    total_earned: 0,
    pending: 0,
    payable: 0,
    paid_out: 0,
  };

  if (commissions) {
    for (const c of commissions) {
      summary.total_earned += c.amount ?? 0;
      switch (c.status) {
        case "pending":
          summary.pending += c.amount ?? 0;
          break;
        case "approved":
        case "payable":
          summary.payable += c.amount ?? 0;
          break;
        case "paid":
          summary.paid_out += c.amount ?? 0;
          break;
      }
    }
  }

  // Fetch recent commissions as activity
  const { data: recentCommissions } = await supabase
    .from("commissions")
    .select("id, amount, status, created_at, campaign:campaigns(name)")
    .eq("influencer_id", user.id)
    .order("created_at", { ascending: false })
    .limit(10);

  const activities: RecentActivity[] = (recentCommissions ?? []).map((c) => ({
    id: c.id,
    type: "commission" as const,
    description: `Commission from ${(c.campaign as any)?.name ?? "campaign"}`,
    amount: c.amount,
    created_at: c.created_at,
  }));

  const stats = [
    {
      label: "Total Earned",
      value: formatCurrency(summary.total_earned),
      color: "text-primary",
      bgColor: "bg-surface",
      icon: (
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-apple-blue"
        >
          <line x1="12" y1="1" x2="12" y2="23" />
          <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
        </svg>
      ),
    },
    {
      label: "Pending",
      value: formatCurrency(summary.pending),
      color: "text-apple-orange",
      bgColor: "bg-apple-orange/10",
      icon: (
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-apple-orange"
        >
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      ),
    },
    {
      label: "Payable",
      value: formatCurrency(summary.payable),
      color: "text-apple-green",
      bgColor: "bg-apple-green/10",
      icon: (
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-apple-green"
        >
          <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
      ),
    },
    {
      label: "Paid Out",
      value: formatCurrency(summary.paid_out),
      color: "text-apple-blue",
      bgColor: "bg-apple-blue/10",
      icon: (
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-apple-blue"
        >
          <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
          <line x1="1" y1="10" x2="23" y2="10" />
        </svg>
      ),
    },
  ];

  return (
    <div>
      {/* Page header */}
      <div className="mb-8">
        <h1 className="font-display text-title-1 text-primary">Dashboard</h1>
        <p className="mt-1 text-callout text-secondary">
          Welcome back. Here&apos;s your earnings overview.
        </p>
      </div>

      {/* Stats grid */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="apple-card">
            <div className="flex items-center gap-3">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-apple-sm ${stat.bgColor}`}
              >
                {stat.icon}
              </div>
              <div>
                <p className="text-footnote text-secondary">{stat.label}</p>
                <p className={`font-display text-title-3 ${stat.color}`}>
                  {stat.value}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent activity */}
      <div className="apple-card">
        <h2 className="font-display text-title-3 text-primary mb-4">
          Recent Activity
        </h2>

        {activities.length === 0 ? (
          <div className="py-12 text-center">
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
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <p className="text-callout text-secondary">No activity yet</p>
            <p className="mt-1 text-footnote text-tertiary">
              Apply to campaigns and start earning commissions
            </p>
          </div>
        ) : (
          <div className="divide-y divide-separator">
            {activities.map((activity) => (
              <div
                key={activity.id}
                className="flex items-center justify-between py-3"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-apple-green/10">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-apple-green"
                    >
                      <line x1="12" y1="1" x2="12" y2="23" />
                      <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-subheadline font-medium text-primary">
                      {activity.description}
                    </p>
                    <p className="text-caption-1 text-tertiary">
                      {new Date(activity.created_at).toLocaleDateString(
                        "en-US",
                        {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        }
                      )}
                    </p>
                  </div>
                </div>
                {activity.amount != null && (
                  <span className="font-display text-subheadline font-semibold text-apple-green">
                    +{formatCurrency(activity.amount)}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
