import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { CheckCircle2, Loader2, Mail, Plus, UserPlus, Users } from "lucide-react";
import { AdminLayout, AdminPanel } from "@/components/admin/admin-layout";
import { ActionPermissionNotice } from "@/components/action-permission-notice";
import { useEffectiveAccess } from "@/hooks/use-effective-access";
import { UI_PERMISSION } from "@/lib/ui-permissions";
import {
  adminApi,
  getAdminActor,
  type AdminEntity,
  type CreateManagedAccountInput,
  type CreateManagedAccountResult,
} from "@/lib/admin-api";

export const Route = createFileRoute("/admin/merchants/")({ component: MemberManagementOverview });
const emptyForm: CreateManagedAccountInput = {
  role: "RETAILER",
  fullName: "",
  username: "",
  email: "",
  city: "",
  state: "",
  pincode: "",
  shopName: "",
  shopAddress: "",
  shopCity: "",
  shopState: "",
};
const inputClass =
  "w-full rounded-xl border border-border bg-white px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15";

export function MemberManagementOverview() {
  const actor = getAdminActor();
  const { can } = useEffectiveAccess();
  const canCreate = actor?.kind === "SUPER_ADMIN" || can(UI_PERMISSION.ACCOUNT_CREATE, ["ADMIN"]);
  return (
    <AdminLayout
      active="merchants"
      eyebrow="Network"
      title="Member management"
      description="Separate production workflows for creating, finding and managing platform members."
    >
      {!canCreate && (
        <div className="mb-5">
          <ActionPermissionNotice
            permission={UI_PERMISSION.ACCOUNT_CREATE}
            title="Account creation is not enabled"
          />
        </div>
      )}
      <div className="grid gap-5 md:grid-cols-2">
        {canCreate ? (
          <Link
            to="/admin/merchants/add"
            className="rounded-2xl border border-border bg-white p-7 shadow-sm transition hover:border-primary/50 hover:shadow-lg"
          >
            <span className="grid h-12 w-12 place-items-center rounded-xl bg-primary/10 text-primary">
              <UserPlus />
            </span>
            <h2 className="mt-5 text-xl font-black">Add member</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Create a managed identity using the verified Super Admin account API.
            </p>
            <p className="mt-5 text-xs font-extrabold uppercase text-primary">Open form →</p>
          </Link>
        ) : (
          <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-7 opacity-70">
            <span className="grid h-12 w-12 place-items-center rounded-xl bg-muted text-muted-foreground">
              <UserPlus />
            </span>
            <h2 className="mt-5 text-xl font-black">Add member</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Requires {UI_PERMISSION.ACCOUNT_CREATE}.
            </p>
          </div>
        )}
        <Link
          to="/admin/merchants/list"
          className="rounded-2xl border border-border bg-white p-7 shadow-sm transition hover:border-primary/50 hover:shadow-lg"
        >
          <span className="grid h-12 w-12 place-items-center rounded-xl bg-secondary/10 text-secondary">
            <Users />
          </span>
          <h2 className="mt-5 text-xl font-black">Member list</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Search and review managed accounts when the listing contract is available.
          </p>
          <p className="mt-5 text-xs font-extrabold uppercase text-primary">Open list →</p>
        </Link>
      </div>
    </AdminLayout>
  );
}

