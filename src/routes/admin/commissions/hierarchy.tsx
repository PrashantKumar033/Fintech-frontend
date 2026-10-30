import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { GitBranch, Loader2, Plus, RefreshCw, Search, Trash2 } from "lucide-react";
import { AdminLayout, AdminPanel } from "@/components/admin/admin-layout";
import { ActionPermissionNotice } from "@/components/action-permission-notice";
import { useEffectiveAccess } from "@/hooks/use-effective-access";
import { UI_PERMISSION } from "@/lib/ui-permissions";
import { adminApi, getAdminActor, type CommissionHierarchy } from "@/lib/admin-api";

export const Route = createFileRoute("/admin/commissions/hierarchy")({ component: Hierarchy });
const inputClass =
  "w-full rounded-xl border border-border bg-white px-3.5 py-3 text-sm outline-none focus:border-primary";
const empty = {
  parentUserId: "",
  parentRole: "ADMIN",
  childUserId: "",
  childRole: "MASTER_DISTRIBUTOR",
  serviceType: "",
  isActive: true,
};
function Hierarchy() {
  const actor = getAdminActor();
  const { can } = useEffectiveAccess();
  const allowed = (code: string) => actor?.kind === "SUPER_ADMIN" || can(code, ["ADMIN"]);
  const canViewHierarchy = allowed(UI_PERMISSION.COMMISSION_HIERARCHY_VIEW);
  const canCreateHierarchy = allowed(UI_PERMISSION.COMMISSION_HIERARCHY_CREATE);
  const canUpdateHierarchy = allowed(UI_PERMISSION.COMMISSION_HIERARCHY_UPDATE);
  const canDeleteHierarchy = allowed(UI_PERMISSION.COMMISSION_HIERARCHY_DELETE);
  const [items, setItems] = useState<CommissionHierarchy[]>([]),
    [draft, setDraft] = useState(empty),
    [query, setQuery] = useState(""),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const [diagnosticUser, setDiagnosticUser] = useState(""),
    [diagnosticService, setDiagnosticService] = useState("AEPS"),
    [diagnosticResult, setDiagnosticResult] = useState<unknown>(null);
  async function diagnose(kind: "resolve" | "parents" | "children" | "record") {
    if (!canViewHierarchy)
      return setError(`Permission ${UI_PERMISSION.COMMISSION_HIERARCHY_VIEW} is required.`);
    if (!diagnosticUser.trim()) return setError("Enter a user ID for hierarchy diagnostics.");
    setBusy(true);
    setError("");
    try {
      setDiagnosticResult(
        kind === "resolve"
          ? await adminApi.commissionHierarchy.resolve(
              diagnosticUser.trim(),
              diagnosticService.trim().toUpperCase(),
            )
          : kind === "parents"
            ? await adminApi.commissionHierarchy.parents(
                diagnosticUser.trim(),
                diagnosticService.trim().toUpperCase() || undefined,
              )
            : kind === "children"
              ? await adminApi.commissionHierarchy.children(diagnosticUser.trim())
              : await adminApi.commissionHierarchy.get(diagnosticUser.trim()),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to resolve hierarchy.");
    } finally {
      setBusy(false);
    }
  }
  const load = useCallback(async () => {
    if (!canViewHierarchy) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      setItems(await adminApi.commissionHierarchy.list());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load hierarchy.");
    } finally {
      setLoading(false);
    }
  }, [canViewHierarchy]);
  useEffect(() => {
    void load();
  }, [load]);
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!canCreateHierarchy)
      return setError(`Permission ${UI_PERMISSION.COMMISSION_HIERARCHY_CREATE} is required.`);
    if (draft.parentUserId.trim() === draft.childUserId.trim())
      return setError("Parent and child user must be different.");
    setBusy(true);
    setError("");
    try {
      await adminApi.commissionHierarchy.create({
        ...draft,
        parentUserId: draft.parentUserId.trim(),
        childUserId: draft.childUserId.trim(),
        serviceType: draft.serviceType.trim().toUpperCase() || undefined,
      });
      setNotice("Commission hierarchy link created.");
      setDraft(empty);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create hierarchy.");
    } finally {
      setBusy(false);
    }
  }
  async function toggle(item: CommissionHierarchy) {
    if (!canUpdateHierarchy)
      return setError(`Permission ${UI_PERMISSION.COMMISSION_HIERARCHY_UPDATE} is required.`);
    const nextActive = !item.isActive;
    setBusy(true);
    setError("");
    try {
      await adminApi.commissionHierarchy.update(item.id, { isActive: nextActive });
      setNotice(`Hierarchy link ${item.isActive ? "deactivated" : "activated"}.`);
      setItems((current) =>
        current.map((entry) => (entry.id === item.id ? { ...entry, isActive: nextActive } : entry)),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to update hierarchy.");
    } finally {
      setBusy(false);
    }
  }
  async function remove(item: CommissionHierarchy) {
    if (!canDeleteHierarchy)
      return setError(`Permission ${UI_PERMISSION.COMMISSION_HIERARCHY_DELETE} is required.`);
    if (!confirm("Delete this hierarchy link? Existing commission ledger records are not changed."))
      return;
    setBusy(true);
    try {
      await adminApi.commissionHierarchy.remove(item.id);
      setNotice("Hierarchy link deleted.");
      setItems((current) => current.filter((entry) => entry.id !== item.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to delete hierarchy.");
    } finally {
      setBusy(false);
    }
  }
  const visible = useMemo(() => {
    const n = query.toLowerCase().trim();
    return n
      ? items.filter((v) =>
          `${v.parentUserId} ${v.parentRole} ${v.childUserId} ${v.childRole} ${v.serviceType || ""}`
            .toLowerCase()
            .includes(n),
        )
      : items;
  }, [items, query]);
  return (
    <AdminLayout
      active="commissions"
      eyebrow="Commission routing"
      title="Commission hierarchy"
      description="Define and maintain parent-child commission paths, with optional service-specific routing."
    >
      {!canViewHierarchy && (
        <div className="mb-5">
          <ActionPermissionNotice
            permission={UI_PERMISSION.COMMISSION_HIERARCHY_VIEW}
            title="Commission hierarchy is not enabled"
          />
        </div>
      )}
      <div className="mb-5 inline-flex rounded-xl border border-border bg-white p-1">
        <Link
          to="/admin/commissions"
          search={{ view: "rules" }}
          className="rounded-lg px-4 py-2.5 text-xs font-extrabold text-muted-foreground"
        >
          Configured Rules
        </Link>
        <span className="rounded-lg bg-secondary px-4 py-2.5 text-xs font-extrabold text-white">
          Hierarchy
        </span>
      </div>
      <AdminPanel className="mb-6">
        <h2 className="font-black">Hierarchy diagnostics</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Resolve the effective commission chain or inspect direct parents before changing routing.
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-[1fr_180px_repeat(4,auto)]">
          <input
            value={diagnosticUser}
            onChange={(e) => setDiagnosticUser(e.target.value)}
            placeholder="Source or child user ID"
            className={inputClass}
          />
          <input
            value={diagnosticService}
            onChange={(e) => setDiagnosticService(e.target.value.toUpperCase())}
            placeholder="AEPS"
            className={inputClass}
          />
          <button
            disabled={busy}
            onClick={() => void diagnose("resolve")}
            className="rounded-xl bg-secondary px-4 py-3 text-xs font-extrabold text-white"
          >
            Resolve chain
          </button>
          <button
            disabled={busy}
            onClick={() => void diagnose("parents")}
            className="rounded-xl border border-border px-4 py-3 text-xs font-extrabold"
          >
            Direct parents
          </button>
          <button
            disabled={busy}
            onClick={() => void diagnose("children")}
            className="rounded-xl border border-border px-4 py-3 text-xs font-extrabold"
          >
            Direct children
          </button>
          <button
            disabled={busy}
            onClick={() => void diagnose("record")}
            className="rounded-xl border border-border px-4 py-3 text-xs font-extrabold"
          >
            Record by ID
          </button>
        </div>
        {diagnosticResult !== null && (
          <pre className="mt-4 max-h-72 overflow-auto rounded-xl bg-secondary p-4 text-xs text-white">
            {JSON.stringify(diagnosticResult, null, 2)}
          </pre>
        )}
      </AdminPanel>
      {error && (
        <p
          role="alert"
          className="mb-5 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700"
        >
          {error}
        </p>
      )}
      {notice && (
        <p className="mb-5 rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">
          {notice}
        </p>
      )}
      <div className="grid gap-6 xl:grid-cols-[400px_1fr]">
        <AdminPanel>
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
              <GitBranch size={18} />
            </span>
            <div>
              <h2 className="font-black">Add hierarchy link</h2>
              <p className="text-xs text-muted-foreground">
                User IDs must exist in the identity service.
              </p>
            </div>
          </div>
          <form onSubmit={submit} className="mt-5 space-y-4">
            <Field label="Parent user ID">
              <input
                required
                value={draft.parentUserId}
                onChange={(e) => setDraft({ ...draft, parentUserId: e.target.value })}
                className={inputClass}
              />
            </Field>
            <Field label="Parent role">
              <select
                value={draft.parentRole}
                onChange={(e) => setDraft({ ...draft, parentRole: e.target.value })}
                className={inputClass}
              >
                {["SUPER_ADMIN", "ADMIN", "MASTER_DISTRIBUTOR", "DISTRIBUTOR"].map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </Field>
            <Field label="Child user ID">
              <input
                required
                value={draft.childUserId}
                onChange={(e) => setDraft({ ...draft, childUserId: e.target.value })}
                className={inputClass}
              />
            </Field>
            <Field label="Child role">
              <select
                value={draft.childRole}
                onChange={(e) => setDraft({ ...draft, childRole: e.target.value })}
                className={inputClass}
              >
                {["ADMIN", "MASTER_DISTRIBUTOR", "DISTRIBUTOR", "RETAILER"].map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </Field>
            <Field label="Service type (optional)">
              <input
                value={draft.serviceType}
                onChange={(e) => setDraft({ ...draft, serviceType: e.target.value.toUpperCase() })}
                placeholder="AEPS"
                className={inputClass}
              />
            </Field>
            <button
              disabled={!canCreateHierarchy || busy}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-xs font-extrabold text-white"
            >
              <Plus size={14} />
              Create link
            </button>
          </form>
        </AdminPanel>
        <AdminPanel>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-black">Configured hierarchy</h2>
              <p className="text-xs text-muted-foreground">{items.length} parent-child links</p>
            </div>
            <div className="flex gap-2">
              <label className="flex items-center gap-2 rounded-xl border border-border px-3">
                <Search size={14} />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search user or role"
                  className="py-2.5 text-xs outline-none"
                />
              </label>
              <button onClick={() => void load()} className="rounded-xl border border-border p-3">
                <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              </button>
            </div>
          </div>
          {loading ? (
            <div className="flex justify-center py-14">
              <Loader2 className="animate-spin text-primary" />
            </div>
          ) : (
            <div className="mt-5 space-y-3">
              {visible.map((item) => (
                <div key={item.id} className="rounded-xl border border-border p-4">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-black">{item.parentRole}</span>
                        <span>→</span>
                        <span className="font-black">{item.childRole}</span>
                        <span
                          className={`rounded-full px-2 py-1 text-[9px] font-extrabold ${item.isActive ? "bg-emerald-50 text-emerald-700" : "bg-muted text-muted-foreground"}`}
                        >
                          {item.isActive ? "ACTIVE" : "INACTIVE"}
                        </span>
                      </div>
                      <p className="mt-2 break-all text-xs text-muted-foreground">
                        {item.parentUserId} → {item.childUserId}
                      </p>
                      <p className="mt-1 text-[10px] font-bold text-primary">
                        {item.serviceType || "ALL SERVICES"}
                      </p>
                    </div>
                    <button
                      disabled={!canUpdateHierarchy || busy}
                      onClick={() => void toggle(item)}
                      className="rounded-lg border border-border px-3 py-2 text-xs font-bold"
                    >
                      {item.isActive ? "Deactivate" : "Activate"}
                    </button>
                    <button
                      disabled={!canDeleteHierarchy || busy}
                      onClick={() => void remove(item)}
                      className="rounded-lg border border-red-200 p-2 text-red-700"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
              {!visible.length && (
                <p className="rounded-xl border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
                  No hierarchy links found.
                </p>
              )}
            </div>
          )}
        </AdminPanel>
      </div>
    </AdminLayout>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-extrabold uppercase text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}
