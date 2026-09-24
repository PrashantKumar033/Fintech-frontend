import { Link, useLocation } from "@tanstack/react-router";
import type { EffectiveAccess } from "@/lib/auth-api";
import { canAccessUiArea, canUsePermission, type UiArea } from "@/lib/ui-permissions";
import { resolveWorkspaceRole } from "@/lib/role-hierarchy";

export type SectionTab = {
  label: string;
  href: string;
  permission?: string | readonly string[];
  area?: UiArea;
};

export function SectionTabs({
  tabs,
  role,
  access,
  dedicatedSuperAdmin = false,
}: {
  tabs: SectionTab[];
  role?: string | null;
  access?: EffectiveAccess | null;
  dedicatedSuperAdmin?: boolean;
}) {
  const current = useLocation({ select: (location) => location.href.split("#")[0] });
  const normalizedRole = resolveWorkspaceRole(role, access || undefined);
  const visibleTabs = tabs.filter((tab) => {
    if (tab.permission) {
      return canUsePermission(tab.permission, {
        role,
        access,
        dedicatedSuperAdmin,
        fallbackRoles: normalizedRole ? [normalizedRole] : [],
      });
    }
    if (tab.area) return canAccessUiArea(tab.area, { role, access, dedicatedSuperAdmin });
    return true;
  });
  if (!visibleTabs.length) return null;
  return (
    <nav
      aria-label="Section navigation"
      className="mb-6 overflow-x-auto rounded-2xl border border-border bg-white p-2 shadow-sm"
    >
      <div className="flex min-w-max items-center gap-1">
        {visibleTabs.map((tab, index) => {
          const currentHasQuery = current.includes("?");
          const active = current
            ? current === tab.href ||
              (!tab.href.includes("?") && !currentHasQuery && current.split("?")[0] === tab.href)
            : index === 0;
          return (
            <Link
              key={tab.href}
              to={tab.href as never}
              aria-current={active ? "page" : undefined}
              className={`whitespace-nowrap rounded-xl px-4 py-2.5 text-xs font-extrabold transition sm:text-sm ${active ? "bg-primary text-white shadow-sm" : "text-secondary hover:bg-muted"}`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
