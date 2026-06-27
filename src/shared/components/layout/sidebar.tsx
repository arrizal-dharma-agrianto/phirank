"use client";

import { useState } from "react";
import {
  CaretDownIcon,
  ClipboardTextIcon,
  CreditCardIcon,
  FoldersIcon,
  GearSixIcon,
  GlobeSimpleIcon,
  KeyIcon,
  ListChecksIcon,
  SparkleIcon,
  ShieldCheckIcon,
  StackSimpleIcon,
  TextAaIcon,
  UsersThreeIcon,
  type Icon,
} from "@phosphor-icons/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { TenantSwitcher } from "@/modules/tenant";
import { SidebarProfileMenu } from "@/modules/user/components";

type NavItem = {
  label: string;
  href: string;
  icon: Icon;
};

type NavGroupItem = NavItem & {
  children?: NavItem[];
};

interface SidebarProps {
  appName: string;
  isOpen: boolean;
}

const mainNavItems = [
  {
    label: "Dashboard",
    href: "/dashboard/data-audit-crawler",
    icon: FoldersIcon,
  },
  {
    label: "Web Audit",
    href: "/dashboard/web-audit",
    icon: GlobeSimpleIcon,
    children: [
      {
        label: "Analyze",
        href: "/dashboard/web-audit/analyze",
        icon: GlobeSimpleIcon,
      },
      {
        label: "History",
        href: "/dashboard/web-audit/history",
        icon: ListChecksIcon,
      },
    ],
  },
  {
    label: "Content Generator",
    href: "/dashboard/content-generator",
    icon: SparkleIcon,
    children: [
      {
        label: "Generate",
        href: "/dashboard/content-generator/generate",
        icon: TextAaIcon,
      },
      {
        label: "Draft",
        href: "/dashboard/content-generator/draft",
        icon: ClipboardTextIcon,
      },
      {
        label: "Integration",
        href: "/dashboard/content-generator/integration",
        icon: SparkleIcon,
      },
      {
        label: "IndexNow",
        href: "/dashboard/content-generator/indexnow",
        icon: KeyIcon,
      },
    ],
  },
] satisfies NavGroupItem[];

const accountNavItems = [
  {
    label: "Workspace",
    href: "/settings/general",
    icon: GearSixIcon,
    children: [
      { label: "General", href: "/settings/general", icon: GearSixIcon },
      { label: "Website", href: "/settings/website", icon: GlobeSimpleIcon },
      { label: "Roles", href: "/settings/roles", icon: ShieldCheckIcon },
      { label: "Members", href: "/settings/members", icon: UsersThreeIcon },
    ],
  },
  { label: "Billing", href: "/dashboard/billing", icon: CreditCardIcon },
] satisfies NavGroupItem[];

