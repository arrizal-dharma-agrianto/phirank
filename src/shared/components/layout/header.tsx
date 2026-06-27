"use client";

import {
  BellIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  SidebarSimpleIcon,
} from "@phosphor-icons/react";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";

const breadcrumbMap: Record<string, string> = {
  "/account": "Account",
  "/dashboard": "Dashboard",
  "/dashboard/audits": "Audit History",
  "/dashboard/web-audit": "Web Audit",
  "/dashboard/web-audit/analyze": "Analyze",
  "/dashboard/web-audit/history": "Audit History",
  "/dashboard/data-audit-crawler": "Dashboard",
  "/dashboard/data-audit-crawler/crawl-jobs": "Crawl Job History",
  "/dashboard/content-generator": "Content Generator",
  "/dashboard/content-generator/manual": "Manual Generator",
  "/dashboard/content-generator/generate": "Generate Content",
  "/dashboard/content-generator/draft": "Draft",
  "/dashboard/content-generator/integration": "Content Integration",
  "/dashboard/content-generator/indexnow": "IndexNow",
  "/dashboard/reports": "Reports",
  "/dashboard/billing": "Billing",
  "/settings/general": "General",
  "/settings/website": "Website",
  "/settings/roles": "Roles",
  "/settings/members": "Members",
};

interface HeaderProps {
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
}

export function Header({ isSidebarOpen, onToggleSidebar }: HeaderProps) {
  const pathname = usePathname();

  const pageTitle =
    breadcrumbMap[pathname ?? ""] ??
    (pathname?.startsWith("/dashboard/web-audit/history/") ||
    pathname?.startsWith("/dashboard/audits/")
      ? "Audit Detail"
      : pathname?.startsWith("/dashboard/data-audit-crawler/")
        ? "Dashboard"
      : pathname?.startsWith("/dashboard/content-generator/draft/")
        ? "Draft Detail"
      : pathname?.startsWith("/settings/roles/")
        ? "Role Details"
        : "Dashboard");

  return (
    <header className="flex h-14 items-center justify-between border-b border-gray-100 bg-white px-6">
      {/* Left: Page Title */}
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700"
          aria-label={isSidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
          aria-controls="dashboard-sidebar"
          aria-expanded={isSidebarOpen}
          onClick={onToggleSidebar}
        >
          <SidebarSimpleIcon
            aria-hidden="true"
            className="size-4"
            weight={isSidebarOpen ? "fill" : "regular"}
          />
        </Button>
        <h1 className="text-[15px] font-semibold text-gray-900">{pageTitle}</h1>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        {/* Search */}
        <Button
          type="button"
          variant="outline"
          className="h-8 rounded-lg border-gray-200 bg-gray-50 px-3 text-sm font-normal text-gray-400 hover:bg-gray-100 hover:text-gray-500"
        >
          <MagnifyingGlassIcon aria-hidden="true" className="size-3.5" />
          <span>Search...</span>
          <kbd className="ml-2 rounded bg-gray-200 px-1.5 py-0.5 text-[10px] font-mono text-gray-500">
            ⌘K
          </kbd>
        </Button>

        {/* Notifications */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="relative rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700"
          aria-label="Notifications"
        >
          <BellIcon aria-hidden="true" className="size-4" />
          <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-gray-900" />
        </Button>

        {/* New button */}
        <Button
          type="button"
          className="rounded-lg bg-gray-900 px-3 text-sm text-white hover:bg-gray-800"
        >
          <PlusIcon aria-hidden="true" className="size-3.5" weight="bold" />
          New
        </Button>
      </div>
    </header>
  );
}
