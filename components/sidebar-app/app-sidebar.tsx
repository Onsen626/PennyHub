"use client";

import { useState } from "react";
import {
  Home,
  MessageSquare,
  ListChecks,
  Folder,
  Bot,
  GitBranch,
  BookOpen,
  Wrench,
  Brain,
  Radio,
  Zap,
  Calendar,
  Activity,
} from "lucide-react";
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  type SidebarProps,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import type { IconComponent } from "@/lib/icon-context";
import { typeClass } from "@/lib/size-context";
import { fontWeights } from "@/lib/font-weight";
import {
  SidebarWorkspaceHeader,
  WorkspaceTile,
} from "@/components/sidebar-app/workspace-header";
import { SidebarSearchField } from "@/components/sidebar-app/search-field";
import {
  FLOCKS_NAV_ITEMS,
  zhCopy,
  type FlocksModuleId,
  type FlocksSectionId,
  type FlocksIconKey,
} from "@/lib/flocks-data";
import { cn } from "@/lib/utils";

export const FLOCKS_ICON_MAP: Record<FlocksIconKey, IconComponent> = {
  home: Home,
  "message-square": MessageSquare,
  "check-square": ListChecks,
  folder: Folder,
  bot: Bot,
  "git-branch": GitBranch,
  "book-open": BookOpen,
  tool: Wrench,
  cpu: Brain,
  radio: Radio,
  zap: Zap,
  calendar: Calendar,
  activity: Activity,
};

const SECTION_ORDER: FlocksSectionId[] = ["home", "workbench", "smith"];

export interface AppSidebarProps extends Omit<SidebarProps, "children"> {
  activeModule?: FlocksModuleId;
  onSelectModule?: (id: FlocksModuleId) => void;
  onOpenCommandPalette?: () => void;
}

export function AppSidebar({
  activeModule: controlledModule,
  onSelectModule,
  onOpenCommandPalette,
  ...props
}: AppSidebarProps) {
  const [internalModule, setInternalModule] = useState<FlocksModuleId>("home");

  const activeModule = controlledModule ?? internalModule;
  const t = zhCopy;

  const handleSelect = (id: FlocksModuleId) => {
    if (controlledModule === undefined) setInternalModule(id);
    onSelectModule?.(id);
  };

  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader className="border-b border-border/60 pb-3">
        <SidebarWorkspaceHeader
          name={t.brand}
          tile={
            <WorkspaceTile className="bg-red-600 text-white">F</WorkspaceTile>
          }
        />
        <div className="mt-1 flex flex-col gap-1 px-0.5">
          <div
            onClick={() => onOpenCommandPalette?.()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onOpenCommandPalette?.();
              }
            }}
            className="cursor-pointer"
          >
            <SidebarSearchField placeholder={t.common.searchPlaceholder} />
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="py-2">
        {SECTION_ORDER.map((sectionId) => {
          const items = FLOCKS_NAV_ITEMS.filter(
            (item) => item.section === sectionId
          );
          return (
            <SidebarGroup key={sectionId}>
              <SidebarGroupLabel
                className={cn(
                  typeClass("caption", "compact"),
                  "text-muted-foreground/80"
                )}
                style={{ fontVariationSettings: fontWeights.semibold }}
              >
                {t.sections[sectionId]}
              </SidebarGroupLabel>
              <SidebarMenu>
                {items.map((item) => {
                  const IconComp = FLOCKS_ICON_MAP[item.icon];
                  const isSelected = activeModule === item.id;
                  return (
                    <SidebarMenuItem key={item.id}>
                      <SidebarMenuButton
                        icon={IconComp}
                        isActive={isSelected}
                        onClick={() => handleSelect(item.id)}
                      >
                        <span className="truncate [text-box:trim-both_cap_alphabetic] py-1 -my-1">
                          {t.nav[item.id]}
                        </span>
                        {item.count !== undefined && item.id !== "models" && (
                          <span className="ml-auto inline-flex items-center">
                            <Badge
                              size="sm"
                              variant="dot"
                              color={isSelected ? "blue" : "gray"}
                              className="tabular-nums"
                            >
                              {item.count}
                            </Badge>
                          </span>
                        )}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroup>
          );
        })}
      </SidebarContent>

      <SidebarFooter className="border-t border-border/60 pt-3" />
    </Sidebar>
  );
}
export default AppSidebar;
