import { ShieldAlert } from "lucide-react";
import type { ReactNode } from "react";
import type { EffectiveAccess } from "@/lib/auth-api";
import type { PlatformRole } from "@/lib/role-hierarchy";
import {
  canAccessUiArea,
  canUseAllPermissions,
  canUsePermission,
  permissionsForArea,
  type UiArea,
} from "@/lib/ui-permissions";

export function PermissionBoundary({
  area,
  permission,
  requireAll = false,
  role,
  access,
  dedicatedSuperAdmin = false,
  fallbackRoles = [],
  children,
}: {
  area?: UiArea;
  permission?: string | readonly string[];
  requireAll?: boolean;
  role?: string | null;
  access?: EffectiveAccess | null;
  dedicatedSuperAdmin?: boolean;
  fallbackRoles?: readonly PlatformRole[];
  children: ReactNode;
}) {
  const requested = permission ? (typeof permission === "string" ? [permission] : permission) : [];
  const allowed = permission
    ? requireAll
      ? canUseAllPermissions(requested, {
          role,
          access,
          dedicatedSuperAdmin,
          fallbackRoles,
        })
      : canUsePermission(requested, { role, access, dedicatedSuperAdmin, fallbackRoles })
    : area
      ? canAccessUiArea(area, { role, access, dedicatedSuperAdmin })
      : false;
  if (allowed) return <>{children}</>;

  const expected = requested.length ? requested : area ? permissionsForArea(area) : [];
  return (
    <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-950 shadow-sm">
      <div className="flex gap-4">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white text-amber-700">
          <ShieldAlert size={20} />
        </span>
        <div>
          <h2 className="text-lg font-black">Access not granted</h2>
          <p className="mt-1 text-sm leading-6 text-amber-900/75">
            Your active role packages do not grant this section. Ask an administrator to review your
            package and permission assignment.
          </p>
          {expected.length > 0 && (
            <p className="mt-3 text-xs font-bold text-amber-800">
              Expected permission: {expected.join(" or ")}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
