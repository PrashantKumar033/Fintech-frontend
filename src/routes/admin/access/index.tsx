import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import {
  BadgeCheck,
  Box,
  KeyRound,
  Loader2,
  PackageCheck,
  Plus,
  RefreshCw,
  Save,
  ShieldCheck,
  Trash2,
  UsersRound,
} from "lucide-react";
import { AdminLayout, AdminPanel } from "@/components/admin/admin-layout";
import {
  adminApi,
  asArray,
  getAdminActor,
  type AdminEntity,
  type PackagePermissionAssignment,
  type RoleEffectiveAccess,
  type RolePackageAssignment,
  type RoleRegisterPermission,
} from "@/lib/admin-api";

export const Route = createFileRoute("/admin/access/")({ component: Access });
type View = "roles" | "permissions" | "packages" | "role-packages" | "registration";
type MutationOptions = { refresh?: boolean; onSuccess?: () => void };
type Mutate = (
  work: () => Promise<unknown>,
  message: string,
  options?: MutationOptions,
) => Promise<void>;
const inputClass =
  "w-full rounded-xl border border-border bg-white px-3.5 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15";
const errText = (error: unknown) =>
  error instanceof Error ? error.message : "The request could not be completed.";

export function Access() {
  const canManageAccess = getAdminActor()?.kind === "SUPER_ADMIN";
  const [view, setView] = useState<View>("roles"),
    [roles, setRoles] = useState<AdminEntity[]>([]),
    [permissions, setPermissions] = useState<AdminEntity[]>([]),
    [packages, setPackages] = useState<AdminEntity[]>([]);
  const [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  async function load(showLoader = true) {
    if (!canManageAccess) {
      setLoading(false);
      return;
    }
    if (showLoader) setLoading(true);
    setError("");
    try {
      const [r, p, k] = await Promise.all([
        adminApi.roles.list(),
        adminApi.permissions.list(),
        adminApi.packages.list(),
      ]);
      setRoles(asArray<AdminEntity>(r));
      setPermissions(asArray<AdminEntity>(p));
      setPackages(asArray<AdminEntity>(k));
    } catch (e) {
      setError(errText(e));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
  }, [canManageAccess]);
  async function mutate(
    work: () => Promise<unknown>,
    message: string,
    options: MutationOptions = {},
  ) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await work();
      options.onSuccess?.();
      setNotice(message);
      if (options.refresh !== false) await load(false);
    } catch (e) {
      setError(errText(e));
    } finally {
      setBusy(false);
    }
  }
  const tabs: Array<[View, string, typeof ShieldCheck]> = [
    ["roles", "Roles", UsersRound],
    ["permissions", "Permissions", KeyRound],
    ["packages", "Packages", Box],
    ["role-packages", "Assignments", PackageCheck],
    ["registration", "Registration matrix", ShieldCheck],
  ];
  if (!canManageAccess)
    return (
      <AdminLayout
        active="access"
        eyebrow="Authorization control"
        title="Roles, packages & permissions"
        description="Authorization policy is managed centrally by the Super Admin."
      >
        <AdminPanel>
          <div className="mx-auto max-w-xl py-14 text-center">
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-amber-50 text-amber-700">
              <ShieldCheck />
            </span>
            <h2 className="mt-5 text-xl font-black">Super Admin approval required</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              The current backend protects role and role-assignment endpoints with the Super Admin
              guard. This screen is therefore read-protected for Admin identities instead of making
              requests that would return 401 Unauthorized.
            </p>
          </div>
        </AdminPanel>
      </AdminLayout>
    );
  return (
    <AdminLayout
      active="access"
      eyebrow="Authorization control"
      title="Roles, packages & permissions"
      description="Manage the complete authorization graph from separate, auditable backend contracts."
    >
      <div className="mb-6 flex gap-2 overflow-x-auto rounded-2xl border border-border bg-white p-2">
        {tabs.map(([id, label, Icon]) => (
          <button
            key={id}
            onClick={() => setView(id)}
            className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-4 py-3 text-xs font-extrabold ${view === id ? "bg-secondary text-white" : "text-muted-foreground hover:bg-muted"}`}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
        <button
          onClick={() => void load()}
          disabled={loading}
          className="ml-auto inline-flex shrink-0 items-center gap-2 rounded-xl border border-border px-4 py-3 text-xs font-extrabold"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>
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
      {loading ? (
        <AdminPanel>
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
            <Loader2 className="animate-spin" size={17} />
            Loading authorization graph…
          </div>
        </AdminPanel>
      ) : (
        <>
          {view === "roles" && (
            <EntityManager
              kind="role"
              items={roles}
              busy={busy}
              mutate={mutate}
              onStatusChange={(id, isActive) =>
                setRoles((current) =>
                  current.map((item) => (item.id === id ? { ...item, isActive } : item)),
                )
              }
            />
          )}
          {view === "permissions" && (
            <EntityManager
              kind="permission"
              items={permissions}
              busy={busy}
              mutate={mutate}
              onStatusChange={(id, isActive) =>
                setPermissions((current) =>
                  current.map((item) => (item.id === id ? { ...item, isActive } : item)),
                )
              }
            />
          )}
          {view === "packages" && (
            <PackageManager
              packages={packages}
              permissions={permissions}
              busy={busy}
              mutate={mutate}
              onStatusChange={(id, isActive) =>
                setPackages((current) =>
                  current.map((item) => (item.id === id ? { ...item, isActive } : item)),
                )
              }
            />
          )}
          {view === "role-packages" && (
            <RolePackageManager roles={roles} packages={packages} busy={busy} mutate={mutate} />
          )}
          {view === "registration" && (
            <RegistrationMatrix roles={roles} busy={busy} mutate={mutate} />
          )}
        </>
      )}
    </AdminLayout>
  );
}

function EntityManager({
  kind,
  items,
  busy,
  mutate,
  onStatusChange,
}: {
  kind: "role" | "permission";
  items: AdminEntity[];
  busy: boolean;
  mutate: Mutate;
  onStatusChange: (id: string, isActive: boolean) => void;
}) {
  const [editing, setEditing] = useState<AdminEntity | null>(null),
    [name, setName] = useState(""),
    [code, setCode] = useState(""),
    [prefix, setPrefix] = useState(""),
    [description, setDescription] = useState("");
  function reset(item?: AdminEntity) {
    setEditing(item || null);
    setName(item?.name || "");
    setCode(item?.code || "");
    setPrefix(item?.prefix || "");
    setDescription(item?.description || "");
  }
  async function startEdit(item: AdminEntity) {
    try {
      const fresh = kind === "role"
        ? await adminApi.roles.get(item.id)
        : await adminApi.permissions.get(item.id);
      reset(fresh);
    } catch {
      reset(item);
    }
  }
  async function submit(e: FormEvent) {
    e.preventDefault();
    const api = kind === "role" ? adminApi.roles : adminApi.permissions;
    if (kind === "role") {
      const body = {
        name: name.trim().toUpperCase().replace(/\s+/g, "_"),
        prefix: prefix.trim().toUpperCase(),
        description: description.trim() || undefined,
        ...(!editing ? { startingLoginIdNumber: 1001, isActive: true } : {}),
      };
      await mutate(
        () => (editing ? api.update(editing.id, body) : api.create(body)),
        `Role ${editing ? "updated" : "created"}.`,
      );
    } else {
      const body = {
        code: code.trim().toUpperCase(),
        name: name.trim(),
        description: description.trim() || undefined,
        ...(!editing ? { isActive: true } : {}),
      };
      await mutate(
        () => (editing ? api.update(editing.id, body) : api.create(body)),
        `Permission ${editing ? "updated" : "created"}.`,
      );
    }
    reset();
  }
  return (
    <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
      <AdminPanel>
        <h2 className="text-lg font-black">
          {editing ? "Edit" : "Create"} {kind}
        </h2>
        <form onSubmit={submit} className="mt-5 space-y-4">
          {kind === "permission" && (
            <Field label="Permission code">
              <input
                required
                pattern="[A-Z][A-Z0-9_]*(\.[A-Z][A-Z0-9_]*)+"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="WALLET.VIEW"
                className={inputClass}
              />
            </Field>
          )}
          <Field label={kind === "role" ? "Role name" : "Display name"}>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={kind === "role" ? "DISTRIBUTOR" : "View wallet"}
              className={inputClass}
            />
          </Field>
          {kind === "role" && (
            <Field label="Login ID prefix">
              <input
                required
                maxLength={10}
                pattern="[A-Z0-9]+"
                value={prefix}
                onChange={(e) => setPrefix(e.target.value.toUpperCase())}
                placeholder="DS"
                className={inputClass}
              />
            </Field>
          )}
          <Field label="Description">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className={`${inputClass} resize-none`}
            />
          </Field>
          <div className="flex gap-2">
            <button
              disabled={busy}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-3 text-xs font-extrabold text-white"
            >
              <Save size={14} />
              {editing ? "Save changes" : "Create"}
            </button>
            {editing && (
              <button
                type="button"
                onClick={() => reset()}
                className="rounded-xl border border-border px-4 text-xs font-extrabold"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </AdminPanel>
      <AdminPanel>
        <h2 className="text-lg font-black">Configured {kind}s</h2>
        <div className="mt-5 space-y-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex flex-col gap-3 rounded-xl border border-border p-4 sm:flex-row sm:items-center"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-black">{item.code || item.name}</p>
                  <Status active={item.isActive} />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {item.name}
                  {item.prefix ? ` · Prefix ${item.prefix}` : ""}
                </p>
              </div>
              <button
                onClick={() => void startEdit(item)}
                className="rounded-lg border border-border px-3 py-2 text-xs font-bold"
              >
                Edit
              </button>
              <button
                disabled={busy}
                onClick={() =>
                  void mutate(
                    () =>
                      kind === "role"
                        ? adminApi.roles.status(item.id, !item.isActive)
                        : adminApi.permissions.status(item.id, !item.isActive),
                    `${item.name} ${item.isActive ? "deactivated" : "activated"}.`,
                    {
                      refresh: false,
                      onSuccess: () => onStatusChange(item.id, !item.isActive),
                    },
                  )
                }
                className={`rounded-lg border px-3 py-2 text-xs font-bold ${item.isActive ? "border-amber-200 text-amber-800" : "border-emerald-200 text-emerald-700"}`}
              >
                {item.isActive ? "Deactivate" : "Activate"}
              </button>
            </div>
          ))}
          {!items.length && <Empty text={`No ${kind}s returned.`} />}
        </div>
      </AdminPanel>
    </div>
  );
}

function PackageManager({
  packages,
  permissions,
  busy,
  mutate,
  onStatusChange,
}: {
  packages: AdminEntity[];
  permissions: AdminEntity[];
  busy: boolean;
  mutate: Mutate;
  onStatusChange: (id: string, isActive: boolean) => void;
}) {
  const [selected, setSelected] = useState(""),
    [assigned, setAssigned] = useState<PackagePermissionAssignment[]>([]),
    [name, setName] = useState(""),
    [code, setCode] = useState(""),
    [description, setDescription] = useState(""),
    [price, setPrice] = useState("0"),
    [loading, setLoading] = useState(false);
  async function select(id: string) {
    setSelected(id);
    setLoading(true);
    try {
      const [fresh, nextAssigned] = await Promise.all([
        adminApi.packages.get(id),
        adminApi.packages.permissions(id),
      ]);
      setName(fresh.name || "");
      setCode(fresh.code || "");
      setDescription(fresh.description || "");
      setPrice(String(fresh.price ?? "0"));
      setAssigned(nextAssigned);
    } finally {
      setLoading(false);
    }
  }
  async function create(e: FormEvent) {
    e.preventDefault();
    await mutate(
      () =>
        adminApi.packages.create({
          code: code.trim().toUpperCase(),
          name: name.trim(),
          description: description.trim() || undefined,
          price,
          isActive: true,
        }),
      "Package created.",
    );
    setName("");
    setCode("");
    setDescription("");
    setPrice("0");
  }
  const assignedIds = new Set(assigned.map((v) => v.permissionId));
  const selectedPackage = packages.find((v) => v.id === selected);
  async function editSelected() {
    if (!selectedPackage) return;
    const nextName = window.prompt("Package name", selectedPackage.name || "");
    if (nextName === null || !nextName.trim()) return;
    const nextDescription = window.prompt("Package description", selectedPackage.description || "");
    if (nextDescription === null) return;
    await mutate(
      () =>
        adminApi.packages.update(selectedPackage.id, {
          name: nextName.trim(),
          description: nextDescription.trim() || undefined,
        }),
      "Package updated.",
    );
  }
  async function toggleStatus() {
    if (!selectedPackage) return;
    await mutate(
      () => adminApi.packages.status(selectedPackage.id, !selectedPackage.isActive),
      `Package ${selectedPackage.isActive ? "deactivated" : "activated"}.`,
      {
        refresh: false,
        onSuccess: () => onStatusChange(selectedPackage.id, !selectedPackage.isActive),
      },
    );
  }
  async function toggle(permission: AdminEntity) {
    if (!selected) return;
    const isAssigned = assignedIds.has(permission.id);
    await mutate(
      () =>
        isAssigned
          ? adminApi.packages.removePermission(selected, permission.id)
          : adminApi.packages.assignPermission(selected, permission.id),
      "Package permissions updated.",
      {
        refresh: false,
        onSuccess: () =>
          setAssigned((current) =>
            isAssigned
              ? current.filter((entry) => entry.permissionId !== permission.id)
              : [
                  ...current,
                  { packageId: selected, permissionId: permission.id, permission },
                ],
          ),
      },
    );
  }
  return (
    <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
      <AdminPanel>
        <h2 className="text-lg font-black">Create package</h2>
        <form onSubmit={create} className="mt-5 space-y-4">
          <Field label="Code">
            <input
              required
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              pattern="[A-Z][A-Z0-9_]*"
              placeholder="RETAILER_CORE"
              className={inputClass}
            />
          </Field>
          <Field label="Name">
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Price">
            <input
              required
              min="0"
              step="0.01"
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Description">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className={`${inputClass} resize-none`}
            />
          </Field>
          <button
            disabled={busy}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-xs font-extrabold text-white"
          >
            <Plus size={14} />
            Create package
          </button>
        </form>
      </AdminPanel>
      <AdminPanel>
        <h2 className="text-lg font-black">Package → permission assignment</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Select a package, then enable only the permissions it should grant.
        </p>
        <select
          value={selected}
          onChange={(e) => void select(e.target.value)}
          className={`${inputClass} mt-5`}
        >
          <option value="">Select package</option>
          {packages.map((v) => (
            <option key={v.id} value={v.id}>
              {v.code || v.name}
              {v.isActive ? "" : " (inactive)"}
            </option>
          ))}
        </select>
        {selectedPackage && (
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => void editSelected()}
              className="rounded-lg border border-border px-3 py-2 text-xs font-bold"
            >
              Edit package
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void toggleStatus()}
              className="rounded-lg border border-border px-3 py-2 text-xs font-bold"
            >
              {selectedPackage.isActive ? "Deactivate" : "Activate"}
            </button>
          </div>
        )}
        {selected && (
          <div className="mt-5 max-h-[520px] space-y-2 overflow-y-auto pr-1">
            {loading ? (
              <Empty text="Loading assignments…" />
            ) : (
              permissions.map((permission) => (
                <label
                  key={permission.id}
                  className="flex cursor-pointer items-center gap-3 rounded-xl border border-border p-3"
                >
                  <input
                    type="checkbox"
                    checked={assignedIds.has(permission.id)}
                    disabled={busy}
                    onChange={() => void toggle(permission)}
                    className="h-4 w-4 accent-primary"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="break-all text-xs font-black">{permission.code}</p>
                    <p className="text-xs text-muted-foreground">{permission.name}</p>
                  </div>
                  <Status active={permission.isActive} />
                </label>
              ))
            )}
          </div>
        )}{" "}
        {!selected && <Empty text="Select a package to manage its permissions." />}
      </AdminPanel>
    </div>
  );
}

function RolePackageManager({
  roles,
  packages,
  busy,
  mutate,
}: {
  roles: AdminEntity[];
  packages: AdminEntity[];
  busy: boolean;
  mutate: Mutate;
}) {
  const [roleId, setRoleId] = useState(""),
    [assigned, setAssigned] = useState<RolePackageAssignment[]>([]),
    [effective, setEffective] = useState<RoleEffectiveAccess | null>(null),
    [loading, setLoading] = useState(false);
  async function select(id: string) {
    setRoleId(id);
    setEffective(null);
    setLoading(true);
    try {
      setAssigned(await adminApi.roles.packages(id));
      setEffective(await adminApi.roles.effectivePermissions(id));
    } finally {
      setLoading(false);
    }
  }
  const assignedIds = new Set(assigned.map((v) => v.packageId));
  async function toggle(item: AdminEntity) {
    const isAssigned = assignedIds.has(item.id);
    await mutate(
      () =>
        isAssigned
          ? adminApi.roles.removePackage(roleId, item.id)
          : adminApi.roles.assignPackage(roleId, item.id),
      "Role packages updated.",
      {
        refresh: false,
        onSuccess: () =>
          setAssigned((current) =>
            isAssigned
              ? current.filter((entry) => entry.packageId !== item.id)
              : [...current, { roleId, packageId: item.id, package: item }],
          ),
      },
    );
    try {
      setEffective(await adminApi.roles.effectivePermissions(roleId));
    } catch {
      // The assignment is already reflected locally; the preview can be refreshed manually.
    }
  }
  return (
    <AdminPanel>
      <h2 className="text-lg font-black">Role → package assignment</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Package changes immediately affect the role’s effective permission graph.
      </p>
      <select
        value={roleId}
        onChange={(e) => void select(e.target.value)}
        className={`${inputClass} mt-5 max-w-lg`}
      >
        <option value="">Select role</option>
        {roles.map((v) => (
          <option key={v.id} value={v.id}>
            {v.name}
          </option>
        ))}
      </select>
      {roleId && (
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <div>
            <h3 className="text-xs font-extrabold uppercase text-muted-foreground">
              Available packages
            </h3>
            <div className="mt-3 space-y-2">
              {packages.map((item) => (
                <label
                  key={item.id}
                  className="flex cursor-pointer items-center gap-3 rounded-xl border border-border p-3"
                >
                  <input
                    type="checkbox"
                    checked={assignedIds.has(item.id)}
                    disabled={busy || loading}
                    onChange={() => void toggle(item)}
                    className="h-4 w-4 accent-primary"
                  />
                  <span className="flex-1 text-xs font-black">{item.code || item.name}</span>
                  <Status active={item.isActive} />
                </label>
              ))}
            </div>
          </div>
          <div>
            <h3 className="text-xs font-extrabold uppercase text-muted-foreground">
              Effective access preview
            </h3>
            <div className="mt-3 rounded-xl bg-secondary p-5 text-white">
              <p className="text-3xl font-black">{effective?.permissionCodes.length || 0}</p>
              <p className="text-xs text-white/60">active effective permissions</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {effective?.packages.map((v) => (
                  <span
                    key={v.id}
                    className="rounded-full bg-white/10 px-2 py-1 text-[10px] font-bold"
                  >
                    {v.code}
                  </span>
                ))}
              </div>
            </div>
            <div className="mt-3 max-h-72 space-y-2 overflow-y-auto">
              {effective?.permissions.map((v) => (
                <div key={v.id} className="rounded-lg border border-border p-3">
                  <p className="break-all text-xs font-black">{v.code}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">{v.name}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      {!roleId && <Empty text="Select a role to configure package access." />}
    </AdminPanel>
  );
}

function RegistrationMatrix({
  roles,
  busy,
  mutate,
}: {
  roles: AdminEntity[];
  busy: boolean;
  mutate: Mutate;
}) {
  const [registrar, setRegistrar] = useState(""),
    [rows, setRows] = useState<RoleRegisterPermission[]>([]),
    [loading, setLoading] = useState(false);
  async function select(id: string) {
    setRegistrar(id);
    setLoading(true);
    try {
      setRows(await adminApi.roles.registrationPermissions(id));
    } finally {
      setLoading(false);
    }
  }
  const rowByTarget = useMemo(() => new Map(rows.map((v) => [v.targetRoleId, v])), [rows]);
  async function toggle(target: AdminEntity) {
    const row = rowByTarget.get(target.id);
    const nextActive = row ? !row.isActive : true;
    await mutate(
      () =>
        row
          ? adminApi.roles.registrationStatus(registrar, target.id, !row.isActive)
          : adminApi.roles.allowRegistration(registrar, target.id),
      "Registration permission updated.",
      {
        refresh: false,
        onSuccess: () =>
          setRows((current) =>
            row
              ? current.map((entry) =>
                  entry.targetRoleId === target.id
                    ? { ...entry, isActive: nextActive }
                    : entry,
                )
              : [
                  ...current,
                  {
                    registrarRoleId: registrar,
                    targetRoleId: target.id,
                    isActive: true,
                    targetRole: target,
                  },
                ],
          ),
      },
    );
  }
  async function remove(target: AdminEntity) {
    await mutate(
      () => adminApi.roles.removeRegistration(registrar, target.id),
      "Registration permission removed.",
      {
        refresh: false,
        onSuccess: () =>
          setRows((current) => current.filter((entry) => entry.targetRoleId !== target.id)),
      },
    );
  }
  return (
    <AdminPanel>
      <div className="flex items-start gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary">
          <ShieldCheck />
        </span>
        <div>
          <h2 className="text-lg font-black">Who can create which role</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            This matrix controls hierarchical managed-account registration at the backend.
          </p>
        </div>
      </div>
      <select
        value={registrar}
        onChange={(e) => void select(e.target.value)}
        className={`${inputClass} mt-5 max-w-lg`}
      >
        <option value="">Select registrar role</option>
        {roles.map((v) => (
          <option key={v.id} value={v.id}>
            {v.name}
          </option>
        ))}
      </select>
      {registrar && (
        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {roles
            .filter((v) => v.id !== registrar)
            .map((target) => {
              const row = rowByTarget.get(target.id);
              return (
                <div
                  key={target.id}
                  className={`flex items-center gap-3 rounded-xl border p-4 text-left ${row?.isActive ? "border-emerald-200 bg-emerald-50" : "border-border bg-white"}`}
                >
                  <button
                    type="button"
                    disabled={busy || loading}
                    onClick={() => void toggle(target)}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  >
                    <span
                      className={`grid h-9 w-9 place-items-center rounded-lg ${row?.isActive ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"}`}
                    >
                      {row?.isActive ? <BadgeCheck size={17} /> : <UsersRound size={17} />}
                    </span>
                    <span className="flex-1">
                      <span className="block text-sm font-black">{target.name}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {row?.isActive ? "CREATION ALLOWED" : "NOT ALLOWED"}
                      </span>
                    </span>
                  </button>
                  {row && (
                    <button
                      type="button"
                      title="Remove registration rule"
                      aria-label={`Remove ${target.name} registration rule`}
                      disabled={busy || loading}
                      onClick={() => void remove(target)}
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              );
            })}
        </div>
      )}
      {!registrar && <Empty text="Choose a registrar role to edit its creation permissions." />}
    </AdminPanel>
  );
}
function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-extrabold uppercase text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}
function Status({ active }: { active: boolean }) {
  return (
    <span
      className={`rounded-full px-2 py-1 text-[9px] font-extrabold ${active ? "bg-emerald-50 text-emerald-700" : "bg-muted text-muted-foreground"}`}
    >
      {active ? "ACTIVE" : "INACTIVE"}
    </span>
  );
}
function Empty({ text }: { text: string }) {
  return (
    <p className="mt-5 rounded-xl border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
      {text}
    </p>
  );
}
