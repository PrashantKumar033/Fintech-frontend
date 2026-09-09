import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import {
  BadgeCheck,
  Bell,
  ChevronRight,
  Eye,
  EyeOff,
  KeyRound,
  Mail,
  MonitorSmartphone,
  Network,
  Phone,
  RefreshCw,
  Shield,
  ShieldCheck,
  User,
} from "lucide-react";
import { BusinessPage } from "@/components/business-page";
import { IdentitySecurityCenter } from "@/components/account-security-center";
import { ContactVerificationCenter } from "@/components/contact-verification-center";
import {
  ApiError,
  authApi,
  getSession,
  refreshSession,
  updateSessionIdentity,
  type Identity,
} from "@/lib/auth-api";
import { identityVerificationPending } from "@/lib/role-hierarchy";

export const Route = createFileRoute("/retailer/settings")({
  head: () => ({ meta: [{ title: "Settings & preferences — UMOBIPAY" }] }),
  component: RetailerSettingsPage,
});

type SettingsView = "profile" | "security" | "access" | "preferences";

function RetailerSettingsPage() {
  const navigate = useNavigate();
  const [session, setSession] = useState<ReturnType<typeof getSession>>(null);

  useEffect(() => {
    const stored = getSession();
    if (!stored) {
      void navigate({ to: "/login" });
      return;
    }
    if (identityVerificationPending(stored)) {
      window.location.replace("/retailer/account-setup");
      return;
    }
    setSession(stored);
  }, [navigate]);

  if (!session)
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <RefreshCw className="animate-spin text-primary" />
      </div>
    );

  const updateIdentity = (identity: Identity) => {
    updateSessionIdentity(identity);
    setSession((current) => (current ? { ...current, identity } : current));
  };

  return (
    <BusinessPage identity={session.identity} active="settings" showPageHeader={false}>
      {!session.identity.passwordChangedAt || !session.identity.mpinChangedAt ? (
        <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <strong>Complete first-login security</strong>
          <p className="mt-1 text-amber-800/80">
            Change both the temporary password and temporary MPIN once to unlock all services.
          </p>
        </div>
      ) : null}
      <SettingsPage
        identity={session.identity}
        accessToken={session.accessToken}
        onIdentityChange={updateIdentity}
        onUnlocked={() => void navigate({ to: "/retailer/dashboard" })}
      />
    </BusinessPage>
  );
}

