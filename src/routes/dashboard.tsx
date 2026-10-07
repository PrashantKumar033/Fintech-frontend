import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import {
  Activity,
  BadgeCheck,
  Banknote,
  Bell,
  Building2,
  Bus,
  ChevronRight,
  CircleDollarSign,
  CreditCard,
  Droplets,
  Eye,
  EyeOff,
  FileBarChart,
  Fingerprint,
  Flame,
  Fuel,
  Gift,
  Headphones,
  IndianRupee,
  KeyRound,
  Landmark,
  LayoutDashboard,
  Lightbulb,
  Lock,
  LogOut,
  Mail,
  Menu,
  Network,
  Phone,
  Plane,
  Receipt,
  RefreshCw,
  Settings,
  Shield,
  ShieldCheck,
  Smartphone,
  Tv,
  User,
  Users,
  Wallet,
  Wifi,
  X,
} from "lucide-react";
import logo from "@/assets/logo.png";
import {
  ApiError,
  authApi,
  getSession,
  logout,
  refreshSession,
  updateSessionIdentity,
  type Identity,
} from "@/lib/auth-api";
import { useServiceReadiness } from "@/lib/service-readiness";
import { WalletBalanceHeader } from "@/components/wallet-balance-header";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Business Dashboard — UMOBIPAY" }] }),
  component: DashboardPage,
});
type View = "dashboard" | "settings";
type SettingsView = "profile" | "security" | "preferences";

const navItems = [
  ["Dashboard", LayoutDashboard, "dashboard"],
  ["KYC verification", BadgeCheck, "/kyc"],
  ["Bank accounts", Landmark, "/bank-accounts"],
  ["AEPS", Fingerprint, "/aeps"],
  ["Member management", Users],
  ["Wallet & settlement", Wallet],
  ["Transactions", Receipt],
  ["Reports", FileBarChart],
  ["Commission", CircleDollarSign],
  ["Settings", Settings, "settings"],
] as const;

const serviceGroups = [
  {
    title: "Money transfer & payments",
    eyebrow: "DMT / AEPS",
    services: [
      ["Wallet to Wallet", Wallet],
      ["Money Transfer", Banknote],
      ["Credit Card Bills", CreditCard],
      ["CMS", Building2],
      ["DMT 2", RefreshCw],
    ],
  },
  {
    title: "Bills & utilities",
    eyebrow: "BBPS",
    services: [
      ["Electricity", Lightbulb],
      ["Water", Droplets],
      ["Gas", Flame],
      ["LPG Booking", Fuel],
      ["Insurance", Shield],
      ["EMI", IndianRupee],
      ["FASTag", CreditCard],
      ["Loan", Landmark],
    ],
  },
  {
    title: "Aadhaar enabled services",
    eyebrow: "AEPS",
    services: [
      ["AEPS", Fingerprint],
      ["Aadhaar Pay", BadgeCheck],
      ["Settlement", Landmark],
      ["Cash Deposit", Banknote],
      ["Settlement 2", CircleDollarSign],
    ],
  },
  {
    title: "Recharge & travel",
    eyebrow: "RECHARGE",
    services: [
      ["Mobile Recharge", Smartphone],
      ["DTH", Tv],
      ["Broadband", Wifi],
      ["Bus Booking", Bus],
      ["Flight Booking", Plane],
    ],
  },
] as const;

