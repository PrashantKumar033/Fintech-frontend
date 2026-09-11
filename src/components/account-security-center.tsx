import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  BadgeCheck,
  Clock3,
  KeyRound,
  Laptop,
  Loader2,
  LogOut,
  MapPin,
  RefreshCw,
  Search,
  Smartphone,
  Trash2,
  Wifi,
  X,
} from "lucide-react";
import {
  ApiError,
  authApi,
  clearSession,
  getEffectiveAccess,
  syncMyPermissions,
  type ActiveSession,
  type EffectiveAccess,
} from "@/lib/auth-api";

function dateTime(value?: string | null) {
  if (!value) return "Not available";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Not available";
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsed);
}

function userAgentLabel(userAgent?: string | null) {
  if (!userAgent) return "Unknown browser";
  const browser = userAgent.includes("Edg/")
    ? "Microsoft Edge"
    : userAgent.includes("Chrome/")
      ? "Chrome"
      : userAgent.includes("Firefox/")
        ? "Firefox"
        : userAgent.includes("Safari/") && !userAgent.includes("Chrome/")
          ? "Safari"
          : "Browser";
  const os = userAgent.includes("Windows")
    ? "Windows"
    : userAgent.includes("Android")
      ? "Android"
      : /iPhone|iPad|iPod/.test(userAgent)
        ? "iOS"
        : userAgent.includes("Mac OS")
          ? "macOS"
          : userAgent.includes("Linux")
            ? "Linux"
            : "Unknown OS";
  return `${browser} on ${os}`;
}

function sessionName(session: ActiveSession) {
  return session.device?.trim() || userAgentLabel(session.userAgent);
}

function DeviceIcon({ session }: { session: ActiveSession }) {
  const agent = `${session.device || ""} ${session.userAgent || ""}`.toLowerCase();
  if (agent.includes("android") || agent.includes("iphone") || agent.includes("mobile")) {
    return <Smartphone size={19} />;
  }
  return <Laptop size={19} />;
}

type PendingAction =
  | { kind: "session"; session: ActiveSession }
  | { kind: "others" }
  | { kind: "all" }
  | null;

export function IdentitySecurityCenter() {
  return (
    <div className="grid gap-6 2xl:grid-cols-2">
      <ActiveSessionsPanel />
      <EffectiveAccessPanel />
    </div>
  );
}

