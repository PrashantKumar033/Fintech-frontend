import { Link } from "@tanstack/react-router";

export type SectionTab = { label: string; href: string };

export function SectionTabs({ tabs }: { tabs: SectionTab[] }) {
  if (!tabs.length) return null;
  const current =
    typeof window === "undefined" ? "" : `${window.location.pathname}${window.location.search}`;
  return (
    <nav
      aria-label="Section navigation"
      className="mb-6 overflow-x-auto rounded-2xl border border-border bg-white p-2 shadow-sm"
    >
      <div className="flex min-w-max items-center gap-1">
        {tabs.map((tab, index) => {
          const active = current
            ? current === tab.href ||
              (!tab.href.includes("?") && current.split("?")[0] === tab.href)
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
