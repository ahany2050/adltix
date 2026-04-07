"use client";

import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "../utils/cn";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-[13px] font-medium text-[#6E6E73] tracking-wide"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            "h-12 w-full rounded-xl bg-[rgba(0,0,0,0.04)] px-4",
            "text-[17px] text-[#1D1D1F] placeholder:text-[#AEAEB2]",
            "border-0 outline-none",
            "transition-shadow duration-200",
            "focus:shadow-[0_0_0_4px_rgba(0,113,227,0.25)]",
            error && "shadow-[0_0_0_2px_#FF3B30]",
            className
          )}
          {...props}
        />
        {error && (
          <p className="text-[13px] text-[#FF3B30]">{error}</p>
        )}
        {hint && !error && (
          <p className="text-[13px] text-[#AEAEB2]">{hint}</p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
