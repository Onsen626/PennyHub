"use client";

import { type ReactNode } from "react";
import { SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

export function SidebarInsetTopbar({
  children,
  className,
}: {
  children?: ReactNode;
  className?: string;
}) {
  const { open, isMobile, openMobile, isPeeking } = useSidebar();
  const isCollapsed = isMobile ? !openMobile : !open;

  return (
    <header
      className={cn("flex h-12 shrink-0 items-center gap-2 px-1.5", className)}
    >
      {isCollapsed && (
        <SidebarTrigger
          className={cn(
            "transition-opacity duration-160",
            isPeeking ? "opacity-0" : "opacity-100"
          )}
        />
      )}
      {children}
    </header>
  );
}
