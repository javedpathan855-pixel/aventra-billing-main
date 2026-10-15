"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/shared/utils/cn";
import {
  getCategoryDescription,
  getSectionForPathname,
  getSidebarItems,
  isActiveRoute,
  sidebarOpacityForDistance,
} from "./dashboardNavigation";

/**
 * Category-aware dashboard sidebar. Renders inside the existing dashboard
 * shell next to the main content — never a separate dashboard or a second
 * sidebar implementation. Everything is derived from the current route
 * through the shared navigation configuration, so refresh, deep links, and
 * browser back/forward always restore the correct category and active item
 * with no transient state to go stale.
 *
 * Visual contract: no header, no footer, no titles — only the category's
 * working navigation links. The group centers vertically when it fits and
 * scrolls when it does not. Opacity fades progressively with distance from
 * the active item; the active item is always fully opaque and highlights
 * text and icon cleanly plus aria-current with no background box or hover pill.
 */
export const DashboardSidebar = () => {
  const pathname = usePathname();
  const activeLinkRef = useRef<HTMLAnchorElement>(null);

  const section = getSectionForPathname(pathname);
  const items = section ? getSidebarItems(section) : [];
  const activeIndex = items.findIndex((item) =>
    isActiveRoute(item.href, pathname),
  );

  useEffect(() => {
    activeLinkRef.current?.scrollIntoView({ block: "nearest" });
  }, [pathname]);

  if (items.length === 0) {
    return null;
  }

  return (
    <aside className="sticky top-14 hidden h-[calc(100dvh-3.5rem)] w-60 shrink-0 md:flex md:flex-col">
      <nav
        aria-label={`${section?.label ?? "Dashboard"} navigation`}
        className="flex flex-1 flex-col overflow-y-auto px-3 py-4"
      >
        <ul className="m-auto flex w-full flex-col gap-1">
          {items.map((item, index) => {
            const isActive = index === activeIndex;
            const distance =
              activeIndex < 0 ? 0 : Math.abs(index - activeIndex);
            const Icon = item.icon;
            return (
              <li key={item.id}>
                <Link
                  ref={isActive ? activeLinkRef : undefined}
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  title={item.description}
                  className={cn(
                    "group relative flex items-center gap-3.5 rounded-md px-3 py-2 text-base transition motion-reduce:transition-none hover:opacity-100 focus-visible:opacity-100 focus-visible:outline focus-visible:outline-focus",
                    sidebarOpacityForDistance(distance),
                    isActive
                      ? "font-medium text-text-primary"
                      : "text-text-secondary hover:text-text-primary",
                  )}
                >
                  <Icon
                    aria-hidden="true"
                    className={cn(
                      "h-5 w-5 shrink-0 transition-colors",
                      isActive
                        ? "text-primary-light"
                        : "text-text-secondary group-hover:text-text-primary",
                    )}
                  />
                  <span className="truncate">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      {section && (
        <footer className="shrink-0 border-t border-border/40 px-4 py-4 text-center">
          <div className="flex flex-col items-center justify-center gap-1">
            <span className="text-sm font-semibold uppercase tracking-[0.14em] text-text-primary">
              {section.label}
            </span>
            <p className="font-signature text-lg leading-tight text-text-muted">
              {getCategoryDescription(section.label)}
            </p>
          </div>
        </footer>
      )}
    </aside>
  );
};
