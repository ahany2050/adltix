"use client";

import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "../utils/cn";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "elevated" | "flat";
  hoverable?: boolean;
  padding?: "sm" | "md" | "lg";
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      className,
      variant = "elevated",
      hoverable = false,
      padding = "md",
      children,
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={cn(
          "rounded-[18px] transition-all duration-200",
          // Variants
          variant === "elevated" &&
            "bg-white shadow-[0_2px_20px_rgba(0,0,0,0.06)]",
          variant === "flat" && "bg-[#F5F5F7]",
          // Hover effect
          hoverable &&
            "cursor-pointer hover:-translate-y-0.5 hover:shadow-[0_4px_24px_rgba(0,0,0,0.1)]",
          // Padding
          padding === "sm" && "p-4",
          padding === "md" && "p-6",
          padding === "lg" && "p-8",
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = "Card";
