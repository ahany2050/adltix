"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "../utils/cn";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
}

const sizeMap = {
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "max-w-2xl",
};

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  size = "md",
}: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open) {
      dialog.showModal();
    } else {
      dialog.close();
    }
  }, [open]);

  if (!open) return null;

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      className={cn(
        "fixed inset-0 z-50 m-auto",
        "rounded-[20px] bg-white p-0",
        "shadow-[0_8px_32px_rgba(0,0,0,0.12)]",
        "backdrop:bg-black/30 backdrop:backdrop-blur-sm",
        "animate-in fade-in zoom-in-95 duration-200",
        sizeMap[size]
      )}
      style={{
        animation: "modalIn 0.25s cubic-bezier(0.25, 0.1, 0.25, 1)",
      }}
    >
      <style>{`
        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.96); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>

      {title && (
        <div className="flex items-center justify-between border-b border-[rgba(0,0,0,0.08)] px-6 py-4">
          <h2 className="text-[17px] font-semibold text-[#1D1D1F]">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-[rgba(0,0,0,0.06)] text-[#6E6E73] hover:bg-[rgba(0,0,0,0.1)] transition-colors"
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
      )}

      <div className="p-6">{children}</div>

      {footer && (
        <div className="flex items-center justify-end gap-3 border-t border-[rgba(0,0,0,0.08)] px-6 py-4">
          {footer}
        </div>
      )}
    </dialog>
  );
}
