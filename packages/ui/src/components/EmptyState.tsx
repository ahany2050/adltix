"use client";

import { cn } from "../utils/cn";
import { Button, type ButtonProps } from "./Button";

export interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
    variant?: ButtonProps["variant"];
  };
  className?: string;
}

export function EmptyState({
  title,
  description,
  icon,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-16 px-8 text-center",
        className
      )}
    >
      {icon && (
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[#F5F5F7] text-[#AEAEB2]">
          {icon}
        </div>
      )}
      <h3 className="text-[20px] font-semibold text-[#1D1D1F] mb-2">
        {title}
      </h3>
      <p className="text-[15px] text-[#6E6E73] max-w-sm mb-6">
        {description}
      </p>
      {action && (
        <Button
          variant={action.variant || "primary"}
          onClick={action.onClick}
        >
          {action.label}
        </Button>
      )}
    </div>
  );
}
