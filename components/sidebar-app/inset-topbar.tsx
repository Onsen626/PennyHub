"use client";

import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

export function SidebarInsetTopbar({
  children,
  className,
}: {
  children?: ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn("flex h-12 shrink-0 items-center gap-2 px-1.5", className)}
    >
      {children}
    </header>
  );
}
