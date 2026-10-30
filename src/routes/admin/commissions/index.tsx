import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  ChevronDown,
  ChevronUp,
  Edit3,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  Trash2,
  X,
} from "lucide-react";
import { AdminLayout, AdminPanel } from "@/components/admin/admin-layout";
import { CommissionCalculator } from "@/components/admin/commission-calculator";
import { useEffectiveAccess } from "@/hooks/use-effective-access";
import {
  AdminApiError,
  adminApi,
  asArray,
  getAdminActor,
  type AdminEntity,
  type CommissionHierarchyAllocation,
  type CommissionHierarchyAllocationInput,
  type CommissionRule,
  type CommissionRulePurpose,
  type CommissionRuleType,
  type CommissionServiceCatalog,
  type CreateCommissionRuleInput,
  type ProviderRegistryEntry,
  type UpdateCommissionRuleInput,
} from "@/lib/admin-api";
import {
  catalogItemForService,
  catalogServiceLabel,
  financialRoleOptions,
  hierarchyAllocationsForPayload,
  numericDraftValue,
  providerAfterServiceChange,
  providerRegistryForService,
  ruleProviderOptions,
  rulePurposeForService,
  ruleTdsRate,
  shouldShowRuleDistributions,
  shouldShowRuleTds,
  validateHierarchyAllocations,
  type RuleProviderRegistry,
} from "@/lib/commission-rule-ui";
import { UI_PERMISSION } from "@/lib/ui-permissions";

export const Route = createFileRoute("/admin/commissions/")({
  validateSearch: (search: Record<string, unknown>) => ({
    view: search.view === "distributions" ? ("distributions" as const) : ("rules" as const),
  }),
  component: Commissions,
});

const inputClass =
  "w-full rounded-xl border border-border bg-white px-3.5 py-3 text-sm text-secondary outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground";

type AllocationDraft = {
  key: string;
  recipientRole: string;
  distributionType: CommissionRuleType;
  distributionValue: string;
  priority: string;
  isActive: boolean;
};

type RuleDraft = {
  serviceType: string;
  operator: string;
  role: string;
  rulePurpose: CommissionRulePurpose;
  commissionType: CommissionRuleType;
  commissionValue: string;
  tdsRate: string;
  minAmount: string;
  maxAmount: string;
  priority: string;
  isActive: boolean;
  hierarchyAllocations: AllocationDraft[];
};

const emptyRuleDraft: RuleDraft = {
  serviceType: "",
  operator: "",
  role: "",
  rulePurpose: "COMMISSION",
  commissionType: "FIXED",
  commissionValue: "",
  tdsRate: "2",
  minAmount: "",
  maxAmount: "",
  priority: "0",
  isActive: true,
  hierarchyAllocations: [],
};

let allocationKey = 0;
const nextAllocationKey = () => `allocation-${++allocationKey}`;

function allocationDraftFromApi(
  allocation: CommissionHierarchyAllocation,
  index: number,
): AllocationDraft {
  return {
    key: allocation.id || `saved-allocation-${index}`,
    recipientRole: allocation.recipientRole || "",
    distributionType: allocation.distributionType,
    distributionValue: numericDraftValue(allocation.distributionValue),
    priority: numericDraftValue(allocation.priority, "0"),
    isActive: Boolean(allocation.isActive),
  };
}

function draftFromRule(rule: CommissionRule): RuleDraft {
  return {
    serviceType: rule.serviceType || "",
    operator: rule.operator || "",
    role: rule.role || "",
    rulePurpose: rule.rulePurpose,
    commissionType: rule.commissionType,
    commissionValue: numericDraftValue(rule.commissionValue),
    tdsRate: numericDraftValue(rule.tdsRate, "0"),
    minAmount: numericDraftValue(rule.minAmount),
    maxAmount: numericDraftValue(rule.maxAmount),
    priority: numericDraftValue(rule.priority, "0"),
    isActive: Boolean(rule.isActive),
    hierarchyAllocations: (rule.hierarchyAllocations || []).map(allocationDraftFromApi),
  };
}

function draftFromCatalog(catalog: CommissionServiceCatalog[], roles: AdminEntity[]): RuleDraft {
  const service = catalog[0];
  const role = financialRoleOptions(roles)[0]?.value || "";
  if (!service) return { ...emptyRuleDraft, role };
  return {
    ...emptyRuleDraft,
    serviceType: service.serviceType,
    role,
    rulePurpose: rulePurposeForService(service),
    commissionType: service.supportedValueTypes[0] || "FIXED",
  };
}

function numberOrNull(value: string) {
  return value.trim() ? Number(value) : null;
}

function money(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return "No limit";
  const amount = Number(value);
  if (!Number.isFinite(amount)) return String(value);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(amount);
}

function ruleValue(rule: CommissionRule) {
  return rule.commissionType === "PERCENTAGE"
    ? `${Number(rule.commissionValue)}%`
    : money(rule.commissionValue);
}

function allocationValue(allocation: CommissionHierarchyAllocation) {
  return allocation.distributionType === "PERCENTAGE"
    ? `${Number(allocation.distributionValue)}% of gross commission pool`
    : `${money(allocation.distributionValue)} from gross commission pool`;
}