function SettingsPage({
  identity,
  accessToken,
  onIdentityChange,
  onUnlocked,
}: {
  identity: Identity;
  accessToken: string;
  onIdentityChange: (i: Identity) => void;
  onUnlocked: () => void;
}) {
  const [tab, setTab] = useState<SettingsView>(
    identity.passwordChangedAt && identity.mpinChangedAt ? "profile" : "security",
  );
  const tabs = [
    ["profile", User, "Profile"],
    ["security", ShieldCheck, "Security"],
    ["access", MonitorSmartphone, "Devices & access"],
    ["preferences", Bell, "Preferences"],
  ] as const;
  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6">
        <p className="text-sm font-bold text-primary">ACCOUNT SETTINGS</p>
        <h1 className="mt-1 text-3xl font-extrabold text-secondary">Settings & preferences</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Manage your profile, security and preferences.
        </p>
      </div>
      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        <aside className="flex h-fit gap-1 overflow-x-auto rounded-2xl border border-border bg-card p-2 shadow-soft lg:block">
          {tabs.map(([key, Icon, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex min-w-max items-center gap-3 rounded-xl mb-2 px-2 py-3 text-sm font-semibold lg:w-full ${tab === key ? "bg-secondary text-secondary-foreground" : "text-secondary hover:bg-mint"}`}
            >
              <Icon size={17} />
              {label}
              <ChevronRight size={14} className="ml-auto" />
            </button>
          ))}
        </aside>
        <div>
          {tab === "profile" && <ProfileSettings identity={identity} />}
          {tab === "security" && (
            <><SecuritySettings identity={identity} accessToken={accessToken} onIdentityChange={onIdentityChange} onUnlocked={onUnlocked} /><ContactVerificationCenter identity={identity} /></>
          )}
          {tab === "access" && <IdentitySecurityCenter />}
          {tab === "preferences" && <PreferenceSettings identity={identity} />}
        </div>
      </div>
    </div>
  );
}
function Panel({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-soft sm:p-7">
      <h2 className="text-xl font-extrabold text-secondary">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      <div className="mt-6">{children}</div>
    </section>
  );
}
function Info({ icon: Icon, label, value }: { icon: typeof User; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-background p-4">
      <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
        <Icon size={14} />
        {label}
      </div>
      <p className="mt-2 truncate text-sm font-bold text-secondary">{value || "Not provided"}</p>
    </div>
  );
}
function ProfileSettings({ identity }: { identity: Identity }) {
  return (
    <Panel
      title="Personal & business profile"
      description="Verified registration information associated with your account."
    >
      <div className="mb-6 flex items-center gap-4 rounded-2xl bg-secondary p-5 text-secondary-foreground">
        <span className="grid h-14 w-14 place-items-center rounded-2xl bg-white/10 text-xl font-extrabold">
          {identity.fullName?.[0] || "U"}
        </span>
        <div>
          <p className="font-extrabold">{identity.fullName}</p>
          <p className="text-xs text-white/60">
            {identity.role} · {identity.status}
          </p>
        </div>
        <BadgeCheck className="ml-auto text-emerald-300" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Info icon={User} label="Full name" value={identity.fullName} />
        <Info icon={Mail} label="Email address" value={identity.email} />
        <Info icon={Phone} label="Phone number" value={identity.phoneNumber} />
        <Info icon={Network} label="Username" value={identity.username} />
        <Info icon={BadgeCheck} label="Login ID" value={identity.loginId} />
        <Info icon={Shield} label="Account status" value={identity.status} />
      </div>
      <p className="mt-5 rounded-xl bg-mint p-4 text-xs text-secondary">
        To update verified personal or business details, contact the UMOBIPAY compliance desk.
      </p>
    </Panel>
  );
}

function SecuritySettings({
  identity,
  accessToken,
  onIdentityChange,
  onUnlocked,
}: {
  identity: Identity;
  accessToken: string;
  onIdentityChange: (i: Identity) => void;
  onUnlocked: () => void;
}) {
  const [mode, setMode] = useState<"password" | "mpin">(
      identity.passwordChangedAt ? "mpin" : "password",
    ),
    [current, setCurrent] = useState(""),
    [next, setNext] = useState(""),
    [confirm, setConfirm] = useState(""),
    [visible, setVisible] = useState(false),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setMessage(null);
    if (next !== confirm) {
      setMessage({ ok: false, text: `New ${mode} and confirmation do not match.` });
      return;
    }
    setBusy(true);
    try {
      if (mode === "password") {
        await authApi.changePassword(accessToken, { currentPassword: current, newPassword: next });
        const synchronized = await refreshSession();
        onIdentityChange(synchronized.identity);
        if (!synchronized.identity.mpinChangedAt) {
          setMode("mpin");
          setMessage({
            ok: true,
            text: "Password changed. Now change your temporary MPIN to finish setup.",
          });
        } else {
          setMessage({ ok: true, text: "Password updated successfully." });
          onUnlocked();
        }
      } else {
        await authApi.changeMpin(accessToken, { currentMpin: current, newMpin: next });
        const synchronized = await refreshSession();
        onIdentityChange(synchronized.identity);
        setMessage({ ok: true, text: "MPIN changed. First-login security setup is complete." });
        if (synchronized.identity.passwordChangedAt && synchronized.identity.mpinChangedAt)
          onUnlocked();
      }
      setCurrent("");
      setNext("");
      setConfirm("");
    } catch (error) {
      setMessage({
        ok: false,
        text: error instanceof ApiError ? error.message : "Unable to update security credentials.",
      });
    } finally {
      setBusy(false);
    }
  }
  const fieldType = visible ? "text" : "password";
  return (
    <Panel
      title="Login & security"
      description="On first login, replace both temporary credentials. Afterwards either credential can be updated independently."
    >
      <div className="mb-5 grid grid-cols-2 gap-3">
        <StatusCard label="Password" done={!!identity.passwordChangedAt} />
        <StatusCard label="MPIN" done={!!identity.mpinChangedAt} />
      </div>
      <div className="mb-5 flex rounded-xl bg-muted p-1">
        {(["password", "mpin"] as const).map((item) => (
          <button
            type="button"
            key={item}
            onClick={() => {
              setMode(item);
              setMessage(null);
              setCurrent("");
              setNext("");
              setConfirm("");
            }}
            className={`flex-1 rounded-lg py-2 text-sm font-bold capitalize ${mode === item ? "bg-card text-secondary shadow-sm" : "text-muted-foreground"}`}
          >
            {item}
          </button>
        ))}
      </div>
      <form onSubmit={submit} className="space-y-4">
        <SecureInput
          label={`Current ${mode}`}
          value={current}
          onChange={setCurrent}
          type={fieldType}
          maxLength={mode === "mpin" ? 4 : undefined}
        />
        <SecureInput
          label={`New ${mode}`}
          value={next}
          onChange={setNext}
          type={fieldType}
          maxLength={mode === "mpin" ? 4 : undefined}
        />
        <SecureInput
          label={`Confirm new ${mode}`}
          value={confirm}
          onChange={setConfirm}
          type={fieldType}
          maxLength={mode === "mpin" ? 4 : undefined}
        />
        <button
          type="button"
          onClick={() => setVisible(!visible)}
          className="flex items-center gap-2 text-xs font-bold text-primary"
        >
          {visible ? <EyeOff size={15} /> : <Eye size={15} />}
          {visible ? "Hide values" : "Show values"}
        </button>
        {message && (
          <div
            className={`rounded-xl p-4 text-sm font-semibold ${message.ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}
          >
            {message.text}
          </div>
        )}
        <button
          disabled={busy}
          className="w-full rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground disabled:opacity-60"
        >
          {busy ? "Updating…" : `Update ${mode}`}
        </button>
      </form>
      <div className="mt-6 grid gap-3 border-t border-border pt-6 sm:grid-cols-2">
        <Info icon={KeyRound} label="Preferred login" value={identity.preferredLoginMethod} />
        <Info
          icon={ShieldCheck}
          label="Security setup"
          value={
            identity.passwordChangedAt && identity.mpinChangedAt ? "Complete" : "Action required"
          }
        />
      </div>
    </Panel>
  );
}
function StatusCard({ label, done }: { label: string; done: boolean }) {
  return (
    <div
      className={`rounded-xl border p-3 text-sm font-bold ${done ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-800"}`}
    >
      {label}: {done ? "Changed" : "Temporary"}
    </div>
  );
}
function SecureInput({
  label,
  value,
  onChange,
  type,
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type: string;
  maxLength?: number;
}) {
  return (
    <label className="block">
      <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <input
        required
        type={type}
        value={value}
        maxLength={maxLength}
        inputMode={maxLength ? "numeric" : undefined}
        minLength={maxLength || 8}
        onChange={(e) => onChange(maxLength ? e.target.value.replace(/\D/g, "") : e.target.value)}
        className="mt-1.5 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
      />
    </label>
  );
}
function PreferenceSettings({ identity }: { identity: Identity }) {
  const [states, setStates] = useState({ transactions: true, security: true, marketing: false });
  return (
    <Panel
      title="Notifications & preferences"
      description="Choose which account updates you want to receive."
    >
      <div className="space-y-3">
        <ToggleRow
          title="Transaction alerts"
          text={`Send payment and settlement updates to ${identity.email}`}
          checked={states.transactions}
          onChange={() => setStates({ ...states, transactions: !states.transactions })}
        />
        <ToggleRow
          title="Security alerts"
          text="Login, password and account safety notifications"
          checked={states.security}
          onChange={() => setStates({ ...states, security: !states.security })}
        />
        <ToggleRow
          title="Product updates"
          text="New UMOBIPAY services, offers and announcements"
          checked={states.marketing}
          onChange={() => setStates({ ...states, marketing: !states.marketing })}
        />
      </div>
      <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800">
        Preference persistence will be enabled when the notification settings API is available.
      </div>
    </Panel>
  );
}
function ToggleRow({
  title,
  text,
  checked,
  onChange,
}: {
  title: string;
  text: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-border p-4">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-secondary">{title}</p>
        <p className="text-xs text-muted-foreground">{text}</p>
      </div>
      <button
        type="button"
        onClick={onChange}
        role="switch"
        aria-checked={checked}
        className={`relative h-6 w-11 rounded-full transition ${checked ? "bg-primary" : "bg-muted-foreground/30"}`}
      >
        <span
          className={`absolute top-1 h-4 w-4 rounded-full bg-white transition ${checked ? "left-6" : "left-1"}`}
        />
      </button>
    </div>
  );
}