function ActiveSessionsPanel() {
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [selected, setSelected] = useState<ActiveSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState<PendingAction>(null);

  const current = sessions.find((item) => item.isCurrent);
  const otherCount = sessions.filter((item) => !item.isCurrent).length;

  async function load() {
    setLoading(true);
    setError("");
    try {
      setSessions(await authApi.getSessions());
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Unable to load active sessions.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function viewDetails(session: ActiveSession) {
    setError("");
    try {
      setSelected(await authApi.getSessionDetails(session.id));
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Unable to load session details.");
    }
  }

  async function confirmAction() {
    if (!pending) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      if (pending.kind === "session") {
        const result = await authApi.revokeSession(pending.session.id);
        if (result.isCurrent) {
          clearSession();
          window.location.assign("/login");
          return;
        }
        setNotice("Session revoked successfully.");
      } else if (pending.kind === "others") {
        const result = await authApi.revokeOtherSessions();
        setNotice(`${result.revokedCount} other session${result.revokedCount === 1 ? "" : "s"} revoked.`);
      } else {
        await authApi.revokeAllSessions();
        clearSession();
        window.location.assign("/login");
        return;
      }
      setPending(null);
      setSelected(null);
      await load();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Unable to revoke the selected session.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border border-border bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[.16em] text-primary">Account security</p>
          <h2 className="mt-1 text-xl font-black text-secondary">Active sessions & devices</h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Review signed-in devices and revoke any session you do not recognize.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading || busy}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-border px-3 py-2.5 text-xs font-extrabold text-secondary hover:bg-muted disabled:opacity-50"
        >
          <RefreshCw size={15} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}
      {notice && <p className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">{notice}</p>}

      {pending && (
        <div className={`mt-4 rounded-xl border p-4 ${pending.kind === "all" || (pending.kind === "session" && pending.session.isCurrent) ? "border-red-200 bg-red-50" : "border-amber-200 bg-amber-50"}`}>
          <p className="text-sm font-black text-secondary">
            {pending.kind === "session"
              ? pending.session.isCurrent
                ? "Sign out this current device?"
                : "Revoke this device session?"
              : pending.kind === "others"
                ? "Sign out all other devices?"
                : "Sign out every device?"}
          </p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {pending.kind === "session" && pending.session.isCurrent
              ? "Your current session will be revoked and you will return to the login screen."
              : pending.kind === "all"
                ? "Every active session, including this one, will be revoked. You will need to sign in again."
                : "The selected session tokens will stop working after the backend revokes them."}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" disabled={busy} onClick={() => setPending(null)} className="rounded-xl border border-border bg-white px-4 py-2 text-xs font-extrabold text-secondary disabled:opacity-50">Cancel</button>
            <button type="button" disabled={busy} onClick={() => void confirmAction()} className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-xs font-extrabold text-white disabled:opacity-50">
              {busy ? <Loader2 size={14} className="animate-spin" /> : <LogOut size={14} />}
              Confirm revoke
            </button>
          </div>
        </div>
      )}

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-muted/40 p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Active sessions</p>
          <p className="mt-1 text-2xl font-black text-secondary">{loading ? "…" : sessions.length}</p>
        </div>
        <div className="rounded-xl border border-border bg-muted/40 p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Other devices</p>
          <p className="mt-1 text-2xl font-black text-secondary">{loading ? "…" : otherCount}</p>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {loading && !sessions.length ? (
          <div className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-border py-10 text-sm font-semibold text-muted-foreground"><Loader2 size={17} className="animate-spin" /> Loading secure sessions…</div>
        ) : sessions.length ? sessions.map((session) => (
          <div key={session.id} className={`rounded-xl border p-4 ${session.isCurrent ? "border-emerald-200 bg-emerald-50/50" : "border-border bg-white"}`}>
            <div className="flex gap-3">
              <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${session.isCurrent ? "bg-emerald-100 text-emerald-700" : "bg-muted text-secondary"}`}><DeviceIcon session={session} /></span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate text-sm font-black text-secondary">{sessionName(session)}</p>
                  {session.isCurrent && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-extrabold text-emerald-700">CURRENT</span>}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">Last used {dateTime(session.lastUsedAt || session.createdAt)}</p>
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-[11px] font-semibold text-muted-foreground">
                  <span className="inline-flex items-center gap-1"><Wifi size={12} /> {session.ipAddress || "IP unavailable"}</span>
                  <span className="inline-flex items-center gap-1"><Clock3 size={12} /> Expires {dateTime(session.expiresAt)}</span>
                </div>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2 border-t border-border/70 pt-3">
              <button type="button" onClick={() => void viewDetails(session)} className="rounded-lg border border-border px-3 py-2 text-[11px] font-extrabold text-secondary hover:bg-muted">View details</button>
              <button type="button" onClick={() => setPending({ kind: "session", session })} className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-[11px] font-extrabold text-red-700 hover:bg-red-50"><Trash2 size={13} /> {session.isCurrent ? "Sign out this device" : "Revoke"}</button>
            </div>
          </div>
        )) : (
          <p className="rounded-xl border border-dashed border-border py-10 text-center text-sm text-muted-foreground">No active sessions were returned by the backend.</p>
        )}
      </div>

      {selected && (
        <div className="mt-5 rounded-xl border border-primary/20 bg-primary/5 p-4">
          <div className="flex items-start justify-between gap-3">
            <div><p className="text-xs font-extrabold uppercase tracking-wider text-primary">Session details</p><p className="mt-1 text-sm font-black text-secondary">{sessionName(selected)}</p></div>
            <button type="button" onClick={() => setSelected(null)} aria-label="Close session details" className="grid h-8 w-8 place-items-center rounded-lg border border-border bg-white text-muted-foreground"><X size={14} /></button>
          </div>
          <dl className="mt-4 grid gap-3 text-xs sm:grid-cols-2">
            <Detail label="Session ID" value={selected.id} />
            <Detail label="IP address" value={selected.ipAddress || "Not available"} />
            <Detail label="Created" value={dateTime(selected.createdAt)} />
            <Detail label="Last used" value={dateTime(selected.lastUsedAt)} />
            <Detail label="Expires" value={dateTime(selected.expiresAt)} />
            <Detail label="Location" value={selected.latitude != null && selected.longitude != null ? `Captured (${selected.locationAccuracy ? `±${Math.round(selected.locationAccuracy)}m` : "accuracy unavailable"})` : "Not captured"} icon={<MapPin size={12} />} />
          </dl>
          {selected.userAgent && <p className="mt-3 break-all rounded-lg bg-white p-3 text-[11px] leading-5 text-muted-foreground">{selected.userAgent}</p>}
        </div>
      )}

      <div className="mt-5 flex flex-wrap gap-2 border-t border-border pt-5">
        <button type="button" disabled={!otherCount || busy || loading} onClick={() => setPending({ kind: "others" })} className="rounded-xl border border-border px-4 py-2.5 text-xs font-extrabold text-secondary hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40">Sign out other devices</button>
        <button type="button" disabled={!sessions.length || busy || loading} onClick={() => setPending({ kind: "all" })} className="rounded-xl border border-red-200 px-4 py-2.5 text-xs font-extrabold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40">Sign out all devices</button>
      </div>
      {current && <p className="mt-3 text-[11px] leading-5 text-muted-foreground">Current session: <span className="font-bold text-secondary">{current.id}</span></p>}
    </section>
  );
}

function EffectiveAccessPanel() {
  const [access, setAccess] = useState<EffectiveAccess | null>(() => getEffectiveAccess());
  const [loading, setLoading] = useState(!access);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      setAccess(await syncMyPermissions());
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Unable to load your effective permissions.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const permissions = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!access || !normalized) return access?.permissions || [];
    return access.permissions.filter((item) => `${item.code} ${item.name} ${item.description || ""}`.toLowerCase().includes(normalized));
  }, [access, query]);

  return (
    <section className="rounded-2xl border border-border bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[.16em] text-primary">Effective authorization</p>
          <h2 className="mt-1 text-xl font-black text-secondary">Your packages & permissions</h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            This data comes from <code className="rounded bg-muted px-1.5 py-0.5 text-xs">/auth/me/permissions</code> for the signed-in identity.
          </p>
        </div>
        <button type="button" onClick={() => void load()} disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-xl border border-border px-3 py-2.5 text-xs font-extrabold text-secondary hover:bg-muted disabled:opacity-50"><RefreshCw size={15} className={loading ? "animate-spin" : ""} /> Refresh access</button>
      </div>

      {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}

      {loading && !access ? (
        <div className="mt-5 flex items-center justify-center gap-2 rounded-xl border border-dashed border-border py-12 text-sm font-semibold text-muted-foreground"><Loader2 size={17} className="animate-spin" /> Resolving permissions…</div>
      ) : access ? (
        <>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <Stat label="Role" value={access.role?.name || "Unknown"} ok={access.role?.isActive} />
            <Stat label="Packages" value={String(access.packages?.length || 0)} />
            <Stat label="Permissions" value={String(access.permissionCodes?.length || 0)} />
          </div>

          <div className="mt-5">
            <p className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">Assigned packages</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {access.packages?.length ? access.packages.map((item) => <span key={item.id} className="rounded-full border border-primary/20 bg-primary/5 px-3 py-1.5 text-xs font-extrabold text-primary">{item.name} <span className="font-medium opacity-70">({item.code})</span></span>) : <span className="text-xs text-muted-foreground">No active package is currently assigned to this role.</span>}
            </div>
          </div>

          <div className="mt-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">Effective permissions</p>
              <label className="flex items-center gap-2 rounded-xl border border-border bg-white px-3 py-2 text-xs text-muted-foreground sm:w-64"><Search size={14} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search permission" className="min-w-0 flex-1 bg-transparent outline-none" /></label>
            </div>
            <div className="mt-3 max-h-[430px] space-y-2 overflow-y-auto pr-1">
              {permissions.length ? permissions.map((permission) => (
                <div key={permission.id} className="rounded-xl border border-border p-3">
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-emerald-50 text-emerald-700"><KeyRound size={14} /></span>
                    <div className="min-w-0"><p className="break-all text-xs font-black text-secondary">{permission.code}</p><p className="mt-1 text-xs font-semibold text-muted-foreground">{permission.name}</p>{permission.description && <p className="mt-1 text-[11px] leading-5 text-muted-foreground">{permission.description}</p>}</div>
                  </div>
                </div>
              )) : <p className="rounded-xl border border-dashed border-border py-8 text-center text-xs text-muted-foreground">{query ? "No permission matches your search." : "No active effective permissions were returned."}</p>}
            </div>
          </div>

          <div className="mt-5 flex gap-3 rounded-xl bg-emerald-50 p-4 text-xs leading-5 text-emerald-800"><BadgeCheck size={18} className="mt-0.5 shrink-0" /><p><strong>Backend remains the final authority.</strong> This frontend cache helps the UI understand your access, but protected backend routes must still enforce their own guards and permissions.</p></div>
        </>
      ) : null}
    </section>
  );
}

function Stat({ label, value, ok }: { label: string; value: string; ok?: boolean }) {
  return <div className="rounded-xl border border-border bg-muted/40 p-4"><p className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">{label}</p><div className="mt-1 flex items-center gap-2"><p className="truncate text-lg font-black text-secondary">{value}</p>{ok !== undefined && <span className={`rounded-full px-2 py-0.5 text-[9px] font-extrabold ${ok ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>{ok ? "ACTIVE" : "INACTIVE"}</span>}</div></div>;
}

function Detail({ label, value, icon }: { label: string; value: string; icon?: ReactNode }) {
  return <div className="rounded-lg bg-white p-3"><dt className="flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">{icon}{label}</dt><dd className="mt-1 break-all font-bold text-secondary">{value}</dd></div>;
}
