"use client";

import { type HTMLAttributes } from "react";
import { cn } from "../utils/cn";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?:
    | "default"
    | "success"
    | "warning"
    | "danger"
    | "info"
    | "purple";
}

const variantStyles: Record<string, string> = {
  default: "bg-[#F5F5F7] text-[#6E6E73]",
  success: "bg-[rgba(52,199,89,0.12)] text-[#248A3D]",
  warning: "bg-[rgba(255,159,10,0.12)] text-[#C93400]",
  danger: "bg-[rgba(255,59,48,0.12)] text-[#D70015]",
  info: "bg-[rgba(0,113,227,0.1)] text-[#0071E3]",
  purple: "bg-[rgba(175,82,222,0.12)] text-[#8944AB]",
};

export function Badge({
  className,
  variant = "default",
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-[20px] px-3 py-1",
        "text-[12px] font-semibold leading-none whitespace-nowrap",
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}

/** Map common status strings to badge variants */
export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { variant: BadgeProps["variant"]; label: string }> = {
    pending: { variant: "warning", label: "Pending" },
    validated: { variant: "info", label: "Validated" },
    payable: { variant: "purple", label: "Payable" },
    paid: { variant: "success", label: "Paid" },
    invalidated: { variant: "danger", label: "Invalidated" },
    active: { variant: "success", label: "Active" },
    draft: { variant: "default", label: "Draft" },
    paused: { variant: "warning", label: "Paused" },
    ended: { variant: "danger", label: "Ended" },
    approved: { variant: "success", label: "Approved" },
    rejected: { variant: "danger", label: "Rejected" },
    processing: { variant: "info", label: "Processing" },
    failed: { variant: "danger", label: "Failed" },
  };

  const config = map[status] || { variant: "default" as const, label: status };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
