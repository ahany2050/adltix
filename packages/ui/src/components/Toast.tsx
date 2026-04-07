"use client";

import { useEffect, useState } from "react";
import { cn } from "../utils/cn";

export interface ToastProps {
  message: string;
  type?: "success" | "error" | "info";
  duration?: number;
  onClose: () => void;
}

export function Toast({
  message,
  type = "info",
  duration = 4000,
  onClose,
}: ToastProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onClose, 200); // Wait for exit animation
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  return (
    <div
      className={cn(
        "fixed bottom-6 left-1/2 z-50 -translate-x-1/2",
        "flex items-center gap-3 rounded-[14px] px-5 py-3",
        "shadow-[0_8px_32px_rgba(0,0,0,0.16)]",
        "transition-all duration-200",
        visible
          ? "opacity-100 translate-y-0"
          : "opacity-0 translate-y-2",
        type === "success" && "bg-[#1D1D1F] text-white",
        type === "error" && "bg-[#FF3B30] text-white",
        type === "info" && "bg-[#1D1D1F] text-white"
      )}
    >
      {type === "success" && (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path
            d="M3 8.5L6.5 12L13 4"
            stroke="#34C759"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
      <span className="text-[15px] font-medium">{message}</span>
      <button
        onClick={() => {
          setVisible(false);
          setTimeout(onClose, 200);
        }}
        className="ml-2 opacity-60 hover:opacity-100 transition-opacity"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path
            d="M1 1L11 11M11 1L1 11"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </button>
    </div>
  );
}
