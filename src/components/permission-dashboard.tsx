import { Fragment, type ReactNode } from "react";
import type { DashboardFeatureKey } from "@/lib/permission-dashboard";

export function DashboardFeature({ allowed, children }: { allowed: boolean; children: ReactNode }) {
  return allowed ? <>{children}</> : null;
}

export type PermissionDashboardWidget = {
  key: string;
  feature: DashboardFeatureKey;
  content: ReactNode;
};

export function PermissionDashboardGrid({
  widgets,
  canShow,
  className = "grid gap-4 sm:grid-cols-2 xl:grid-cols-4",
}: {
  widgets: readonly PermissionDashboardWidget[];
  canShow: (feature: DashboardFeatureKey) => boolean;
  className?: string;
}) {
  const visible = widgets.filter((widget) => canShow(widget.feature));
  if (!visible.length) return null;
  return (
    <div className={className}>
      {visible.map((widget) => (
        <Fragment key={widget.key}>{widget.content}</Fragment>
      ))}
    </div>
  );
}