function Commissions() {
  const actor = getAdminActor();
  const { can } = useEffectiveAccess();
  const allowed = (permission: string) =>
    actor?.kind === "SUPER_ADMIN" || can(permission, ["ADMIN"]);
  const supportedRole = actor?.role === "SUPER_ADMIN" || actor?.role === "ADMIN";
  const canList = supportedRole && allowed(UI_PERMISSION.COMMISSION_RULE_LIST);
  const canInspect = supportedRole && allowed(UI_PERMISSION.COMMISSION_RULE_VIEW);
  const canCreate = supportedRole && allowed(UI_PERMISSION.COMMISSION_RULE_CREATE);
  const canUpdate = supportedRole && allowed(UI_PERMISSION.COMMISSION_RULE_UPDATE);
  const canDeactivate = supportedRole && allowed(UI_PERMISSION.COMMISSION_RULE_DEACTIVATE);
  const canViewHierarchy = allowed(UI_PERMISSION.COMMISSION_HIERARCHY_VIEW);

  const [rules, setRules] = useState<CommissionRule[]>([]);
  const [catalog, setCatalog] = useState<CommissionServiceCatalog[]>([]);
  const [roles, setRoles] = useState<AdminEntity[]>([]);
  const [rulesLoading, setRulesLoading] = useState(canList);
  const [catalogLoading, setCatalogLoading] = useState(canList);
  const [rolesLoading, setRolesLoading] = useState(canList);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);

  const [providersByRegistry, setProvidersByRegistry] = useState<
    Partial<Record<RuleProviderRegistry, ProviderRegistryEntry[]>>
  >({});
  const providerCache = useRef<Partial<Record<RuleProviderRegistry, ProviderRegistryEntry[]>>>({});
  const providerRequests = useRef<
    Partial<Record<RuleProviderRegistry, Promise<ProviderRegistryEntry[]>>>
  >({});
  const [providerLoading, setProviderLoading] = useState<
    Partial<Record<RuleProviderRegistry, boolean>>
  >({});
  const [providerError, setProviderError] = useState("");

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [expandedRuleId, setExpandedRuleId] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [loadingRule, setLoadingRule] = useState(false);
  const [draft, setDraft] = useState<RuleDraft>(emptyRuleDraft);
  const [pendingStatus, setPendingStatus] = useState<{
    rule: CommissionRule;
    nextActive: boolean;
  } | null>(null);

  const loadRules = useCallback(async () => {
    if (!canList) return;
    setRulesLoading(true);
    try {
      setRules(await adminApi.commissionRules.list());
    } catch (caught) {
      setError(
        caught instanceof AdminApiError ? caught.message : "Unable to load configured rules.",
      );
    } finally {
      setRulesLoading(false);
    }
  }, [canList]);

  const loadCatalog = useCallback(async () => {
    if (!canList) return;
    setCatalogLoading(true);
    try {
      setCatalog(await adminApi.commissionRules.serviceCatalog());
    } catch (caught) {
      setError(
        caught instanceof AdminApiError ? caught.message : "Unable to load the service catalog.",
      );
    } finally {
      setCatalogLoading(false);
    }
  }, [canList]);

  const loadRoles = useCallback(async () => {
    if (!canList) return;
    setRolesLoading(true);
    try {
      setRoles(asArray<AdminEntity>(await adminApi.roles.list()));
    } catch (caught) {
      setError(
        caught instanceof AdminApiError ? caught.message : "Unable to load hierarchy roles.",
      );
    } finally {
      setRolesLoading(false);
    }
  }, [canList]);

  const loadProviders = useCallback(async (registry: RuleProviderRegistry, force = false) => {
    if (force) {
      delete providerCache.current[registry];
      delete providerRequests.current[registry];
    }
    const cached = providerCache.current[registry];
    if (cached) return cached;
    const pending = providerRequests.current[registry];
    if (pending) return pending;
    setProviderLoading((current) => ({ ...current, [registry]: true }));
    const request = (
      registry === "AEPS"
        ? adminApi.superAdminAeps.providers.list()
        : adminApi.superAdminPayout.providers.list()
    )
      .then((providers) => {
        providerCache.current[registry] = providers;
        setProvidersByRegistry((current) => ({ ...current, [registry]: providers }));
        return providers;
      })
      .catch((caught) => {
        setProviderError(
          caught instanceof AdminApiError
            ? caught.message
            : `Unable to load ${registry === "AEPS" ? "AEPS" : "payout"} providers.`,
        );
        throw caught;
      })
      .finally(() => {
        delete providerRequests.current[registry];
        setProviderLoading((current) => ({ ...current, [registry]: false }));
      });
    providerRequests.current[registry] = request;
    return request;
  }, []);

  useEffect(() => {
    if (!canList) return;
    void Promise.all([loadCatalog(), loadRoles(), loadRules()]);
  }, [canList, loadCatalog, loadRoles, loadRules]);

  useEffect(() => {
    const registries = new Set(
      [...catalog.map((item) => item.serviceType), ...rules.map((rule) => rule.serviceType)]
        .map(providerRegistryForService)
        .filter((registry): registry is RuleProviderRegistry => Boolean(registry)),
    );
    registries.forEach((registry) => void loadProviders(registry).catch(() => undefined));
  }, [catalog, loadProviders, rules]);

  const selectedCatalog = catalogItemForService(catalog, draft.serviceType);
  const showTds = shouldShowRuleTds(selectedCatalog, draft.rulePurpose);
  const showAllocations = shouldShowRuleDistributions(selectedCatalog, draft.rulePurpose);
  const selectedRegistry = providerRegistryForService(draft.serviceType);
  const selectedProviders = selectedRegistry ? providersByRegistry[selectedRegistry] || [] : [];
  const providerOptions = ruleProviderOptions(selectedProviders, draft.operator);
  const roleOptions = financialRoleOptions(roles, [
    draft.role,
    ...draft.hierarchyAllocations.map((allocation) => allocation.recipientRole),
  ]);

  const providerName = useCallback(
    (rule: CommissionRule) => {
      if (!rule.operator) return "Any provider";
      const registry = providerRegistryForService(rule.serviceType);
      const provider = registry
        ? providersByRegistry[registry]?.find((item) => item.publicCode === rule.operator)
        : undefined;
      return provider?.publicName || rule.operator;
    },
    [providersByRegistry],
  );

  const visibleRules = useMemo(() => {
    const search = query.trim().toLowerCase();
    return rules.filter((rule) => {
      if (statusFilter === "ACTIVE" && !rule.isActive) return false;
      if (statusFilter === "INACTIVE" && rule.isActive) return false;
      if (roleFilter !== "ALL" && rule.role !== roleFilter) return false;
      if (!search) return true;
      return `${catalogServiceLabel(catalog, rule.serviceType)} ${providerName(rule)} ${rule.role} ${rule.rulePurpose} ${rule.commissionType}`
        .toLowerCase()
        .includes(search);
    });
  }, [catalog, providerName, query, roleFilter, rules, statusFilter]);

  const filterRoles = financialRoleOptions(
    roles,
    rules.map((rule) => rule.role),
  );
  const activeRuleCount = rules.filter((rule) => rule.isActive).length;

  async function refreshAll() {
    setError("");
    setProviderError("");
    await Promise.all([
      loadCatalog(),
      loadRoles(),
      loadRules(),
      loadProviders("AEPS", true).catch(() => undefined),
      loadProviders("PAYOUT", true).catch(() => undefined),
    ]);
  }

  function resetDraft() {
    setDraft(draftFromCatalog(catalog, roles));
  }

  function startCreate() {
    if (!canCreate)
      return setError(`Permission ${UI_PERMISSION.COMMISSION_RULE_CREATE} is required.`);
    setEditingRuleId(null);
    setDraft(draftFromCatalog(catalog, roles));
    setError("");
    setNotice("");
    setEditorOpen(true);
  }

  async function startEdit(rule: CommissionRule) {
    if (!canUpdate)
      return setError(`Permission ${UI_PERMISSION.COMMISSION_RULE_UPDATE} is required.`);
    setEditingRuleId(rule.id);
    setDraft(draftFromRule(rule));
    setError("");
    setNotice("");
    setEditorOpen(true);
    if (!canInspect) return;
    setLoadingRule(true);
    try {
      setDraft(draftFromRule(await adminApi.commissionRules.get(rule.id)));
    } catch (caught) {
      setError(
        caught instanceof AdminApiError ? caught.message : "Unable to load the latest rule.",
      );
    } finally {
      setLoadingRule(false);
    }
  }

  async function changeService(serviceType: string) {
    const item = catalogItemForService(catalog, serviceType);
    if (!item) return;
    const previousRegistry = providerRegistryForService(draft.serviceType);
    const nextRegistry = providerRegistryForService(serviceType);
    const cached = nextRegistry ? providerCache.current[nextRegistry] : undefined;
    setDraft((current) => ({
      ...current,
      serviceType,
      rulePurpose: rulePurposeForService(item, current.rulePurpose),
      commissionType: item.supportedValueTypes.includes(current.commissionType)
        ? current.commissionType
        : item.supportedValueTypes[0] || current.commissionType,
      operator:
        previousRegistry !== nextRegistry
          ? ""
          : cached
            ? providerAfterServiceChange(current.operator, cached)
            : current.operator,
    }));
    if (!nextRegistry || cached) return;
    try {
      const providers = await loadProviders(nextRegistry);
      setDraft((current) =>
        current.serviceType === serviceType
          ? { ...current, operator: providerAfterServiceChange(current.operator, providers) }
          : current,
      );
    } catch {
      // The registry error is rendered beside the provider field.
    }
  }

  function addAllocation() {
    const used = new Set(draft.hierarchyAllocations.map((item) => item.recipientRole));
    const recipientRole = roleOptions.find((role) => !used.has(role.value))?.value || "";
    setDraft((current) => ({
      ...current,
      hierarchyAllocations: [
        ...current.hierarchyAllocations,
        {
          key: nextAllocationKey(),
          recipientRole,
          distributionType: "PERCENTAGE",
          distributionValue: "",
          priority: "0",
          isActive: true,
        },
      ],
    }));
  }

  function updateAllocation(key: string, patch: Partial<AllocationDraft>) {
    setDraft((current) => ({
      ...current,
      hierarchyAllocations: current.hierarchyAllocations.map((allocation) =>
        allocation.key === key ? { ...allocation, ...patch } : allocation,
      ),
    }));
  }

  function removeAllocation(key: string) {
    setDraft((current) => ({
      ...current,
      hierarchyAllocations: current.hierarchyAllocations.filter(
        (allocation) => allocation.key !== key,
      ),
    }));
  }

  function validateDraft() {
    if (!selectedCatalog) return "Select a service from the backend catalog.";
    if (!selectedCatalog.supportedRulePurposes.includes(draft.rulePurpose))
      return `${selectedCatalog.label} does not support ${draft.rulePurpose.toLowerCase()} rules.`;
    if (!selectedCatalog.supportedValueTypes.includes(draft.commissionType))
      return `${selectedCatalog.label} does not support ${draft.commissionType.toLowerCase()} values.`;
    if (!draft.role.trim()) return "Source role is required.";
    if (!draft.commissionValue.trim()) return "Rule value is required.";
    const value = Number(draft.commissionValue);
    if (!Number.isFinite(value) || value < 0)
      return "Rule value must be a valid non-negative number.";
    if (draft.commissionType === "PERCENTAGE" && value > 100)
      return "Percentage value cannot exceed 100%.";
    if (showTds) {
      const tds = Number(draft.tdsRate);
      if (!draft.tdsRate.trim() || !Number.isFinite(tds) || tds < 0 || tds > 100)
        return "TDS rate must be between 0 and 100%.";
      if (!/^(?:\d+|\d*\.\d{1,2})$/.test(draft.tdsRate.trim()))
        return "TDS rate can have at most 2 decimal places.";
    }
    const minAmount = numberOrNull(draft.minAmount);
    const maxAmount = numberOrNull(draft.maxAmount);
    if (minAmount !== null && (!Number.isFinite(minAmount) || minAmount < 0))
      return "Minimum amount must be 0 or more.";
    if (maxAmount !== null && (!Number.isFinite(maxAmount) || maxAmount < 0))
      return "Maximum amount must be 0 or more.";
    if (minAmount !== null && maxAmount !== null && minAmount > maxAmount)
      return "Minimum amount cannot be greater than maximum amount.";
    if (!Number.isInteger(Number(draft.priority))) return "Priority must be a whole number.";
    return showAllocations ? validateHierarchyAllocations(draft.hierarchyAllocations) : null;
  }

  async function submitRule(event: FormEvent) {
    event.preventDefault();
    if (editingRuleId ? !canUpdate : !canCreate)
      return setError(
        `Permission ${editingRuleId ? UI_PERMISSION.COMMISSION_RULE_UPDATE : UI_PERMISSION.COMMISSION_RULE_CREATE} is required.`,
      );
    setError("");
    setNotice("");
    const validation = validateDraft();
    if (validation) return setError(validation);
    const hierarchyAllocations = hierarchyAllocationsForPayload(
      selectedCatalog,
      draft.rulePurpose,
      draft.hierarchyAllocations,
    ) as CommissionHierarchyAllocationInput[];
    const common = {
      serviceType: draft.serviceType.trim(),
      operator: draft.operator.trim() || null,
      role: draft.role.trim(),
      rulePurpose: draft.rulePurpose,
      commissionType: draft.commissionType,
      commissionValue: Number(draft.commissionValue),
      tdsRate: ruleTdsRate(selectedCatalog, draft.rulePurpose, draft.tdsRate),
      minAmount: numberOrNull(draft.minAmount),
      maxAmount: numberOrNull(draft.maxAmount),
      priority: Number(draft.priority),
      isActive: draft.isActive,
      hierarchyAllocations,
    };
    setSaving(true);
    try {
      if (editingRuleId) {
        await adminApi.commissionRules.update(editingRuleId, common as UpdateCommissionRuleInput);
        setNotice("Configured rule and hierarchy allocations updated successfully.");
      } else {
        await adminApi.commissionRules.create(common as CreateCommissionRuleInput);
        setNotice("Configured rule and hierarchy allocations created successfully.");
      }
      setEditorOpen(false);
      setEditingRuleId(null);
      resetDraft();
      await loadRules();
    } catch (caught) {
      setError(
        caught instanceof AdminApiError ? caught.message : "Unable to save the configured rule.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function confirmStatusChange() {
    if (!pendingStatus) return;
    const { rule, nextActive } = pendingStatus;
    if (nextActive ? !canUpdate : !canDeactivate) return;
    setSaving(true);
    setError("");
    try {
      if (nextActive) {
        // Status-only PATCH intentionally omits hierarchyAllocations and preserves them.
        await adminApi.commissionRules.update(rule.id, { isActive: true });
      } else {
        await adminApi.commissionRules.deactivate(rule.id);
      }
      setRules((current) =>
        current.map((item) => (item.id === rule.id ? { ...item, isActive: nextActive } : item)),
      );
      setNotice(`Configured rule ${nextActive ? "reactivated" : "deactivated"}.`);
      setPendingStatus(null);
    } catch (caught) {
      setError(caught instanceof AdminApiError ? caught.message : "Unable to change rule status.");
    } finally {
      setSaving(false);
    }
  }

  const activePercentageTotal = draft.hierarchyAllocations.reduce(
    (total, allocation) =>
      allocation.isActive && allocation.distributionType === "PERCENTAGE"
        ? total + (Number(allocation.distributionValue) || 0)
        : total,
    0,
  );

  if (!canList) {
    return (
      <AdminLayout
        active="commissions"
        eyebrow="Pricing"
        title="Configured Rules"
        description="Configured rule access is restricted to authorized Admin and Super Admin accounts."
      >
        <AdminPanel>
          <div className="flex gap-3 rounded-xl bg-amber-50 p-4 text-amber-900">
            <ShieldAlert size={20} className="mt-0.5 shrink-0" />
            <p className="text-sm font-bold">Configured Rules permission is required.</p>
          </div>
        </AdminPanel>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout
      active="commissions"
      eyebrow="Pricing"
      title="Configured Rules"
      description="Manage slab rules and their hierarchy allocations together using the backend service catalog."
    >
      <div className="inline-flex rounded-xl border border-border bg-white p-1">
        <span className="rounded-lg bg-secondary px-4 py-2.5 text-xs font-extrabold text-white">
          Configured Rules
        </span>
        {canViewHierarchy && (
          <Link
            to="/admin/commissions/hierarchy"
            className="rounded-lg px-4 py-2.5 text-xs font-extrabold text-muted-foreground hover:bg-muted"
          >
            Hierarchy
          </Link>
        )}
      </div>

      <CommissionCalculator />

      <div className="mt-5 grid gap-4 md:grid-cols-3">
        <Summary label="Total rules" value={rules.length} />
        <Summary label="Active rules" value={activeRuleCount} tone="good" />
        <Summary label="Catalog services" value={catalog.length} />
      </div>

      {error && (
        <p
          role="alert"
          className="mt-5 rounded-xl bg-red-50 p-4 text-sm font-semibold text-red-700"
        >
          {error}
        </p>
      )}
      {notice && (
        <p className="mt-5 rounded-xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">
          {notice}
        </p>
      )}

      {pendingStatus && (
        <AdminPanel className="mt-5 border-amber-200 bg-amber-50/50">
          <p className="text-sm font-black text-secondary">
            {pendingStatus.nextActive ? "Reactivate" : "Deactivate"} this configured rule?
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {catalogServiceLabel(catalog, pendingStatus.rule.serviceType)} ·{" "}
            {pendingStatus.rule.role}· {pendingStatus.rule.rulePurpose}
          </p>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => setPendingStatus(null)}
              className="rounded-xl border border-border bg-white px-4 py-2 text-xs font-bold"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => void confirmStatusChange()}
              className="rounded-xl bg-secondary px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
            >
              {saving ? "Saving…" : "Confirm"}
            </button>
          </div>
        </AdminPanel>
      )}

      {editorOpen && (
        <AdminPanel className="mt-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-wider text-primary">
                {editingRuleId ? "Edit configured rule" : "New configured rule"}
              </p>
              <h2 className="mt-1 text-xl font-black">Rule, slab and hierarchy allocations</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Saving an edit synchronizes the complete allocation list shown in this form.
              </p>
            </div>
            <button
              type="button"
              aria-label="Close rule editor"
              onClick={() => {
                setEditorOpen(false);
                setEditingRuleId(null);
                resetDraft();
              }}
              className="grid h-9 w-9 place-items-center rounded-xl border border-border text-muted-foreground hover:bg-muted"
            >
              <X size={16} />
            </button>
          </div>

          {loadingRule ? (
            <LoadingBox text="Loading latest rule…" />
          ) : (
            <form onSubmit={submitRule} className="mt-6 space-y-6">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                <Field label="Service *">
                  <select
                    value={draft.serviceType}
                    onChange={(event) => void changeService(event.target.value)}
                    className={inputClass}
                  >
                    {catalog.map((item) => (
                      <option key={item.serviceType} value={item.serviceType}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Rule purpose *">
                  <select
                    value={draft.rulePurpose}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        rulePurpose: event.target.value as CommissionRulePurpose,
                      }))
                    }
                    className={inputClass}
                  >
                    {(selectedCatalog?.supportedRulePurposes || []).map((purpose) => (
                      <option key={purpose} value={purpose}>
                        {purpose}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Provider" hint="Any provider submits operator as null.">
                  <select
                    value={draft.operator}
                    disabled={
                      !selectedRegistry ||
                      Boolean(
                        selectedRegistry &&
                        providerLoading[selectedRegistry] &&
                        !selectedProviders.length,
                      )
                    }
                    onChange={(event) =>
                      setDraft((current) => ({ ...current, operator: event.target.value }))
                    }
                    className={inputClass}
                  >
                    <option value="">Any provider</option>
                    {providerOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  {selectedRegistry && providerLoading[selectedRegistry] && (
                    <FieldStatus>Loading providers…</FieldStatus>
                  )}
                  {providerError && <FieldStatus error>{providerError}</FieldStatus>}
                </Field>
                <Field label="Source role *" hint="Active roles are loaded from /roles.">
                  <select
                    value={draft.role}
                    disabled={rolesLoading}
                    onChange={(event) =>
                      setDraft((current) => ({ ...current, role: event.target.value }))
                    }
                    className={inputClass}
                  >
                    <option value="">Select source role</option>
                    {roleOptions.map((role) => (
                      <option key={role.value} value={role.value}>
                        {role.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Priority">
                  <input
                    type="number"
                    step="1"
                    value={draft.priority}
                    onChange={(event) =>
                      setDraft((current) => ({ ...current, priority: event.target.value }))
                    }
                    className={inputClass}
                  />
                </Field>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                <Field label="Value type *">
                  <select
                    value={draft.commissionType}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        commissionType: event.target.value as CommissionRuleType,
                      }))
                    }
                    className={inputClass}
                  >
                    {(selectedCatalog?.supportedValueTypes || []).map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field
                  label={
                    draft.commissionType === "PERCENTAGE" ? "Percentage value *" : "Fixed value *"
                  }
                >
                  <NumberInput
                    icon={draft.commissionType === "PERCENTAGE" ? "%" : "₹"}
                    value={draft.commissionValue}
                    min="0"
                    max={draft.commissionType === "PERCENTAGE" ? "100" : undefined}
                    step="0.0001"
                    onChange={(value) =>
                      setDraft((current) => ({ ...current, commissionValue: value }))
                    }
                  />
                </Field>
                {showTds && (
                  <Field label="TDS rate (%) *" hint="0–100, maximum 2 decimal places.">
                    <NumberInput
                      icon="%"
                      value={draft.tdsRate}
                      min="0"
                      max="100"
                      step="0.01"
                      onChange={(value) => setDraft((current) => ({ ...current, tdsRate: value }))}
                    />
                  </Field>
                )}
                <Field label="Minimum amount" hint="Blank sends null.">
                  <NumberInput
                    icon="₹"
                    value={draft.minAmount}
                    min="0"
                    step="0.01"
                    onChange={(value) => setDraft((current) => ({ ...current, minAmount: value }))}
                  />
                </Field>
                <Field label="Maximum amount" hint="Blank sends null.">
                  <NumberInput
                    icon="₹"
                    value={draft.maxAmount}
                    min="0"
                    step="0.01"
                    onChange={(value) => setDraft((current) => ({ ...current, maxAmount: value }))}
                  />
                </Field>
              </div>

              <label className="flex w-fit cursor-pointer items-center gap-3 rounded-xl border border-border px-4 py-3 text-sm font-bold text-secondary">
                <input
                  type="checkbox"
                  checked={draft.isActive}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, isActive: event.target.checked }))
                  }
                  className="h-4 w-4 accent-primary"
                />
                Rule is active
              </label>

              {showAllocations ? (
                <AllocationEditor
                  allocations={draft.hierarchyAllocations}
                  roleOptions={roleOptions}
                  activePercentageTotal={activePercentageTotal}
                  onAdd={addAllocation}
                  onUpdate={updateAllocation}
                  onRemove={removeAllocation}
                />
              ) : (
                <div className="rounded-xl bg-muted p-4 text-xs text-muted-foreground">
                  {draft.rulePurpose === "SURCHARGE"
                    ? "Surcharge applies to the selected source role. TDS is 0 and hierarchy allocations are submitted as an empty array."
                    : "This service does not support hierarchy distributions. Allocations are submitted as an empty array."}
                </div>
              )}

              <div className="flex flex-wrap gap-3 border-t border-border pt-5">
                <button
                  type="button"
                  onClick={() => {
                    setEditorOpen(false);
                    setEditingRuleId(null);
                    resetDraft();
                  }}
                  className="rounded-xl border border-border px-5 py-3 text-xs font-extrabold text-secondary hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-xs font-extrabold text-white disabled:opacity-60"
                >
                  {saving ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : editingRuleId ? (
                    <Edit3 size={15} />
                  ) : (
                    <Plus size={15} />
                  )}
                  {saving ? "Saving…" : editingRuleId ? "Save rule and allocations" : "Create rule"}
                </button>
              </div>
            </form>
          )}
        </AdminPanel>
      )}

      <AdminPanel className="mt-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h2 className="text-xl font-black">Configured rules</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {visibleRules.length} of {rules.length} rules shown.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <label className="flex min-w-0 items-center gap-2 rounded-xl border border-border px-3 py-2.5 sm:w-72">
              <Search size={15} className="text-muted-foreground" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search service, provider, role…"
                className="min-w-0 flex-1 bg-transparent text-xs outline-none"
              />
            </label>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}
              className="rounded-xl border border-border bg-white px-3 text-xs font-bold"
            >
              <option value="ALL">All statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
            <select
              value={roleFilter}
              onChange={(event) => setRoleFilter(event.target.value)}
              className="rounded-xl border border-border bg-white px-3 text-xs font-bold"
            >
              <option value="ALL">All source roles</option>
              {filterRoles.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => void refreshAll()}
              disabled={rulesLoading || catalogLoading || rolesLoading}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-border px-4 py-2.5 text-xs font-extrabold text-secondary disabled:opacity-50"
            >
              <RefreshCw
                size={14}
                className={rulesLoading || catalogLoading || rolesLoading ? "animate-spin" : ""}
              />
              Refresh
            </button>
            <button
              type="button"
              onClick={startCreate}
              disabled={!canCreate || catalogLoading || rolesLoading || !catalog.length}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-extrabold text-white disabled:opacity-50"
            >
              <Plus size={14} /> New rule
            </button>
          </div>
        </div>

        {rulesLoading && !rules.length ? (
          <LoadingBox text="Loading configured rules…" />
        ) : (
          <RuleTable
            rules={visibleRules}
            catalog={catalog}
            expandedRuleId={expandedRuleId}
            providerName={providerName}
            canUpdate={canUpdate}
            canDeactivate={canDeactivate}
            onExpand={(id) => setExpandedRuleId((current) => (current === id ? "" : id))}
            onEdit={(rule) => void startEdit(rule)}
            onStatus={(rule) => setPendingStatus({ rule, nextActive: !rule.isActive })}
          />
        )}
      </AdminPanel>
    </AdminLayout>
  );
}