function DashboardPage() {
  const navigate = useNavigate();
  const [session, setSession] = useState<ReturnType<typeof getSession>>(null);
  const [view, setView] = useState<View>("dashboard");
  const [mobileMenu, setMobileMenu] = useState(false);
  const readiness = useServiceReadiness(
    !!session?.identity.passwordChangedAt && !!session?.identity.mpinChangedAt,
  );
  useEffect(() => {
    const sync = () => {
      const stored = getSession();
      if (!stored) {
        navigate({ to: "/login" });
        return;
      }
      setSession(stored);
      if (!stored.identity.passwordChangedAt || !stored.identity.mpinChangedAt) setView("settings");
    };
    sync();
    window.addEventListener("pageshow", sync);
    return () => window.removeEventListener("pageshow", sync);
  }, [navigate]);
  if (!session)
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <RefreshCw className="animate-spin text-primary" />
      </div>
    );
  const locked = !session.identity.passwordChangedAt || !session.identity.mpinChangedAt;
  const updateIdentity = (identity: Identity) => {
    updateSessionIdentity(identity);
    setSession((current) => (current ? { ...current, identity } : current));
  };
  const signOut = async () => {
    await logout();
    navigate({ to: "/login" });
  };
  return (
    <div className="min-h-screen bg-[#f5f8f8] text-foreground">
      <header className="sticky top-0 z-40 border-b border-border/70 bg-card/95 backdrop-blur-xl">
        <div className="flex h-16 items-center gap-4 px-4 lg:px-6">
          <button
            className="grid h-10 w-10 place-items-center rounded-xl border border-border lg:hidden"
            onClick={() => setMobileMenu(true)}
            aria-label="Open menu"
          >
            <Menu size={19} />
          </button>
          <img src={logo} alt="UMOBIPAY" className="h-9 w-auto" />
          <div className="ml-auto hidden items-center gap-2 lg:flex">
            <WalletBalanceHeader identity={session.identity} />
            <button
              className="relative grid h-10 w-10 place-items-center rounded-xl border border-border bg-background text-secondary"
              aria-label="Notifications"
            >
              <Bell size={18} />
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-primary" />
            </button>
            <div className="hidden items-center gap-3 rounded-xl border border-border px-3 py-1.5 sm:flex">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-secondary font-bold text-secondary-foreground">
                {session.identity.fullName?.[0] || "U"}
              </span>
              <div className="max-w-36">
                <p className="truncate text-xs font-bold text-secondary">
                  {session.identity.fullName}
                </p>
                <p className="truncate text-[10px] text-muted-foreground">
                  {session.identity.loginId}
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="border-t border-border/60 px-4 py-2 lg:hidden">
          <WalletBalanceHeader identity={session.identity} />
        </div>
      </header>
      <div className="flex">
        {mobileMenu && (
          <button
            aria-label="Close menu overlay"
            className="fixed inset-0 z-40 bg-secondary/40 lg:hidden"
            onClick={() => setMobileMenu(false)}
          />
        )}
        <aside
          className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-border bg-card p-4 transition-transform lg:sticky lg:top-16 lg:z-20 lg:h-[calc(100vh-4rem)] lg:w-64 ${mobileMenu ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
        >
          <div className="flex items-center justify-between px-2 pb-5 lg:hidden">
            <img src={logo} className="h-9" alt="UMOBIPAY" />
            <button onClick={() => setMobileMenu(false)}>
              <X />
            </button>
          </div>
          <div className="mb-5 rounded-2xl bg-secondary p-4 text-secondary-foreground">
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-white/10 text-lg font-extrabold">
                {session.identity.fullName?.[0] || "U"}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold">{session.identity.fullName}</p>
                <p className="text-xs text-white/60">{session.identity.role}</p>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2 border-t border-white/10 pt-3 text-xs text-emerald-300">
              <BadgeCheck size={14} /> {session.identity.status} account
            </div>
          </div>
          <nav className="space-y-1">
            {navItems
              .filter(
                ([label]) =>
                  label !== "Reports" || session.identity.role.trim().toUpperCase() !== "RETAILER",
              )
              .map(([label, Icon, target]) => {
                const disabled =
                  !target || locked || (target === "/aeps" && !readiness.data?.aepsUnlocked);
                return (
                  <button
                    key={label}
                    disabled={disabled}
                    title={
                      target === "/aeps" && disabled && !locked
                        ? "Complete approved KYC and verify a bank account first"
                        : undefined
                    }
                    onClick={() => {
                      if (target?.startsWith("/")) window.location.assign(target);
                      else if (target) setView(target as View);
                      setMobileMenu(false);
                    }}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${target === view ? "bg-primary text-primary-foreground shadow-sm" : disabled ? "text-muted-foreground/55" : "text-secondary hover:bg-mint"}`}
                  >
                    <Icon size={17} />
                    <span>{label}</span>
                    {disabled && <Lock size={12} className="ml-auto" />}
                  </button>
                );
              })}
          </nav>
          <button
            onClick={signOut}
            className="mt-auto flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-destructive hover:bg-destructive/10"
          >
            <LogOut size={17} /> Sign out
          </button>
        </aside>
        <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
          {locked && (
            <div className="mb-6 flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <Lock className="mt-0.5 shrink-0" size={18} />
              <div>
                <strong>Complete first-login security</strong>
                <p className="mt-0.5 text-amber-800/80">
                  Change both the temporary password and temporary MPIN once to unlock all services.
                </p>
              </div>
            </div>
          )}
          {view === "dashboard" && !locked ? (
            <DashboardHome identity={session.identity} />
          ) : (
            <SettingsPage
              identity={session.identity}
              accessToken={session.accessToken}
              onIdentityChange={updateIdentity}
              onUnlocked={() => setView("dashboard")}
            />
          )}
        </main>
      </div>
    </div>
  );
}

function DashboardHome({ identity }: { identity: Identity }) {
  const firstName = identity.fullName?.split(" ")[0] || identity.username;
  return (
    <div className="mx-auto max-w-[1500px] space-y-6">
      <section className="relative overflow-hidden rounded-[1.75rem] bg-secondary p-6 text-secondary-foreground shadow-elegant sm:p-8">
        <div className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-primary/20 blur-3xl" />
        <div className="relative flex flex-col justify-between gap-6 xl:flex-row xl:items-center">
          <div>
            <p className="text-sm text-white/65">Good to see you again</p>
            <h1 className="mt-1 text-3xl font-extrabold sm:text-4xl">Hi, {firstName}!</h1>
            <p className="mt-2 max-w-xl text-sm text-white/65">
              Manage payments, assisted banking and your retailer business from one secure
              workspace.
            </p>
          </div>
        </div>
      </section>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Summary icon={Wallet} label="Available balance" value="₹0.00" note="Ready for business" />
        <Summary icon={Activity} label="Today's transactions" value="0" note="No activity yet" />
        <Summary icon={IndianRupee} label="Today's volume" value="₹0.00" note="All services" />
        <Summary icon={Gift} label="Monthly commission" value="₹0.00" note="Current month" />
      </div>
      {serviceGroups.map((group) => (
        <ServiceSection
          key={group.title}
          title={group.title}
          eyebrow={group.eyebrow}
          services={group.services}
        />
      ))}
      <section className="flex flex-col justify-between gap-4 rounded-2xl border border-border bg-card p-5 shadow-soft sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary">
            <Headphones size={20} />
          </span>
          <div>
            <h2 className="font-bold text-secondary">Offline service & support</h2>
            <p className="text-sm text-muted-foreground">
              Need assistance with a transaction or service?
            </p>
          </div>
        </div>
        <button className="rounded-xl bg-secondary px-5 py-3 text-sm font-semibold text-secondary-foreground">
          Contact service desk
        </button>
      </section>
    </div>
  );
}
function Summary({
  icon: Icon,
  label,
  value,
  note,
}: {
  icon: typeof Wallet;
  label: string;
  value: string;
  note: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
      <div className="flex items-start justify-between">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-mint text-secondary">
          <Icon size={18} />
        </span>
        <span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700">
          LIVE
        </span>
      </div>
      <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-2xl font-extrabold text-secondary">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{note}</p>
    </div>
  );
}
function ServiceSection({
  title,
  eyebrow,
  services,
}: {
  title: string;
  eyebrow: string;
  services: readonly (readonly [string, typeof Wallet])[];
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-soft sm:p-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[.2em] text-primary">
            {eyebrow}
          </p>
          <h2 className="mt-1 text-lg font-extrabold text-secondary">{title}</h2>
        </div>
        <button className="hidden items-center gap-1 text-xs font-bold text-secondary sm:flex">
          View all <ChevronRight size={14} />
        </button>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 2xl:grid-cols-8">
        {services.map(([label, Icon]) => {
          const active = label === "AEPS" || label === "Aadhaar Pay" || label === "Cash Deposit";
          const card = (
            <>
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-card text-secondary shadow-sm transition group-hover:bg-primary group-hover:text-primary-foreground">
                <Icon size={20} />
              </span>
              <span className="mt-3 block text-xs font-bold leading-tight text-secondary">
                {label}
              </span>
              <span
                className={`mt-1 block text-[10px] ${active ? "font-bold text-primary" : "text-muted-foreground"}`}
              >
                {active ? "Open service" : "Coming soon"}
              </span>
            </>
          );
          return active ? (
            <Link
              to="/aeps"
              key={label}
              className="group rounded-2xl border border-border bg-background p-4 text-left transition hover:-translate-y-0.5 hover:border-primary/40 hover:bg-mint hover:shadow-soft"
            >
              {card}
            </Link>
          ) : (
            <button
              type="button"
              key={label}
              disabled
              className="group rounded-2xl border border-border bg-background p-4 text-left opacity-70"
            >
              {card}
            </button>
          );
        })}
      </div>
    </section>
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
              className={`flex min-w-max items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold lg:w-full ${tab === key ? "bg-secondary text-secondary-foreground" : "text-secondary hover:bg-mint"}`}
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
            <SecuritySettings
              identity={identity}
              accessToken={accessToken}
              onIdentityChange={onIdentityChange}
              onUnlocked={onUnlocked}
            />
          )}
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
