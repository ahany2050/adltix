"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "../utils/cn";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "destructive" | "ghost";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      loading = false,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          // Base styles
          "inline-flex items-center justify-center font-semibold",
          "rounded-[980px] transition-all duration-200",
          "focus:outline-none focus-visible:ring-4 focus-visible:ring-[rgba(0,113,227,0.25)]",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          "active:scale-[0.98]",
          // Variants
          variant === "primary" &&
            "bg-[#0071E3] text-white hover:bg-[#0077ED]",
          variant === "secondary" &&
            "bg-[rgba(0,113,227,0.1)] text-[#0071E3] hover:bg-[rgba(0,113,227,0.15)]",
          variant === "destructive" &&
            "bg-[#FF3B30] text-white hover:bg-[#FF453A]",
          variant === "ghost" &&
            "bg-transparent text-[#0071E3] hover:bg-[rgba(0,113,227,0.06)]",
          // Sizes
          size === "sm" && "h-8 px-4 text-[13px]",
          size === "md" && "h-11 px-6 text-[15px]",
          size === "lg" && "h-12 px-8 text-[17px]",
          className
        )}
        {...props}
      >
        {loading ? (
          <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : null}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