export function Sidebar({ appName, isOpen }: SidebarProps) {
  const pathname = usePathname();
  const isSettingsPath = pathname?.startsWith("/settings") ?? false;
  const isWebAuditPath =
    pathname?.startsWith("/dashboard/web-audit") ?? false;
  const isContentGeneratorPath =
    pathname?.startsWith("/dashboard/content-generator") ?? false;

  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    "/dashboard/web-audit": isWebAuditPath,
    "/dashboard/content-generator": isContentGeneratorPath,
    "/settings/general": isSettingsPath,
  });

  const toggleGroup = (href: string) => {
    setExpandedGroups((current) => ({
      ...current,
      [href]: !current[href],
    }));
  };

  return (
    <aside
      id="dashboard-sidebar"
      className={cn(
        "flex h-screen shrink-0 flex-col overflow-hidden border-r border-gray-100 bg-white transition-[width,padding] duration-200 ease-out",
        isOpen ? "w-60 px-3 py-5" : "w-20 px-2 py-5",
      )}
    >
      <div className="flex h-full flex-col">
        <div className={cn("mb-8", isOpen ? "px-3" : "px-0")}>
          <div
            className={cn(
              "flex items-center",
              isOpen ? "gap-2.5" : "justify-center",
            )}
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-900">
              <StackSimpleIcon
                aria-hidden="true"
                className="size-4 text-white"
                weight="fill"
              />
            </div>

            {isOpen ? (
              <span className="text-[15px] font-semibold tracking-tight text-gray-900">
                {appName}
              </span>
            ) : null}
          </div>
        </div>

        <TenantSwitcher isOpen={isOpen} />

        <nav className="flex-1 space-y-0.5">
          {isOpen ? (
            <p className="mb-1 px-3 text-[10.5px] font-semibold uppercase tracking-widest text-gray-400">
              Main
            </p>
          ) : null}

          {mainNavItems.map((item) => {
            const hasChildren = !!item.children?.length;
            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname?.startsWith(item.href));

            const isExpanded = expandedGroups[item.href] ?? false;
            const Icon = item.icon;

            return (
              <div key={item.href} className="space-y-1">
                {hasChildren && isOpen ? (
                  <Button
                    type="button"
                    variant="ghost"
                    aria-expanded={isExpanded}
                    aria-controls={`sidebar-group-${item.label.toLowerCase().replaceAll(" ", "-")}`}
                    className={cn(
                      "h-auto w-full rounded-lg py-2 text-sm transition-all",
                      "justify-start gap-3 px-3",
                      isActive
                        ? "bg-gray-100 text-gray-900 hover:bg-gray-100 hover:text-gray-900"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
                    )}
                    onClick={() => toggleGroup(item.href)}
                  >
                    <span
                      className={cn(
                        isActive ? "text-gray-900" : "text-gray-400",
                      )}
                    >
                      <Icon aria-hidden="true" className="size-[18px]" />
                    </span>

                    <span className="flex-1 text-left">{item.label}</span>

                    <CaretDownIcon
                      aria-hidden="true"
                      className={cn(
                        "size-3.5 transition-transform",
                        isExpanded ? "rotate-180" : "rotate-0",
                        isActive ? "text-gray-500" : "text-gray-400",
                      )}
                    />
                  </Button>
                ) : (
                  <Button
                    asChild
                    variant="ghost"
                    className={cn(
                      "h-auto w-full rounded-lg py-2 text-sm transition-all",
                      isOpen
                        ? "justify-start gap-3 px-3"
                        : "justify-center px-0",
                      isActive
                        ? "bg-gray-100 text-gray-900 hover:bg-gray-100 hover:text-gray-900"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
                    )}
                  >
                    <Link
                      href={item.href}
                      aria-current={isActive ? "page" : undefined}
                      aria-label={!isOpen ? item.label : undefined}
                      title={!isOpen ? item.label : undefined}
                    >
                      <span
                        className={cn(
                          isActive ? "text-gray-900" : "text-gray-400",
                        )}
                      >
                        <Icon aria-hidden="true" className="size-[18px]" />
                      </span>
                      {isOpen ? item.label : null}
                    </Link>
                  </Button>
                )}

                {isOpen && hasChildren && isExpanded ? (
                  <div
                    id={`sidebar-group-${item.label.toLowerCase().replaceAll(" ", "-")}`}
                    className="ml-6 space-y-1 border-l border-gray-100 pl-3"
                  >
                    {item.children?.map((child) => {
                      const isChildActive =
                        pathname === child.href ||
                        pathname?.startsWith(`${child.href}/`);

                      const ChildIcon = child.icon;

                      return (
                        <Button
                          key={child.href}
                          asChild
                          variant="ghost"
                          className={cn(
                            "h-auto w-full justify-start gap-2 rounded-lg px-2.5 py-1.5 text-sm transition-all",
                            isChildActive
                              ? "bg-gray-100 text-gray-900 hover:bg-gray-100 hover:text-gray-900"
                              : "text-gray-500 hover:bg-gray-50 hover:text-gray-900",
                          )}
                        >
                          <Link
                            href={child.href}
                            aria-current={isChildActive ? "page" : undefined}
                          >
                            <ChildIcon
                              aria-hidden="true"
                              className={cn(
                                "size-4",
                                isChildActive
                                  ? "text-gray-900"
                                  : "text-gray-400",
                              )}
                            />

                            <span>{child.label}</span>
                          </Link>
                        </Button>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            );
          })}

          {isOpen ? (
            <p className="mb-1 mt-5 px-3 text-[10.5px] font-semibold uppercase tracking-widest text-gray-400">
              Account
            </p>
          ) : null}

          {accountNavItems.map((item) => {
            const hasChildren = !!item.children?.length;
            const isActive =
              pathname === item.href ||
              (!!hasChildren &&
                item.children?.some(
                  (child) =>
                    pathname === child.href ||
                    pathname?.startsWith(`${child.href}/`),
                ));

            const isExpanded = expandedGroups[item.href] ?? false;
            const Icon = item.icon;

            return (
              <div key={item.href} className="space-y-1">
                {hasChildren && isOpen ? (
                  <Button
                    type="button"
                    variant="ghost"
                    aria-expanded={isExpanded}
                    aria-controls={`sidebar-group-${item.label.toLowerCase()}`}
                    className={cn(
                      "h-auto w-full rounded-lg py-2 text-sm transition-all",
                      "justify-start gap-3 px-3",
                      isActive
                        ? "bg-gray-100 text-gray-900 hover:bg-gray-100 hover:text-gray-900"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
                    )}
                    onClick={() => toggleGroup(item.href)}
                  >
                    <span
                      className={cn(
                        isActive ? "text-gray-900" : "text-gray-400",
                      )}
                    >
                      <Icon aria-hidden="true" className="size-[18px]" />
                    </span>

                    <span className="flex-1 text-left">{item.label}</span>

                    <CaretDownIcon
                      aria-hidden="true"
                      className={cn(
                        "size-3.5 transition-transform",
                        isExpanded ? "rotate-180" : "rotate-0",
                        isActive ? "text-gray-500" : "text-gray-400",
                      )}
                    />
                  </Button>
                ) : (
                  <Button
                    asChild
                    variant="ghost"
                    className={cn(
                      "h-auto w-full rounded-lg py-2 text-sm transition-all",
                      isOpen
                        ? "justify-start gap-3 px-3"
                        : "justify-center px-0",
                      isActive
                        ? "bg-gray-100 text-gray-900 hover:bg-gray-100 hover:text-gray-900"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
                    )}
                  >
                    <Link
                      href={item.href}
                      aria-current={isActive ? "page" : undefined}
                      aria-label={!isOpen ? item.label : undefined}
                      title={!isOpen ? item.label : undefined}
                    >
                      <span
                        className={cn(
                          isActive ? "text-gray-900" : "text-gray-400",
                        )}
                      >
                        <Icon aria-hidden="true" className="size-[18px]" />
                      </span>

                      {isOpen ? item.label : null}
                    </Link>
                  </Button>
                )}

                {isOpen && hasChildren && isExpanded ? (
                  <div
                    id={`sidebar-group-${item.label.toLowerCase()}`}
                    className="ml-6 space-y-1 border-l border-gray-100 pl-3"
                  >
                    {item.children?.map((child) => {
                      const isChildActive =
                        pathname === child.href ||
                        pathname?.startsWith(`${child.href}/`);

                      const ChildIcon = child.icon;

                      return (
                        <Button
                          key={child.href}
                          asChild
                          variant="ghost"
                          className={cn(
                            "h-auto w-full justify-start gap-2 rounded-lg px-2.5 py-1.5 text-sm transition-all",
                            isChildActive
                              ? "bg-gray-100 text-gray-900 hover:bg-gray-100 hover:text-gray-900"
                              : "text-gray-500 hover:bg-gray-50 hover:text-gray-900",
                          )}
                        >
                          <Link
                            href={child.href}
                            aria-current={isChildActive ? "page" : undefined}
                          >
                            <ChildIcon
                              aria-hidden="true"
                              className={cn(
                                "size-4",
                                isChildActive
                                  ? "text-gray-900"
                                  : "text-gray-400",
                              )}
                            />

                            <span>{child.label}</span>
                          </Link>
                        </Button>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            );
          })}
        </nav>

        <SidebarProfileMenu isOpen={isOpen} />
      </div>
    </aside>
  );
}
