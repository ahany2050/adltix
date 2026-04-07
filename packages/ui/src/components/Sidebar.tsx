"use client";

import { cn } from "../utils/cn";

export interface SidebarItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  active?: boolean;
}

export interface SidebarProps {
  items: SidebarItem[];
  logo?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

export function Sidebar({ items, logo, footer, className }: SidebarProps) {
  return (
    <aside
      className={cn(
        "fixed left-0 top-0 h-screen w-[240px]",
        "bg-[rgba(245,245,247,0.8)] backdrop-blur-[20px]",
        "border-r border-[rgba(0,0,0,0.08)]",
        "flex flex-col",
        "transition-all duration-200",
        className
      )}
    >
      {/* Logo area */}
      {logo && (
        <div className="flex items-center gap-3 px-5 py-6">
          {logo}
        </div>
      )}

      {/* Navigation items */}
      <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
        {items.map((item) => (
          <a
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5",
              "text-[15px] font-medium",
              "transition-all duration-150",
              item.active
                ? "bg-[rgba(0,113,227,0.1)] text-[#0071E3]"
                : "text-[#6E6E73] hover:bg-[rgba(0,0,0,0.04)] hover:text-[#1D1D1F]"
            )}
          >
            <span className="flex h-5 w-5 items-center justify-center">
              {item.icon}
            </span>
            {item.label}
          </a>
        ))}
      </nav>

      {/* Footer */}
      {footer && (
        <div className="border-t border-[rgba(0,0,0,0.08)] px-3 py-4">
          {footer}
        </div>
      )}
    </aside>
  );
}