function AllocationEditor({
  allocations,
  roleOptions,
  activePercentageTotal,
  onAdd,
  onUpdate,
  onRemove,
}: {
  allocations: AllocationDraft[];
  roleOptions: Array<{ value: string; label: string }>;
  activePercentageTotal: number;
  onAdd: () => void;
  onUpdate: (key: string, patch: Partial<AllocationDraft>) => void;
  onRemove: (key: string) => void;
}) {
  return (
    <section className="rounded-2xl border border-border bg-muted/20 p-4 md:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-base font-black text-secondary">Hierarchy allocations</h3>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Percentage shares apply to the gross commission pool. The remainder stays with the
            source role.
          </p>
        </div>
        <button
          type="button"
          onClick={onAdd}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-primary/30 bg-white px-4 py-2.5 text-xs font-extrabold text-primary"
        >
          <Plus size={14} /> Add allocation
        </button>
      </div>
      <div className="mt-4 space-y-3">
        {allocations.map((allocation, index) => (
          <div key={allocation.key} className="rounded-xl border border-border bg-white p-4">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1.3fr_1fr_1fr_0.7fr_auto_auto] xl:items-end">
              <Field label={`Recipient role ${index + 1} *`}>
                <select
                  value={allocation.recipientRole}
                  onChange={(event) =>
                    onUpdate(allocation.key, { recipientRole: event.target.value })
                  }
                  className={inputClass}
                >
                  <option value="">Select recipient role</option>
                  {roleOptions.map((role) => (
                    <option key={role.value} value={role.value}>
                      {role.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Distribution type *">
                <select
                  value={allocation.distributionType}
                  onChange={(event) =>
                    onUpdate(allocation.key, {
                      distributionType: event.target.value as CommissionRuleType,
                    })
                  }
                  className={inputClass}
                >
                  <option value="FIXED">FIXED</option>
                  <option value="PERCENTAGE">PERCENTAGE</option>
                </select>
              </Field>
              <Field
                label={
                  allocation.distributionType === "PERCENTAGE"
                    ? "Pool percentage *"
                    : "Fixed amount *"
                }
              >
                <NumberInput
                  icon={allocation.distributionType === "PERCENTAGE" ? "%" : "₹"}
                  value={allocation.distributionValue}
                  min="0"
                  max={allocation.distributionType === "PERCENTAGE" ? "100" : undefined}
                  step="0.0001"
                  onChange={(value) => onUpdate(allocation.key, { distributionValue: value })}
                />
              </Field>
              <Field label="Priority">
                <input
                  type="number"
                  step="1"
                  value={allocation.priority}
                  onChange={(event) => onUpdate(allocation.key, { priority: event.target.value })}
                  className={inputClass}
                />
              </Field>
              <label className="flex h-12 items-center gap-2 rounded-xl border border-border px-3 text-xs font-bold text-secondary">
                <input
                  type="checkbox"
                  checked={allocation.isActive}
                  onChange={(event) => onUpdate(allocation.key, { isActive: event.target.checked })}
                  className="h-4 w-4 accent-primary"
                />
                Active
              </label>
              <button
                type="button"
                aria-label={`Remove allocation ${index + 1}`}
                onClick={() => onRemove(allocation.key)}
                className="grid h-12 w-12 place-items-center rounded-xl border border-red-200 text-red-600 hover:bg-red-50"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
        {!allocations.length && (
          <p className="rounded-xl border border-dashed border-border bg-white px-4 py-8 text-center text-xs text-muted-foreground">
            No recipient allocations. The complete commission remains with the source role.
          </p>
        )}
      </div>
      <p
        className={`mt-3 text-xs font-bold ${activePercentageTotal > 100 ? "text-red-600" : "text-muted-foreground"}`}
      >
        Active percentage total: {activePercentageTotal.toFixed(4)}%
      </p>
    </section>
  );
}

function RuleTable({
  rules,
  catalog,
  expandedRuleId,
  providerName,
  canUpdate,
  canDeactivate,
  onExpand,
  onEdit,
  onStatus,
}: {
  rules: CommissionRule[];
  catalog: CommissionServiceCatalog[];
  expandedRuleId: string;
  providerName: (rule: CommissionRule) => string;
  canUpdate: boolean;
  canDeactivate: boolean;
  onExpand: (id: string) => void;
  onEdit: (rule: CommissionRule) => void;
  onStatus: (rule: CommissionRule) => void;
}) {
  return (
    <div className="mt-6 overflow-x-auto rounded-xl border border-border">
      <table className="min-w-[1120px] w-full text-left text-xs">
        <thead className="bg-muted/70 text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
          <tr>
            <th className="px-4 py-3">Service / provider</th>
            <th className="px-4 py-3">Source role</th>
            <th className="px-4 py-3">Purpose / slab</th>
            <th className="px-4 py-3">Value / TDS</th>
            <th className="px-4 py-3">Hierarchy allocations</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rules.map((rule) => {
            const allocations = rule.hierarchyAllocations || [];
            const activeAllocations = allocations.filter((allocation) => allocation.isActive);
            const isExpanded = expandedRuleId === rule.id;
            const item = catalogItemForService(catalog, rule.serviceType);
            return (
              <Fragment key={rule.id}>
                <tr className="bg-white align-top hover:bg-muted/25">
                  <td className="px-4 py-4">
                    <p className="font-black text-secondary">
                      {catalogServiceLabel(catalog, rule.serviceType)}
                    </p>
                    <p className="mt-1 text-[11px] text-muted-foreground">{providerName(rule)}</p>
                  </td>
                  <td className="px-4 py-4 font-extrabold text-secondary">{rule.role}</td>
                  <td className="px-4 py-4">
                    <p className="font-black text-primary">{rule.rulePurpose}</p>
                    <p className="mt-1 text-muted-foreground">
                      {money(rule.minAmount)} → {money(rule.maxAmount)}
                    </p>
                  </td>
                  <td className="px-4 py-4">
                    <p className="font-black text-secondary">
                      {ruleValue(rule)} · {rule.commissionType}
                    </p>
                    <p className="mt-1 text-muted-foreground">
                      {shouldShowRuleTds(item, rule.rulePurpose)
                        ? `TDS ${Number(rule.tdsRate ?? 0)}%`
                        : "TDS not applicable"}
                    </p>
                  </td>
                  <td className="px-4 py-4">
                    {shouldShowRuleDistributions(item, rule.rulePurpose) ? (
                      <button
                        type="button"
                        onClick={() => onExpand(rule.id)}
                        className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 font-extrabold text-secondary hover:bg-muted"
                      >
                        {activeAllocations.length} active / {allocations.length} total
                        {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                      </button>
                    ) : (
                      <span className="text-muted-foreground">Not applicable</span>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <StatusPill active={rule.isActive} />
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        disabled={!canUpdate}
                        onClick={() => onEdit(rule)}
                        className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-2 font-extrabold text-secondary disabled:opacity-50"
                      >
                        <Edit3 size={12} /> Edit
                      </button>
                      <button
                        type="button"
                        disabled={rule.isActive ? !canDeactivate : !canUpdate}
                        onClick={() => onStatus(rule)}
                        className="rounded-lg border border-border px-3 py-2 font-extrabold text-secondary disabled:opacity-50"
                      >
                        {rule.isActive ? "Deactivate" : "Reactivate"}
                      </button>
                    </div>
                  </td>
                </tr>
                {isExpanded && (
                  <tr className="bg-muted/25">
                    <td colSpan={7} className="px-6 py-5">
                      <AllocationSummary allocations={allocations} />
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
          {!rules.length && (
            <tr>
              <td colSpan={7} className="px-4 py-12 text-center text-sm text-muted-foreground">
                No configured rules match the current filters.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function AllocationSummary({ allocations }: { allocations: CommissionHierarchyAllocation[] }) {
  if (!allocations.length)
    return (
      <p className="text-xs text-muted-foreground">
        No hierarchy allocations configured. The source role keeps the complete commission.
      </p>
    );
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {allocations.map((allocation) => (
        <div
          key={allocation.id || `${allocation.recipientRole}-${allocation.priority}`}
          className="rounded-xl border border-border bg-white p-4"
        >
          <div className="flex items-center justify-between gap-3">
            <p className="font-black text-secondary">{allocation.recipientRole}</p>
            <StatusPill active={allocation.isActive} />
          </div>
          <p className="mt-2 text-xs font-bold text-primary">{allocationValue(allocation)}</p>
          <p className="mt-1 text-[10px] text-muted-foreground">
            {allocation.distributionType} · Priority {allocation.priority}
          </p>
        </div>
      ))}
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div>
      <span className="text-xs font-extrabold text-secondary">{label}</span>
      <div className="mt-2">{children}</div>
      {hint && <span className="mt-1.5 block text-[10px] text-muted-foreground">{hint}</span>}
    </div>
  );
}

function FieldStatus({ children, error = false }: { children: ReactNode; error?: boolean }) {
  return (
    <p
      className={`mt-2 text-[10px] font-semibold ${error ? "text-red-600" : "text-muted-foreground"}`}
    >
      {children}
    </p>
  );
}

function NumberInput({
  icon,
  value,
  min,
  max,
  step,
  onChange,
}: {
  icon: string;
  value: string;
  min?: string;
  max?: string;
  step?: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="relative">
      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground">
        {icon}
      </span>
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`${inputClass} pl-9`}
      />
    </div>
  );
}

function Summary({ label, value, tone }: { label: string; value: number; tone?: "good" }) {
  return (
    <div className="rounded-2xl border border-border bg-white p-5">
      <p className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p
        className={`mt-2 text-2xl font-black ${tone === "good" ? "text-emerald-700" : "text-secondary"}`}
      >
        {value}
      </p>
    </div>
  );
}

function StatusPill({ active }: { active: boolean }) {
  return (
    <span
      className={`rounded-full px-2 py-1 text-[9px] font-extrabold ${active ? "bg-emerald-50 text-emerald-700" : "bg-muted text-muted-foreground"}`}
    >
      {active ? "ACTIVE" : "INACTIVE"}
    </span>
  );
}

function LoadingBox({ text }: { text: string }) {
  return (
    <div className="mt-6 flex items-center justify-center gap-2 rounded-xl border border-dashed border-border py-12 text-sm font-semibold text-muted-foreground">
      <Loader2 size={17} className="animate-spin" /> {text}
    </div>
  );
}