export function CreateMemberPage() {
  const actor = getAdminActor();
  const { can } = useEffectiveAccess();
  const permissionAllowsCreate =
    actor?.kind === "SUPER_ADMIN" || can(UI_PERMISSION.ACCOUNT_CREATE, ["ADMIN"]);
  const [allowedRoles, setAllowedRoles] = useState<AdminEntity[]>([]);
  const canCreate = permissionAllowsCreate && allowedRoles.length > 0;
  const [form, setForm] = useState<CreateManagedAccountInput>(emptyForm);
  const [result, setResult] = useState<CreateManagedAccountResult | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    adminApi
      .registerableRoles()
      .then((value) => {
        if (!active) return;
        const next = value.filter((role) => role.isActive);
        setAllowedRoles(next);
        setForm((current) => ({ ...current, role: next[0]?.name || "" }));
      })
      .catch((reason) => {
        if (active)
          setError(reason instanceof Error ? reason.message : "Could not load registerable roles.");
      });
    return () => {
      active = false;
    };
  }, [actor?.role]);
  function update(field: keyof CreateManagedAccountInput, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setResult(null);
    if (!permissionAllowsCreate)
      return setError(`Permission ${UI_PERMISSION.ACCOUNT_CREATE} is required.`);
    if (!canCreate) return setError("Your role cannot create another managed account.");
    if (!allowedRoles.some((role) => role.name === form.role))
      return setError("You cannot create the selected role.");
    if (!/^[a-z0-9._-]{4,50}$/.test(form.username))
      return setError(
        "Username must be 4–50 lowercase characters and may include dots, underscores or hyphens.",
      );
    if (!/^[1-9][0-9]{5}$/.test(form.pincode))
      return setError("Enter a valid 6-digit Indian pincode.");
    setLoading(true);
    try {
      const created = await adminApi.createAccount(clean(form));
      setResult(created);
      setForm({ ...emptyForm, role: allowedRoles[0]?.name || "" });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Account creation failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AdminLayout
      active="merchants"
      eyebrow="Network"
      title="Member management"
      description="Create role-based managed accounts through the verified Super Admin backend workflow."
    >
      {!permissionAllowsCreate && (
        <div className="mb-5">
          <ActionPermissionNotice
            permission={UI_PERMISSION.ACCOUNT_CREATE}
            title="Create account is not enabled"
          />
        </div>
      )}
      <div className="grid gap-6 xl:grid-cols-[1.4fr_.6fr]">
        <AdminPanel>
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary">
              <UserPlus size={20} />
            </span>
            <div>
              <h2 className="text-xl font-black">Create managed account</h2>
              <p className="text-sm text-muted-foreground">
                Temporary credentials are generated by the backend and delivered by email.
              </p>
            </div>
          </div>
          <form onSubmit={submit} className="mt-7 space-y-7">
            <FormSection title="Account details">
              <Field label="Role">
                <select
                  className={inputClass}
                  value={form.role}
                  onChange={(e) => update("role", e.target.value)}
                >
                  {allowedRoles.map((role) => (
                    <option key={role.id} value={role.name}>
                      {role.name.replaceAll("_", " ")}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Full name">
                <input
                  required
                  maxLength={150}
                  className={inputClass}
                  value={form.fullName}
                  onChange={(e) => update("fullName", e.target.value)}
                />
              </Field>
              <Field label="Username">
                <input
                  required
                  minLength={4}
                  maxLength={50}
                  className={inputClass}
                  placeholder="lowercase.username"
                  value={form.username}
                  onChange={(e) => update("username", e.target.value.toLowerCase())}
                />
              </Field>
              <Field label="Email">
                <input
                  required
                  type="email"
                  maxLength={150}
                  className={inputClass}
                  value={form.email}
                  onChange={(e) => update("email", e.target.value.toLowerCase())}
                />
              </Field>
            </FormSection>
            <FormSection title="Location">
              <Field label="City">
                <input
                  required
                  maxLength={100}
                  className={inputClass}
                  value={form.city}
                  onChange={(e) => update("city", e.target.value)}
                />
              </Field>
              <Field label="State">
                <input
                  required
                  maxLength={100}
                  className={inputClass}
                  value={form.state}
                  onChange={(e) => update("state", e.target.value)}
                />
              </Field>
              <Field label="Pincode">
                <input
                  required
                  inputMode="numeric"
                  maxLength={6}
                  className={inputClass}
                  value={form.pincode}
                  onChange={(e) => update("pincode", e.target.value.replace(/\D/g, ""))}
                />
              </Field>
            </FormSection>
            <FormSection title="Business details (optional)">
              <Field label="Shop name">
                <input
                  maxLength={150}
                  className={inputClass}
                  value={form.shopName}
                  onChange={(e) => update("shopName", e.target.value)}
                />
              </Field>
              <Field label="Shop city">
                <input
                  maxLength={100}
                  className={inputClass}
                  value={form.shopCity}
                  onChange={(e) => update("shopCity", e.target.value)}
                />
              </Field>
              <Field label="Shop state">
                <input
                  maxLength={100}
                  className={inputClass}
                  value={form.shopState}
                  onChange={(e) => update("shopState", e.target.value)}
                />
              </Field>
              <Field label="Shop address" wide>
                <textarea
                  maxLength={250}
                  rows={3}
                  className={inputClass}
                  value={form.shopAddress}
                  onChange={(e) => update("shopAddress", e.target.value)}
                />
              </Field>
            </FormSection>
            {error && (
              <p
                role="alert"
                className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700"
              >
                {error}
              </p>
            )}
            <button
              disabled={!canCreate || loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-45"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />} Create
              account
            </button>
          </form>
        </AdminPanel>
        <div className="space-y-5">
          <AdminPanel>
            <h2 className="text-lg font-black">Backend workflow</h2>
            <ol className="mt-5 space-y-4">
              {[
                "Validate selected active role",
                "Generate password and 4-digit MPIN",
                "Create managed identity",
                "Queue credentials email",
                "Require first-login onboarding",
              ].map((step, index) => (
                <li key={step} className="flex gap-3">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-secondary text-xs font-black text-white">
                    {index + 1}
                  </span>
                  <span className="pt-1 text-sm font-semibold">{step}</span>
                </li>
              ))}
            </ol>
          </AdminPanel>
          {result && (
            <AdminPanel className="border-emerald-200 bg-emerald-50">
              <CheckCircle2 className="text-emerald-700" />
              <h2 className="mt-3 text-lg font-black text-emerald-900">Account created</h2>
              <p className="mt-1 text-sm text-emerald-800">{result.message}</p>
              <div className="mt-4 rounded-xl bg-white p-4">
                <p className="text-[10px] font-bold uppercase text-muted-foreground">Login ID</p>
                <p className="mt-1 text-lg font-black">{result.account.loginId}</p>
                <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                  <Mail size={14} />
                  {result.account.email}
                </p>
              </div>
            </AdminPanel>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
function clean(form: CreateManagedAccountInput) {
  return Object.fromEntries(
    Object.entries(form).filter(([, value]) => value !== ""),
  ) as CreateManagedAccountInput;
}
function FormSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset>
      <legend className="mb-4 text-sm font-black uppercase tracking-wide text-secondary">
        {title}
      </legend>
      <div className="grid gap-4 md:grid-cols-2">{children}</div>
    </fieldset>
  );
}
function Field({
  label,
  children,
  wide = false,
}: {
  label: string;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <label className={wide ? "md:col-span-2" : ""}>
      <span className="mb-1.5 block text-xs font-extrabold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}
