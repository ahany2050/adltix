"use client";

import { cn } from "../utils/cn";

export interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  rounded?: "sm" | "md" | "lg" | "full";
}

export function Skeleton({
  className,
  width,
  height,
  rounded = "md",
}: SkeletonProps) {
  const radiusMap = {
    sm: "rounded-lg",
    md: "rounded-xl",
    lg: "rounded-[18px]",
    full: "rounded-full",
  };

  return (
    <div
      className={cn("skeleton", radiusMap[rounded], className)}
      style={{ width, height }}
    />
  );
}

export function SkeletonText({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          height="14px"
          width={i === lines - 1 ? "60%" : "100%"}
          rounded="sm"
        />
      ))}
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="rounded-[18px] bg-white p-6 shadow-[0_2px_20px_rgba(0,0,0,0.06)]">
      <Skeleton height="12px" width="40%" rounded="sm" className="mb-3" />
      <Skeleton height="28px" width="60%" rounded="sm" className="mb-2" />
      <Skeleton height="12px" width="30%" rounded="sm" />
    </div>
  );
}
