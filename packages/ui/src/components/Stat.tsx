"use client";

import { cn } from "../utils/cn";

export interface StatProps {
  label: string;
  value: string;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  className?: string;
}

export function Stat({
  label,
  value,
  change,
  changeType = "neutral",
  className,
}: StatProps) {
  return (
    <div
      className={cn(
        "rounded-[18px] bg-white p-6",
        "shadow-[0_2px_20px_rgba(0,0,0,0.06)]",
        className
      )}
    >
      <p className="text-[13px] font-medium text-[#6E6E73] tracking-wide mb-2">
        {label}
      </p>
      <p
        className="text-[28px] font-bold text-[#1D1D1F] tracking-tight animate-count"
        style={{ fontVariantNumeric: "tabular-nums" }}
      >
        {value}
      </p>
      {change && (
        <p
          className={cn(
            "text-[13px] font-medium mt-1",
            changeType === "positive" && "text-[#34C759]",
            changeType === "negative" && "text-[#FF3B30]",
            changeType === "neutral" && "text-[#6E6E73]"
          )}
        >
          {change}
        </p>
      )}
    </div>
  );
}
