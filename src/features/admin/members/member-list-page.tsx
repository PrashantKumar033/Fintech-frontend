import { useCallback, useEffect, useState } from "react";
import { Eye, Loader2, RefreshCw, Search, ShieldCheck, UserCog, X } from "lucide-react";
import { AdminLayout, AdminPanel } from "@/components/admin/admin-layout";
import { useEffectiveAccess } from "@/hooks/use-effective-access";
import { adminApi, getAdminActor, type AdminMember, type AdminMemberDetail } from "@/lib/admin-api";
import { UI_PERMISSION } from "@/lib/ui-permissions";

const control =
  "rounded-xl border border-border bg-white px-3 py-2.5 text-sm outline-none focus:border-primary";
const messageOf = (value: unknown) =>
  value instanceof Error ? value.message : "The member request could not be completed.";

export function AdminMemberListPage() {
  const actor = getAdminActor();
  const { can } = useEffectiveAccess();
  const privileged = actor?.kind === "SUPER_ADMIN";
  const canList = privileged || can(UI_PERMISSION.MEMBER_LIST, ["SUPER_ADMIN", "ADMIN"]);
  const canView = privileged || can(UI_PERMISSION.MEMBER_VIEW, ["SUPER_ADMIN", "ADMIN"]);
  const canUpdate = privileged || can(UI_PERMISSION.MEMBER_STATUS_UPDATE, ["SUPER_ADMIN", "ADMIN"]);
  const [items, setItems] = useState<AdminMember[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState({
    search: "",
    role: "",
    status: "",
    kycStatus: "",
    aepsStatus: "",
  });
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [detail, setDetail] = useState<AdminMemberDetail | null>(null);
  const [statusTarget, setStatusTarget] = useState<AdminMember | null>(null);
  const [nextStatus, setNextStatus] = useState("ACTIVE");
  const [reason, setReason] = useState("");

  const load = useCallback(
    async (targetPage = 1) => {
      if (!canList) return;
      setLoading(true);
      setError("");
      try {
        const query = new URLSearchParams({ page: String(targetPage), limit: "20" });
        Object.entries(filters).forEach(
          ([key, value]) => value.trim() && query.set(key, value.trim()),
        );
        const response = await adminApi.operations.members(query.toString());
        setItems(response.data || []);
        setPage(response.pagination.page || targetPage);
        setPages(Math.max(response.pagination.totalPages || 1, 1));
        setTotal(response.pagination.total || 0);
      } catch (value) {
        setError(messageOf(value));
      } finally {
        setLoading(false);
      }
    },
    [canList, filters],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => void load(1), 250);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function inspect(identityId: string) {
    if (!canView) return setError(`Permission ${UI_PERMISSION.MEMBER_VIEW} is required.`);
    setBusy(true);
    setError("");
    try {
      setDetail(await adminApi.operations.member(identityId));
    } catch (value) {
      setError(messageOf(value));
    } finally {
      setBusy(false);
    }
  }

  async function updateStatus() {
    if (!statusTarget || !canUpdate) return;
    if (nextStatus !== "ACTIVE" && !reason.trim()) {
      setError("Enter a reason for restricting this member account.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await adminApi.operations.updateMemberStatus(statusTarget.id, nextStatus, reason);
      setNotice(`${statusTarget.loginId} status changed to ${nextStatus}.`);
      setStatusTarget(null);
      setReason("");
      await load(page);
    } catch (value) {
      setError(messageOf(value));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AdminLayout
      active="merchants"
      eyebrow="Network operations"
      title="Member directory"
      description="Search consolidated member, KYC and AEPS status and manage the account lifecycle."
    >
      {error && <Banner tone="error">{error}</Banner>}
      {notice && <Banner tone="success">{notice}</Banner>}
      <AdminPanel>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <label className="relative md:col-span-2">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              size={16}
            />
            <input
              value={filters.search}
              onChange={(event) =>
                setFilters((current) => ({ ...current, search: event.target.value }))
              }
              placeholder="Name, login ID, email or username"
              className={`${control} w-full pl-9`}
            />
          </label>
          <Filter
            value={filters.role}
            set={(role) => setFilters((v) => ({ ...v, role }))}
            label="All roles"
            values={["ADMIN", "MASTER_DISTRIBUTOR", "DISTRIBUTOR", "RETAILER"]}
          />
          <Filter
            value={filters.status}
            set={(status) => setFilters((v) => ({ ...v, status }))}
            label="All account statuses"
            values={["ACTIVE", "INACTIVE", "SUSPENDED", "BLOCKED"]}
          />
          <button
            type="button"
            onClick={() => void load(1)}
            className={`${control} flex items-center justify-center gap-2 font-bold`}
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
          <Filter
            value={filters.kycStatus}
            set={(kycStatus) => setFilters((v) => ({ ...v, kycStatus }))}
            label="All KYC statuses"
            values={["NOT_STARTED", "PENDING", "UNDER_REVIEW", "APPROVED", "REJECTED"]}
          />
          <Filter
            value={filters.aepsStatus}
            set={(aepsStatus) => setFilters((v) => ({ ...v, aepsStatus }))}
            label="All AEPS statuses"
            values={["NOT_STARTED", "ONBOARDING", "UNDER_REVIEW", "ACTIVE", "REJECTED", "BLOCKED"]}
          />
        </div>

        <div className="mt-5 overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-muted/60 text-xs uppercase text-muted-foreground">
              <tr>
                {["Member", "Role", "Account", "KYC", "AEPS", "Location", "Actions"].map(
                  (label) => (
                    <th key={label} className="px-4 py-3">
                      {label}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={7} className="h-44 text-center">
                    <Loader2 className="mx-auto animate-spin text-primary" />
                  </td>
                </tr>
              ) : items.length ? (
                items.map((member) => (
                  <tr key={member.id}>
                    <td className="px-4 py-3">
                      <p className="font-extrabold">{member.fullName}</p>
                      <p className="text-xs text-muted-foreground">
                        {member.loginId} · {member.email}
                      </p>
                    </td>
                    <td className="px-4 py-3 font-bold">
                      {member.role?.name?.replaceAll("_", " ")}
                    </td>
                    <td className="px-4 py-3">
                      <Status value={member.status} />
                    </td>
                    <td className="px-4 py-3">
                      <Status value={member.kycStatus} />
                    </td>
                    <td className="px-4 py-3">
                      <Status value={member.aeps?.status || "NOT_STARTED"} />
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {[member.city, member.state].filter(Boolean).join(", ") || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={!canView || busy}
                          onClick={() => void inspect(member.id)}
                          className="cursor-pointer rounded-lg border border-border p-2"
                          title="View member"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          type="button"
                          disabled={!canUpdate || busy}
                          onClick={() => {
                            setStatusTarget(member);
                            setNextStatus(member.status);
                            setReason("");
                          }}
                          className="cursor-pointer rounded-lg border border-border p-2"
                          title="Change member status"
                        >
                          <UserCog size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="h-44 text-center text-muted-foreground">
                    No members match these filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex items-center justify-between text-xs font-bold">
          <span>{total} members</span>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1 || loading}
              onClick={() => void load(page - 1)}
              className={control}
            >
              Previous
            </button>
            <span>
              Page {page} of {pages}
            </span>
            <button
              disabled={page >= pages || loading}
              onClick={() => void load(page + 1)}
              className={control}
            >
              Next
            </button>
          </div>
        </div>
      </AdminPanel>

      {detail && <DetailDialog detail={detail} close={() => setDetail(null)} />}
      {statusTarget && (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-secondary/60 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex justify-between">
              <div>
                <p className="text-xs font-black uppercase text-primary">Account lifecycle</p>
                <h2 className="text-xl font-black">{statusTarget.fullName}</h2>
              </div>
              <button onClick={() => setStatusTarget(null)}>
                <X />
              </button>
            </div>
            <label className="mt-5 block text-xs font-bold">
              New status
              <select
                value={nextStatus}
                onChange={(event) => setNextStatus(event.target.value)}
                className={`${control} mt-2 w-full`}
              >
                {["ACTIVE", "INACTIVE", "SUSPENDED", "BLOCKED"].map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </label>
            <label className="mt-4 block text-xs font-bold">
              Reason {nextStatus === "ACTIVE" ? "(optional)" : "(required)"}
              <textarea
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                rows={3}
                className={`${control} mt-2 w-full`}
              />
            </label>
            <button
              type="button"
              disabled={busy}
              onClick={() => void updateStatus()}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-white disabled:opacity-50"
            >
              {busy && <Loader2 className="animate-spin" size={16} />} Save status
            </button>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

function Filter({
  value,
  set,
  label,
  values,
}: {
  value: string;
  set: (value: string) => void;
  label: string;
  values: string[];
}) {
  return (
    <select value={value} onChange={(event) => set(event.target.value)} className={control}>
      <option value="">{label}</option>
      {values.map((item) => (
        <option key={item}>{item}</option>
      ))}
    </select>
  );
}
function Status({ value }: { value: string }) {
  const good = ["ACTIVE", "APPROVED", "VERIFIED"].includes(value);
  return (
    <span
      className={`rounded-full px-2 py-1 text-[10px] font-black ${good ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}
    >
      {value.replaceAll("_", " ")}
    </span>
  );
}
function Banner({ tone, children }: { tone: "error" | "success"; children: React.ReactNode }) {
  return (
    <p
      className={`mb-4 rounded-xl p-3 text-sm font-semibold ${tone === "error" ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}
    >
      {children}
    </p>
  );
}
function DetailDialog({ detail, close }: { detail: AdminMemberDetail; close: () => void }) {
  const sections: Array<[string, unknown]> = [
    ["Identity", detail.identity],
    ["KYC", detail.kyc],
    ["AEPS", detail.aeps],
    ["Bank accounts", detail.bankAccounts],
    ["Wallets", detail.wallets],
  ];
  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-secondary/60 p-4">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex justify-between">
          <div>
            <p className="text-xs font-black uppercase text-primary">Consolidated member</p>
            <h2 className="text-xl font-black">{detail.identity.fullName}</h2>
            <p className="text-xs text-muted-foreground">{detail.identity.loginId}</p>
          </div>
          <button onClick={close}>
            <X />
          </button>
        </div>
        {detail.partialErrors?.length ? (
          <div className="mt-4 rounded-xl bg-amber-50 p-3 text-sm font-semibold text-amber-800">
            Member identity loaded. {detail.partialErrors.join("; ")}.
          </div>
        ) : null}
        <div className="mt-5 space-y-4">
          {sections.map(([title, value]) => (
            <section key={title} className="rounded-xl border border-border p-4">
              <h3 className="flex items-center gap-2 font-black">
                <ShieldCheck size={17} />
                {title}
              </h3>
              <pre className="mt-3 max-h-52 overflow-auto whitespace-pre-wrap break-all rounded-lg bg-muted p-3 text-xs">
                {value == null ? "Not available" : JSON.stringify(value, null, 2)}
              </pre>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
