import { ShieldAlert } from "lucide-react";

export function ActionPermissionNotice({
  permission,
  title = "Action not available",
  text,
}: {
  permission: string;
  title?: string;
  text?: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-950">
      <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" />
      <div>
        <p className="font-bold">{title}</p>
        <p className="mt-1 text-sm">
          {text || "Your active role package does not grant this action."}
        </p>
        <p className="mt-1 text-xs font-semibold text-amber-800">Required: {permission}</p>
      </div>
    </div>
  );
}
