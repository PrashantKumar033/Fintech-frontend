import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import {
  CheckCircle2,
  ChevronDown,
  CircleDollarSign,
  Edit3,
  IndianRupee,
  Layers3,
  Loader2,
  Percent,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  SlidersHorizontal,
  UsersRound,
  X,
} from "lucide-react";
import { AdminLayout, AdminPanel } from "@/components/admin/admin-layout";
import { CommissionCalculator } from "@/components/admin/commission-calculator";
import { useEffectiveAccess } from "@/hooks/use-effective-access";
import { UI_PERMISSION } from "@/lib/ui-permissions";
import {
  AdminApiError,
  adminApi,
  getAdminActor,
  type CommissionDistribution,
  type CommissionDistributionType,
  type CommissionRule,
  type CommissionRuleType,
  type CreateCommissionDistributionInput,
  type CreateCommissionRuleInput,
  type UpdateCommissionDistributionInput,
  type UpdateCommissionRuleInput,
} from "@/lib/admin-api";

export const Route = createFileRoute("/admin/commissions/")({
  validateSearch: (search: Record<string, unknown>) => ({
    view: search.view === "distributions" ? ("distributions" as const) : ("rules" as const),
  }),
  component: Commissions,
});

const inputClass =
  "w-full rounded-xl border border-border bg-white px-3.5 py-3 text-sm text-secondary outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground";

type CommissionView = "RULES" | "DISTRIBUTIONS";

type RuleDraft = {
  serviceType: string;
  operator: string;
  role: string;
  commissionType: CommissionRuleType;
  commissionValue: string;
  minAmount: string;
  maxAmount: string;
  priority: string;
  isActive: boolean;
};

type DistributionDraft = {
  commissionRuleId: string;
  recipientRole: string;
  distributionType: CommissionDistributionType;
  distributionValue: string;
  priority: string;
  isActive: boolean;
};

type Health = {
  tone: "good" | "warn" | "danger";
  title: string;
  detail: string;
};

const emptyRuleDraft: RuleDraft = {
  serviceType: "",
  operator: "",
  role: "RETAILER",
  commissionType: "FIXED",
  commissionValue: "",
  minAmount: "",
  maxAmount: "",
  priority: "0",
  isActive: true,
};

const emptyDistributionDraft: DistributionDraft = {
  commissionRuleId: "",
  recipientRole: "",
  distributionType: "FIXED",
  distributionValue: "",
  priority: "0",
  isActive: true,
};

function normalizeCode(value: string) {
  return value.trim().toUpperCase();
}

function numberOrUndefined(value: string) {
  if (!value.trim()) return undefined;
  return Number(value);
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

function dateTime(value?: string) {
  if (!value) return "Not available";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Not available";
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsed);
}

function ruleRate(rule: CommissionRule) {
  const value = Number(rule.commissionValue);
  if (rule.commissionType === "PERCENTAGE") {
    return `${Number.isFinite(value) ? value : rule.commissionValue}%`;
  }
  return money(rule.commissionValue);
}

function distributionRate(distribution: CommissionDistribution) {
  const value = Number(distribution.distributionValue);
  if (distribution.distributionType === "PERCENTAGE") {
    return `${Number.isFinite(value) ? value : distribution.distributionValue}% of commission pool`;
  }
  return `${money(distribution.distributionValue)} from commission pool`;
}

function draftFromRule(rule: CommissionRule): RuleDraft {
  return {
    serviceType: rule.serviceType || "",
    operator: rule.operator || "",
    role: rule.role || "RETAILER",
    commissionType: rule.commissionType,
    commissionValue: String(rule.commissionValue ?? ""),
    minAmount:
      rule.minAmount === null || rule.minAmount === undefined ? "" : String(rule.minAmount),
    maxAmount:
      rule.maxAmount === null || rule.maxAmount === undefined ? "" : String(rule.maxAmount),
    priority: String(rule.priority ?? 0),
    isActive: Boolean(rule.isActive),
  };
}

function draftFromDistribution(distribution: CommissionDistribution): DistributionDraft {
  return {
    commissionRuleId: distribution.commissionRuleId,
    recipientRole: distribution.recipientRole || "",
    distributionType: distribution.distributionType,
    distributionValue: String(distribution.distributionValue ?? ""),
    priority: String(distribution.priority ?? 0),
    isActive: Boolean(distribution.isActive),
  };
}

function activeTotals(distributions: CommissionDistribution[]) {
  return distributions.reduce(
    (totals, item) => {
      if (!item.isActive) return totals;
      const value = Number(item.distributionValue);
      if (!Number.isFinite(value)) return totals;
      if (item.distributionType === "PERCENTAGE") totals.percentage += value;
      else totals.fixed += value;
      return totals;
    },
    { percentage: 0, fixed: 0 },
  );
}

function distributionHealth(
  rule: CommissionRule | undefined,
  distributions: CommissionDistribution[],
): Health {
  if (!rule) {
    return {
      tone: "warn",
      title: "Select a commission rule",
      detail: "Choose a rule to review its active distribution setup.",
    };
  }

  const totals = activeTotals(distributions);
  if (totals.percentage > 100.000001) {
    return {
      tone: "danger",
      title: "Distribution setup can exceed the commission pool",
      detail: `Active percentage shares total ${totals.percentage.toFixed(4)}%. The backend checks the full pool at execution and will reject an over-allocation.`,
    };
  }

  if (rule.commissionType === "FIXED") {
    const pool = Number(rule.commissionValue);
    if (Number.isFinite(pool)) {
      const configured = totals.fixed + (pool * totals.percentage) / 100;
      if (configured > pool + 0.005) {
        return {
          tone: "danger",
          title: "Configured shares are larger than this fixed commission pool",
          detail: `${money(configured)} is configured against a ${money(pool)} pool. Reduce a fixed or percentage share before activating this setup.`,
        };
      }
      const remainder = Math.max(0, pool - configured);
      return {
        tone: "good",
        title: "Distribution fits this fixed commission pool",
        detail: `${money(configured)} is configured for hierarchy recipients. Up to ${money(remainder)} remains for the source merchant when all configured recipients are eligible.`,
      };
    }
  }

  if (totals.fixed > 0) {
    const rulePercent = Number(rule.commissionValue);
    const minAmount = Number(rule.minAmount);
    if (
      rule.commissionType === "PERCENTAGE" &&
      Number.isFinite(rulePercent) &&
      Number.isFinite(minAmount) &&
      minAmount > 0
    ) {
      const minPool = (minAmount * rulePercent) / 100;
      const configuredAtMin = totals.fixed + (minPool * totals.percentage) / 100;
      if (configuredAtMin > minPool + 0.005) {
        return {
          tone: "danger",
          title: "Fixed shares can exceed the pool at the start of this slab",
          detail: `At ${money(minAmount)}, the estimated commission pool is ${money(minPool)}, but active shares need about ${money(configuredAtMin)}.`,
        };
      }
    }

    return {
      tone: "warn",
      title: "Mixed fixed and percentage shares need runtime room",
      detail: `Active setup has ${money(totals.fixed)} fixed plus ${totals.percentage.toFixed(4)}% of the pool. The backend makes the final over-allocation check for each real transaction.`,
    };
  }

  return {
    tone: "good",
    title: "Percentage setup is within the commission pool",
    detail: `${totals.percentage.toFixed(4)}% is configured for hierarchy recipients. The unallocated part stays with the source merchant.`,
  };
}

function Commissions() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const actor = getAdminActor();
  const { can } = useEffectiveAccess();
  const allowed = (code: string) => actor?.kind === "SUPER_ADMIN" || can(code, ["ADMIN"]);
  const supportedAdminRole = actor?.role === "SUPER_ADMIN" || actor?.role === "ADMIN";
  const canViewRules = supportedAdminRole && allowed(UI_PERMISSION.COMMISSION_RULE_VIEW);
  const canViewDistributions =
    supportedAdminRole && allowed(UI_PERMISSION.COMMISSION_DISTRIBUTION_VIEW);
  const canManage = canViewRules || canViewDistributions;
  const canCreateRule = allowed(UI_PERMISSION.COMMISSION_RULE_CREATE);
  const canUpdateRule = allowed(UI_PERMISSION.COMMISSION_RULE_UPDATE);
  const canDeactivateRule = allowed(UI_PERMISSION.COMMISSION_RULE_DEACTIVATE);
  const canCreateDistribution = allowed(UI_PERMISSION.COMMISSION_DISTRIBUTION_CREATE);
  const canUpdateDistribution = allowed(UI_PERMISSION.COMMISSION_DISTRIBUTION_UPDATE);
  const canDeactivateDistribution = allowed(UI_PERMISSION.COMMISSION_DISTRIBUTION_DEACTIVATE);

  const view: CommissionView = search.view === "distributions" ? "DISTRIBUTIONS" : "RULES";
  const [rules, setRules] = useState<CommissionRule[]>([]);
  const [distributions, setDistributions] = useState<CommissionDistribution[]>([]);
  const [rulesLoading, setRulesLoading] = useState(canManage);
  const [distributionsLoading, setDistributionsLoading] = useState(canManage);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);

  const [ruleQuery, setRuleQuery] = useState("");
  const [ruleStatus, setRuleStatus] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");
  const [ruleRoleFilter, setRuleRoleFilter] = useState("ALL");
  const [ruleEditorOpen, setRuleEditorOpen] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [ruleDraft, setRuleDraft] = useState<RuleDraft>(emptyRuleDraft);
  const [loadingRule, setLoadingRule] = useState(false);
  const [pendingRuleStatus, setPendingRuleStatus] = useState<{
    rule: CommissionRule;
    nextActive: boolean;
  } | null>(null);

  const [selectedRuleId, setSelectedRuleId] = useState("");
  const [distributionQuery, setDistributionQuery] = useState("");
  const [distributionStatus, setDistributionStatus] = useState<"ALL" | "ACTIVE" | "INACTIVE">(
    "ALL",
  );
  const [distributionEditorOpen, setDistributionEditorOpen] = useState(false);
  const [editingDistributionId, setEditingDistributionId] = useState<string | null>(null);
  const [distributionDraft, setDistributionDraft] =
    useState<DistributionDraft>(emptyDistributionDraft);
  const [loadingDistribution, setLoadingDistribution] = useState(false);
  const [pendingDistributionStatus, setPendingDistributionStatus] = useState<{
    distribution: CommissionDistribution;
    nextActive: boolean;
  } | null>(null);

  async function loadRules() {
    if (!canManage) return;
    setRulesLoading(true);
    try {
      setRules(await adminApi.commissionRules.list());
    } catch (caught) {
      setError(
        caught instanceof AdminApiError ? caught.message : "Unable to load commission rules.",
      );
    } finally {
      setRulesLoading(false);
    }
  }

  async function loadDistributions() {
    if (!canManage) return;
    setDistributionsLoading(true);
    try {
      setDistributions(await adminApi.commissionDistributions.list());
    } catch (caught) {
      setError(
        caught instanceof AdminApiError
          ? caught.message
          : "Unable to load commission distributions.",
      );
    } finally {
      setDistributionsLoading(false);
    }
  }

  async function refreshAll() {
    setError("");
    await Promise.all([loadRules(), loadDistributions()]);
  }

  useEffect(() => {
    if (!canManage) return;
    void Promise.all([loadRules(), loadDistributions()]);
  }, [canManage]);

  useEffect(() => {
    if (!rules.length) {
      setSelectedRuleId("");
      return;
    }
    if (selectedRuleId && rules.some((rule) => rule.id === selectedRuleId)) return;
    setSelectedRuleId(rules.find((rule) => rule.isActive)?.id || rules[0].id);
  }, [rules, selectedRuleId]);

  const visibleRules = useMemo(() => {
    const search = ruleQuery.trim().toLowerCase();
    return rules.filter((rule) => {
      if (ruleStatus === "ACTIVE" && !rule.isActive) return false;
      if (ruleStatus === "INACTIVE" && rule.isActive) return false;
      if (ruleRoleFilter !== "ALL" && rule.role !== ruleRoleFilter) return false;
      if (!search) return true;
      return `${rule.serviceType} ${rule.operator || ""} ${rule.role} ${rule.commissionType} ${rule.id}`
        .toLowerCase()
        .includes(search);
    });
  }, [rules, ruleQuery, ruleStatus, ruleRoleFilter]);

  const selectedRule = useMemo(
    () => rules.find((rule) => rule.id === selectedRuleId),
    [rules, selectedRuleId],
  );

  const selectedRuleDistributions = useMemo(
    () => distributions.filter((item) => item.commissionRuleId === selectedRuleId),
    [distributions, selectedRuleId],
  );

  const visibleDistributions = useMemo(() => {
    const search = distributionQuery.trim().toLowerCase();
    return selectedRuleDistributions.filter((item) => {
      if (distributionStatus === "ACTIVE" && !item.isActive) return false;
      if (distributionStatus === "INACTIVE" && item.isActive) return false;
      if (!search) return true;
      return `${item.recipientRole} ${item.distributionType} ${item.id}`
        .toLowerCase()
        .includes(search);
    });
  }, [selectedRuleDistributions, distributionQuery, distributionStatus]);

  const activeRuleCount = rules.filter((rule) => rule.isActive).length;
  const inactiveRuleCount = rules.length - activeRuleCount;
  const serviceCount = new Set(rules.map((rule) => rule.serviceType)).size;
  const activeSelectedDistributions = selectedRuleDistributions.filter((item) => item.isActive);
  const selectedTotals = activeTotals(activeSelectedDistributions);
  const health = useMemo(
    () => distributionHealth(selectedRule, activeSelectedDistributions),
    [selectedRule, activeSelectedDistributions],
  );

  function switchView(nextView: CommissionView) {
    void navigate({
      search: { view: nextView === "DISTRIBUTIONS" ? "distributions" : "rules" },
      replace: true,
    });
    setError("");
    setNotice("");
    setPendingRuleStatus(null);
    setPendingDistributionStatus(null);
    setRuleEditorOpen(false);
    setDistributionEditorOpen(false);
  }

  function startCreateRule() {
    if (!canCreateRule)
      return setError(`Permission ${UI_PERMISSION.COMMISSION_RULE_CREATE} is required.`);
    setEditingRuleId(null);
    setRuleDraft(emptyRuleDraft);
    setError("");
    setNotice("");
    setRuleEditorOpen(true);
  }

  async function startEditRule(rule: CommissionRule) {
    if (!canUpdateRule)
      return setError(`Permission ${UI_PERMISSION.COMMISSION_RULE_UPDATE} is required.`);
    setRuleEditorOpen(true);
    setEditingRuleId(rule.id);
    setRuleDraft(draftFromRule(rule));
    setLoadingRule(true);
    setError("");
    setNotice("");
    try {
      const fresh = await adminApi.commissionRules.get(rule.id);
      setRuleDraft(draftFromRule(fresh));
    } catch (caught) {
      setError(
        caught instanceof AdminApiError
          ? caught.message
          : "Unable to load the latest rule details.",
      );
    } finally {
      setLoadingRule(false);
    }
  }

  function validateRuleDraft() {
    const serviceType = normalizeCode(ruleDraft.serviceType);
    if (!serviceType) return "Service type is required.";
    if (!ruleDraft.role.trim()) return "Role is required.";

    if (!ruleDraft.commissionValue.trim()) return "Commission value is required.";
    const commissionValue = Number(ruleDraft.commissionValue);
    if (!Number.isFinite(commissionValue) || commissionValue < 0)
      return "Commission value must be 0 or more.";
    if (ruleDraft.commissionType === "PERCENTAGE" && commissionValue > 100) {
      return "Percentage commission cannot be more than 100%.";
    }

    const minAmount = numberOrUndefined(ruleDraft.minAmount);
    const maxAmount = numberOrUndefined(ruleDraft.maxAmount);
    if (minAmount !== undefined && (!Number.isFinite(minAmount) || minAmount < 0)) {
      return "Minimum amount must be 0 or more.";
    }
    if (maxAmount !== undefined && (!Number.isFinite(maxAmount) || maxAmount < 0)) {
      return "Maximum amount must be 0 or more.";
    }
    if (minAmount !== undefined && maxAmount !== undefined && minAmount > maxAmount) {
      return "Minimum amount cannot be greater than maximum amount.";
    }

    const priority = Number(ruleDraft.priority || 0);
    if (!Number.isInteger(priority)) return "Priority must be a whole number.";
    return null;
  }

  async function submitRule(event: FormEvent) {
    event.preventDefault();
    const required = editingRuleId
      ? UI_PERMISSION.COMMISSION_RULE_UPDATE
      : UI_PERMISSION.COMMISSION_RULE_CREATE;
    if (editingRuleId ? !canUpdateRule : !canCreateRule)
      return setError(`Permission ${required} is required.`);
    setError("");
    setNotice("");
    const validationError = validateRuleDraft();
    if (validationError) return setError(validationError);

    const minAmount = numberOrUndefined(ruleDraft.minAmount);
    const maxAmount = numberOrUndefined(ruleDraft.maxAmount);
    const operator = normalizeCode(ruleDraft.operator);
    const common = {
      serviceType: normalizeCode(ruleDraft.serviceType),
      role: normalizeCode(ruleDraft.role),
      commissionType: ruleDraft.commissionType,
      commissionValue: Number(ruleDraft.commissionValue),
      priority: Number(ruleDraft.priority || 0),
      isActive: ruleDraft.isActive,
    };

    setSaving(true);
    try {
      if (editingRuleId) {
        const body: UpdateCommissionRuleInput = {
          ...common,
          operator: operator || null,
          minAmount: minAmount ?? null,
          maxAmount: maxAmount ?? null,
        };
        await adminApi.commissionRules.update(editingRuleId, body);
        setNotice("Commission rule updated successfully.");
      } else {
        const body: CreateCommissionRuleInput = {
          ...common,
          ...(operator ? { operator } : {}),
          ...(minAmount !== undefined ? { minAmount } : {}),
          ...(maxAmount !== undefined ? { maxAmount } : {}),
        };
        await adminApi.commissionRules.create(body);
        setNotice("Commission rule created successfully.");
      }
      setRuleEditorOpen(false);
      setEditingRuleId(null);
      setRuleDraft(emptyRuleDraft);
      await loadRules();
    } catch (caught) {
      setError(
        caught instanceof AdminApiError ? caught.message : "Unable to save the commission rule.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function confirmRuleStatusChange() {
    if (!pendingRuleStatus) return;
    const { rule, nextActive } = pendingRuleStatus;
    if (nextActive ? !canUpdateRule : !canDeactivateRule)
      return setError(
        `Permission ${nextActive ? UI_PERMISSION.COMMISSION_RULE_UPDATE : UI_PERMISSION.COMMISSION_RULE_DEACTIVATE} is required.`,
      );
    setSaving(true);
    setError("");
    setNotice("");
    try {
      if (nextActive) {
        await adminApi.commissionRules.update(rule.id, { isActive: true });
        setNotice("Commission rule reactivated successfully.");
      } else {
        await adminApi.commissionRules.deactivate(rule.id);
        setNotice("Commission rule deactivated. Historical commission links remain preserved.");
      }
      setRules((current) =>
        current.map((item) => (item.id === rule.id ? { ...item, isActive: nextActive } : item)),
      );
      setPendingRuleStatus(null);
    } catch (caught) {
      setError(
        caught instanceof AdminApiError ? caught.message : "Unable to change the rule status.",
      );
    } finally {
      setSaving(false);
    }
  }

  function startCreateDistribution() {
    if (!canCreateDistribution)
      return setError(`Permission ${UI_PERMISSION.COMMISSION_DISTRIBUTION_CREATE} is required.`);
    if (!selectedRuleId) {
      setError("Create a commission rule first, then select it before adding a distribution.");
      return;
    }
    setEditingDistributionId(null);
    setDistributionDraft({ ...emptyDistributionDraft, commissionRuleId: selectedRuleId });
    setError("");
    setNotice("");
    setDistributionEditorOpen(true);
  }

  async function startEditDistribution(distribution: CommissionDistribution) {
    if (!canUpdateDistribution)
      return setError(`Permission ${UI_PERMISSION.COMMISSION_DISTRIBUTION_UPDATE} is required.`);
    setDistributionEditorOpen(true);
    setEditingDistributionId(distribution.id);
    setDistributionDraft(draftFromDistribution(distribution));
    setLoadingDistribution(true);
    setError("");
    setNotice("");
    try {
      const fresh = await adminApi.commissionDistributions.get(distribution.id);
      setDistributionDraft(draftFromDistribution(fresh));
      setSelectedRuleId(fresh.commissionRuleId);
    } catch (caught) {
      setError(
        caught instanceof AdminApiError
          ? caught.message
          : "Unable to load the latest distribution details.",
      );
    } finally {
      setLoadingDistribution(false);
    }
  }

  function proposedDistributionHealth(draft: DistributionDraft, editingId?: string | null) {
    const rule = rules.find((item) => item.id === draft.commissionRuleId);
    if (!rule) return distributionHealth(undefined, []);

    const base = distributions.filter(
      (item) => item.commissionRuleId === draft.commissionRuleId && item.id !== editingId,
    );
    if (!draft.isActive)
      return distributionHealth(
        rule,
        base.filter((item) => item.isActive),
      );

    const proposed: CommissionDistribution = {
      id: editingId || "__PROPOSED__",
      commissionRuleId: draft.commissionRuleId,
      recipientRole: normalizeCode(draft.recipientRole),
      distributionType: draft.distributionType,
      distributionValue: Number(draft.distributionValue),
      priority: Number(draft.priority || 0),
      isActive: true,
    };
    return distributionHealth(rule, [...base.filter((item) => item.isActive), proposed]);
  }

  function validateDistributionDraft() {
    if (!distributionDraft.commissionRuleId.trim()) return "Commission rule is required.";
    if (!normalizeCode(distributionDraft.recipientRole)) return "Recipient role is required.";

    if (!distributionDraft.distributionValue.trim()) return "Distribution value is required.";
    const value = Number(distributionDraft.distributionValue);
    if (!Number.isFinite(value) || value < 0) return "Distribution value must be 0 or more.";
    if (distributionDraft.distributionType === "PERCENTAGE" && value > 100) {
      return "Percentage distribution cannot be more than 100%.";
    }

    const priority = Number(distributionDraft.priority || 0);
    if (!Number.isInteger(priority)) return "Priority must be a whole number.";

    const recipientRole = normalizeCode(distributionDraft.recipientRole);
    const duplicate = distributions.find(
      (item) =>
        item.commissionRuleId === distributionDraft.commissionRuleId &&
        normalizeCode(item.recipientRole) === recipientRole &&
        item.id !== editingDistributionId,
    );
    if (duplicate) {
      return duplicate.isActive
        ? `This rule already has an active ${recipientRole} distribution. Edit that row instead.`
        : `This rule already has an inactive ${recipientRole} distribution. Reactivate or edit that row instead of creating a duplicate.`;
    }

    const proposedHealth = proposedDistributionHealth(distributionDraft, editingDistributionId);
    if (distributionDraft.isActive && proposedHealth.tone === "danger") {
      return `This active setup would over-allocate the commission pool. ${proposedHealth.detail}`;
    }

    return null;
  }

  async function submitDistribution(event: FormEvent) {
    event.preventDefault();
    const required = editingDistributionId
      ? UI_PERMISSION.COMMISSION_DISTRIBUTION_UPDATE
      : UI_PERMISSION.COMMISSION_DISTRIBUTION_CREATE;
    if (editingDistributionId ? !canUpdateDistribution : !canCreateDistribution)
      return setError(`Permission ${required} is required.`);
    setError("");
    setNotice("");
    const validationError = validateDistributionDraft();
    if (validationError) return setError(validationError);

    const common = {
      recipientRole: normalizeCode(distributionDraft.recipientRole),
      distributionType: distributionDraft.distributionType,
      distributionValue: Number(distributionDraft.distributionValue),
      priority: Number(distributionDraft.priority || 0),
      isActive: distributionDraft.isActive,
    };

    setSaving(true);
    try {
      if (editingDistributionId) {
        const body: UpdateCommissionDistributionInput = common;
        await adminApi.commissionDistributions.update(editingDistributionId, body);
        setNotice("Commission distribution updated successfully.");
      } else {
        const body: CreateCommissionDistributionInput = {
          commissionRuleId: distributionDraft.commissionRuleId,
          ...common,
        };
        await adminApi.commissionDistributions.create(body);
        setNotice("Commission distribution created successfully.");
      }
      setSelectedRuleId(distributionDraft.commissionRuleId);
      setDistributionEditorOpen(false);
      setEditingDistributionId(null);
      setDistributionDraft(emptyDistributionDraft);
      await loadDistributions();
    } catch (caught) {
      setError(
        caught instanceof AdminApiError
          ? caught.message
          : "Unable to save the commission distribution.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function confirmDistributionStatusChange() {
    if (!pendingDistributionStatus) return;
    const { distribution, nextActive } = pendingDistributionStatus;
    if (nextActive ? !canUpdateDistribution : !canDeactivateDistribution)
      return setError(
        `Permission ${nextActive ? UI_PERMISSION.COMMISSION_DISTRIBUTION_UPDATE : UI_PERMISSION.COMMISSION_DISTRIBUTION_DEACTIVATE} is required.`,
      );
    setError("");
    setNotice("");

    if (nextActive) {
      const nextDraft = draftFromDistribution({ ...distribution, isActive: true });
      const nextHealth = proposedDistributionHealth(nextDraft, distribution.id);
      if (nextHealth.tone === "danger") {
        setPendingDistributionStatus(null);
        setError(`Cannot reactivate this share yet. ${nextHealth.detail}`);
        return;
      }
    }

    setSaving(true);
    try {
      if (nextActive) {
        await adminApi.commissionDistributions.update(distribution.id, { isActive: true });
        setNotice("Commission distribution reactivated successfully.");
      } else {
        await adminApi.commissionDistributions.deactivate(distribution.id);
        setNotice(
          "Commission distribution deactivated. Historical allocation records remain safe.",
        );
      }
      setDistributions((current) =>
        current.map((item) =>
          item.id === distribution.id ? { ...item, isActive: nextActive } : item,
        ),
      );
      setPendingDistributionStatus(null);
    } catch (caught) {
      setError(
        caught instanceof AdminApiError
          ? caught.message
          : "Unable to change the distribution status.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (!canManage) {
    return (
      <AdminLayout
        active="commissions"
        eyebrow="Pricing"
        title="Commission setup"
        description="Global commission rules and distributions are restricted to Admin and Super Admin accounts."
      >
        <AdminPanel>
          <div className="flex gap-3 rounded-xl bg-amber-50 p-4 text-amber-900">
            <ShieldAlert size={20} className="mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-black">
                Global commission editing is not available for {actor?.role || "this role"}.
              </p>
              <p className="mt-1 text-xs leading-5">
                Distributor and Master Distributor pages should show their scoped commission data.
                They should not change the global rule engine.
              </p>
            </div>
          </div>
        </AdminPanel>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout
      active="commissions"
      eyebrow="Pricing"
      title="Commission setup"
      description="Manage the commission pool rules and the hierarchy shares paid from each matched rule."
    >
      <div className="inline-flex rounded-xl border border-border bg-white p-1">
        <button
          type="button"
          onClick={() => switchView("RULES")}
          className={`rounded-lg px-4 py-2.5 text-xs font-extrabold transition ${
            view === "RULES" ? "bg-secondary text-white" : "text-muted-foreground hover:bg-muted"
          }`}
        >
          Commission Rules
        </button>
        <button
          type="button"
          onClick={() => switchView("DISTRIBUTIONS")}
          className={`rounded-lg px-4 py-2.5 text-xs font-extrabold transition ${
            view === "DISTRIBUTIONS"
              ? "bg-secondary text-white"
              : "text-muted-foreground hover:bg-muted"
          }`}
        >
          Distribution Setup
        </button>
        <Link
          to="/admin/commissions/hierarchy"
          className="rounded-lg px-4 py-2.5 text-xs font-extrabold text-muted-foreground transition hover:bg-muted"
        >
          Hierarchy
        </Link>
      </div>

      <CommissionCalculator />

      {view === "RULES" ? (
        <div className="mt-5 grid gap-4 md:grid-cols-4">
          <Summary icon={SlidersHorizontal} label="Total rules" value={rules.length} />
          <Summary icon={CheckCircle2} label="Active" value={activeRuleCount} tone="good" />
          <Summary icon={X} label="Inactive" value={inactiveRuleCount} />
          <Summary icon={Percent} label="Services" value={serviceCount} />
        </div>
      ) : (
        <div className="mt-5 grid gap-4 md:grid-cols-4">
          <Summary
            icon={UsersRound}
            label="Recipients"
            value={activeSelectedDistributions.length}
          />
          <MetricSummary
            icon={Percent}
            label="Percentage shares"
            value={`${selectedTotals.percentage.toFixed(2)}%`}
          />
          <MetricSummary
            icon={IndianRupee}
            label="Fixed shares"
            value={money(selectedTotals.fixed)}
          />
          <MetricSummary
            icon={Layers3}
            label="Rule status"
            value={selectedRule?.isActive ? "ACTIVE" : selectedRule ? "INACTIVE" : "—"}
          />
        </div>
      )}

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

      {view === "RULES" && pendingRuleStatus && (
        <AdminPanel className="mt-5 border-amber-200 bg-amber-50/60">
          <p className="text-sm font-black text-secondary">
            {pendingRuleStatus.nextActive ? "Reactivate" : "Deactivate"} this commission rule?
          </p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {pendingRuleStatus.rule.serviceType} · {pendingRuleStatus.rule.role} ·{" "}
            {pendingRuleStatus.rule.operator || "Any operator"} ·{" "}
            {money(pendingRuleStatus.rule.minAmount)} to {money(pendingRuleStatus.rule.maxAmount)}
          </p>
          <p className="mt-2 text-xs leading-5 text-amber-900">
            {pendingRuleStatus.nextActive
              ? "The rule will become eligible for matching again."
              : "The backend soft-deactivates the rule. Old commission records keep their rule link."}
          </p>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={() => setPendingRuleStatus(null)}
              className="rounded-xl border border-border bg-white px-4 py-2 text-xs font-extrabold text-secondary disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => void confirmRuleStatusChange()}
              className="inline-flex items-center gap-2 rounded-xl bg-secondary px-4 py-2 text-xs font-extrabold text-white disabled:opacity-50"
            >
              {saving && <Loader2 size={14} className="animate-spin" />} Confirm
            </button>
          </div>
        </AdminPanel>
      )}

      {view === "DISTRIBUTIONS" && pendingDistributionStatus && (
        <AdminPanel className="mt-5 border-amber-200 bg-amber-50/60">
          <p className="text-sm font-black text-secondary">
            {pendingDistributionStatus.nextActive ? "Reactivate" : "Deactivate"} this distribution?
          </p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {pendingDistributionStatus.distribution.recipientRole} ·{" "}
            {distributionRate(pendingDistributionStatus.distribution)} · Priority{" "}
            {pendingDistributionStatus.distribution.priority}
          </p>
          <p className="mt-2 text-xs leading-5 text-amber-900">
            {pendingDistributionStatus.nextActive
              ? "The recipient role will be used again when this rule matches and an eligible hierarchy user exists."
              : "The DELETE endpoint is a soft deactivation. Old distribution transactions keep their historical link."}
          </p>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={() => setPendingDistributionStatus(null)}
              className="rounded-xl border border-border bg-white px-4 py-2 text-xs font-extrabold text-secondary disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => void confirmDistributionStatusChange()}
              className="inline-flex items-center gap-2 rounded-xl bg-secondary px-4 py-2 text-xs font-extrabold text-white disabled:opacity-50"
            >
              {saving && <Loader2 size={14} className="animate-spin" />} Confirm
            </button>
          </div>
        </AdminPanel>
      )}

      {view === "RULES" && ruleEditorOpen && (
        <AdminPanel className="mt-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-wider text-primary">
                {editingRuleId ? "Edit rule" : "New rule"}
              </p>
              <h2 className="mt-1 text-xl font-black">
                {editingRuleId ? "Update commission rule" : "Create commission rule"}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Service, operator and role codes are normalized to uppercase by the backend.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setRuleEditorOpen(false);
                setEditingRuleId(null);
                setRuleDraft(emptyRuleDraft);
              }}
              aria-label="Close rule editor"
              className="grid h-9 w-9 place-items-center rounded-xl border border-border text-muted-foreground hover:bg-muted"
            >
              <X size={16} />
            </button>
          </div>

          {loadingRule ? (
            <div className="mt-6 flex items-center gap-2 rounded-xl bg-muted p-4 text-sm font-semibold text-muted-foreground">
              <Loader2 size={16} className="animate-spin" /> Loading latest rule…
            </div>
          ) : (
            <form onSubmit={submitRule} className="mt-6 space-y-5">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <Field label="Service type *" hint="Example: AEPS or ADD_MONEY">
                  <input
                    value={ruleDraft.serviceType}
                    onChange={(event) =>
                      setRuleDraft((current) => ({ ...current, serviceType: event.target.value }))
                    }
                    placeholder="AEPS"
                    list="commission-services"
                    className={inputClass}
                  />
                  <datalist id="commission-services">
                    <option value="AEPS" />
                    <option value="ADD_MONEY" />
                    <option value="AEPS_CASH_DEPOSIT_COMPENSATION" />
                  </datalist>
                </Field>
                <Field label="Operator / provider" hint="Optional. Leave blank for any operator.">
                  <input
                    value={ruleDraft.operator}
                    onChange={(event) =>
                      setRuleDraft((current) => ({ ...current, operator: event.target.value }))
                    }
                    placeholder="VIMOPAY"
                    list="commission-operators"
                    className={inputClass}
                  />
                  <datalist id="commission-operators">
                    <option value="VIMOPAY" />
                  </datalist>
                </Field>
                <Field label="Source role *" hint="Role whose transaction matches this rule.">
                  <select
                    value={ruleDraft.role}
                    onChange={(event) =>
                      setRuleDraft((current) => ({ ...current, role: event.target.value }))
                    }
                    className={inputClass}
                  >
                    <option value="RETAILER">RETAILER</option>
                    <option value="DISTRIBUTOR">DISTRIBUTOR</option>
                    <option value="MASTER_DISTRIBUTOR">MASTER_DISTRIBUTOR</option>
                  </select>
                </Field>
                <Field
                  label="Priority"
                  hint="Higher priority is evaluated first among matching rules."
                >
                  <input
                    type="number"
                    step="1"
                    value={ruleDraft.priority}
                    onChange={(event) =>
                      setRuleDraft((current) => ({ ...current, priority: event.target.value }))
                    }
                    className={inputClass}
                  />
                </Field>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <Field label="Commission type *">
                  <select
                    value={ruleDraft.commissionType}
                    onChange={(event) =>
                      setRuleDraft((current) => ({
                        ...current,
                        commissionType: event.target.value as CommissionRuleType,
                      }))
                    }
                    className={inputClass}
                  >
                    <option value="FIXED">FIXED</option>
                    <option value="PERCENTAGE">PERCENTAGE</option>
                  </select>
                </Field>
                <Field
                  label={
                    ruleDraft.commissionType === "PERCENTAGE"
                      ? "Commission % *"
                      : "Commission amount *"
                  }
                  hint={
                    ruleDraft.commissionType === "PERCENTAGE"
                      ? "0 to 100"
                      : "Amount cannot be negative."
                  }
                >
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground">
                      {ruleDraft.commissionType === "PERCENTAGE" ? "%" : "₹"}
                    </span>
                    <input
                      type="number"
                      min="0"
                      max={ruleDraft.commissionType === "PERCENTAGE" ? "100" : undefined}
                      step="0.0001"
                      value={ruleDraft.commissionValue}
                      onChange={(event) =>
                        setRuleDraft((current) => ({
                          ...current,
                          commissionValue: event.target.value,
                        }))
                      }
                      className={`${inputClass} pl-9`}
                    />
                  </div>
                </Field>
                <Field label="Minimum transaction amount" hint="Blank means no lower limit.">
                  <div className="relative">
                    <IndianRupee
                      size={14}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                    />
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={ruleDraft.minAmount}
                      onChange={(event) =>
                        setRuleDraft((current) => ({ ...current, minAmount: event.target.value }))
                      }
                      className={`${inputClass} pl-9`}
                    />
                  </div>
                </Field>
                <Field label="Maximum transaction amount" hint="Blank means no upper limit.">
                  <div className="relative">
                    <IndianRupee
                      size={14}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                    />
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={ruleDraft.maxAmount}
                      onChange={(event) =>
                        setRuleDraft((current) => ({ ...current, maxAmount: event.target.value }))
                      }
                      className={`${inputClass} pl-9`}
                    />
                  </div>
                </Field>
              </div>

              <label className="flex w-fit cursor-pointer items-center gap-3 rounded-xl border border-border px-4 py-3 text-sm font-bold text-secondary">
                <input
                  type="checkbox"
                  checked={ruleDraft.isActive}
                  onChange={(event) =>
                    setRuleDraft((current) => ({ ...current, isActive: event.target.checked }))
                  }
                  className="h-4 w-4 accent-primary"
                />
                Rule is active
              </label>

              <div className="flex flex-wrap gap-3 border-t border-border pt-5">
                <button
                  type="button"
                  onClick={() => {
                    setRuleEditorOpen(false);
                    setEditingRuleId(null);
                    setRuleDraft(emptyRuleDraft);
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
                  {saving ? "Saving…" : editingRuleId ? "Save changes" : "Create rule"}
                </button>
              </div>
            </form>
          )}
        </AdminPanel>
      )}

      {view === "RULES" && (
        <AdminPanel className="mt-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h2 className="text-xl font-black">Configured rules</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {visibleRules.length} of {rules.length} rule{rules.length === 1 ? "" : "s"} shown.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <label className="flex min-w-0 items-center gap-2 rounded-xl border border-border px-3 py-2.5 sm:w-72">
                <Search size={15} className="text-muted-foreground" />
                <input
                  value={ruleQuery}
                  onChange={(event) => setRuleQuery(event.target.value)}
                  placeholder="Search service, operator, role…"
                  className="min-w-0 flex-1 bg-transparent text-xs outline-none"
                />
              </label>
              <Select
                value={ruleStatus}
                onChange={(value) => setRuleStatus(value as typeof ruleStatus)}
                options={["ALL", "ACTIVE", "INACTIVE"]}
              />
              <Select
                value={ruleRoleFilter}
                onChange={setRuleRoleFilter}
                options={["ALL", "RETAILER", "DISTRIBUTOR", "MASTER_DISTRIBUTOR"]}
              />
              <button
                type="button"
                onClick={() => void refreshAll()}
                disabled={rulesLoading || distributionsLoading}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-border px-4 py-2.5 text-xs font-extrabold text-secondary hover:bg-muted disabled:opacity-50"
              >
                <RefreshCw
                  size={14}
                  className={rulesLoading || distributionsLoading ? "animate-spin" : ""}
                />{" "}
                Refresh
              </button>
              <button
                type="button"
                onClick={startCreateRule}
                disabled={!canCreateRule}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-extrabold text-white"
              >
                <Plus size={14} /> New rule
              </button>
            </div>
          </div>

          {rulesLoading && !rules.length ? (
            <LoadingBox text="Loading commission rules…" />
          ) : (
            <div className="mt-6 overflow-x-auto rounded-xl border border-border">
              <table className="min-w-[1050px] w-full text-left text-xs">
                <thead className="bg-muted/70 text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Service / operator</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Slab</th>
                    <th className="px-4 py-3">Commission pool</th>
                    <th className="px-4 py-3">Distributions</th>
                    <th className="px-4 py-3">Priority</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {visibleRules.map((rule) => {
                    const linked = distributions.filter(
                      (item) => item.commissionRuleId === rule.id,
                    );
                    const activeLinked = linked.filter((item) => item.isActive).length;
                    return (
                      <tr key={rule.id} className="bg-white align-top hover:bg-muted/25">
                        <td className="px-4 py-4">
                          <p className="font-black text-secondary">{rule.serviceType}</p>
                          <p className="mt-1 text-[11px] text-muted-foreground">
                            {rule.operator || "Any operator"}
                          </p>
                          <p
                            className="mt-2 max-w-48 truncate font-mono text-[9px] text-muted-foreground"
                            title={rule.id}
                          >
                            {rule.id}
                          </p>
                        </td>
                        <td className="px-4 py-4 font-extrabold text-secondary">{rule.role}</td>
                        <td className="px-4 py-4">
                          <p className="font-bold text-secondary">
                            {money(rule.minAmount)} → {money(rule.maxAmount)}
                          </p>
                        </td>
                        <td className="px-4 py-4">
                          <p className="font-black text-secondary">{ruleRate(rule)}</p>
                          <p className="mt-1 text-[10px] text-muted-foreground">
                            {rule.commissionType}
                          </p>
                        </td>
                        <td className="px-4 py-4">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedRuleId(rule.id);
                              switchView("DISTRIBUTIONS");
                            }}
                            className="rounded-lg border border-border px-3 py-2 font-extrabold text-secondary hover:bg-muted"
                          >
                            {activeLinked} active / {linked.length} total
                          </button>
                        </td>
                        <td className="px-4 py-4 font-black text-secondary">{rule.priority}</td>
                        <td className="px-4 py-4">
                          <StatusPill active={rule.isActive} />
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              disabled={!canUpdateRule}
                              onClick={() => void startEditRule(rule)}
                              className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-2 font-extrabold text-secondary hover:bg-muted"
                            >
                              <Edit3 size={12} /> Edit
                            </button>
                            <button
                              type="button"
                              disabled={rule.isActive ? !canDeactivateRule : !canUpdateRule}
                              onClick={() =>
                                setPendingRuleStatus({ rule, nextActive: !rule.isActive })
                              }
                              className={`rounded-lg border px-3 py-2 font-extrabold ${
                                rule.isActive
                                  ? "border-amber-200 text-amber-800 hover:bg-amber-50"
                                  : "border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                              }`}
                            >
                              {rule.isActive ? "Deactivate" : "Reactivate"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {!visibleRules.length && (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-4 py-12 text-center text-sm text-muted-foreground"
                      >
                        No commission rules match the current filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </AdminPanel>
      )}

      {view === "DISTRIBUTIONS" && (
        <>
          <AdminPanel className="mt-5">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-extrabold uppercase tracking-wider text-primary">
                  Distribution rule
                </p>
                <h2 className="mt-1 text-xl font-black">Choose the commission pool to split</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Each recipient role can have one distribution configuration per commission rule.
                </p>
                <div className="mt-4 max-w-3xl">
                  <Field
                    label="Commission rule *"
                    hint="Distributions run only when this rule wins the commission match."
                  >
                    <select
                      value={selectedRuleId}
                      onChange={(event) => {
                        setSelectedRuleId(event.target.value);
                        setDistributionEditorOpen(false);
                        setPendingDistributionStatus(null);
                        setError("");
                        setNotice("");
                      }}
                      className={inputClass}
                      disabled={!rules.length}
                    >
                      {!rules.length && <option value="">No commission rules found</option>}
                      {rules.map((rule) => (
                        <option key={rule.id} value={rule.id}>
                          {rule.isActive ? "ACTIVE" : "INACTIVE"} · {rule.serviceType} ·{" "}
                          {rule.operator || "ANY"} · {rule.role} · {ruleRate(rule)} ·{" "}
                          {money(rule.minAmount)} to {money(rule.maxAmount)}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => void refreshAll()}
                  disabled={rulesLoading || distributionsLoading}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-border px-4 py-2.5 text-xs font-extrabold text-secondary hover:bg-muted disabled:opacity-50"
                >
                  <RefreshCw
                    size={14}
                    className={rulesLoading || distributionsLoading ? "animate-spin" : ""}
                  />{" "}
                  Refresh
                </button>
                <button
                  type="button"
                  onClick={startCreateDistribution}
                  disabled={!canCreateDistribution || !selectedRuleId}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Plus size={14} /> New distribution
                </button>
              </div>
            </div>

            {selectedRule && (
              <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <InfoBox
                  label="Service / provider"
                  value={`${selectedRule.serviceType} · ${selectedRule.operator || "Any operator"}`}
                />
                <InfoBox label="Source role" value={selectedRule.role} />
                <InfoBox
                  label="Commission pool"
                  value={`${ruleRate(selectedRule)} · ${selectedRule.commissionType}`}
                />
                <InfoBox
                  label="Transaction slab"
                  value={`${money(selectedRule.minAmount)} → ${money(selectedRule.maxAmount)}`}
                />
              </div>
            )}

            <div className="mt-5 rounded-xl bg-muted/60 p-4 text-xs leading-5 text-muted-foreground">
              <strong className="text-secondary">How this backend flow works:</strong> PERCENTAGE
              distributions are calculated from the matched <strong>commission pool</strong>, not
              from the gross transaction. Active distributions run by priority. If the matching
              hierarchy user is missing or not eligible, that share is skipped and stays in the
              source merchant's remainder. The backend also rejects any real execution that would
              allocate more than the full commission pool.
            </div>
          </AdminPanel>

          {selectedRule && (
            <div
              className={`mt-5 rounded-xl border p-4 ${health.tone === "good" ? "border-emerald-200 bg-emerald-50" : health.tone === "danger" ? "border-red-200 bg-red-50" : "border-amber-200 bg-amber-50"}`}
            >
              <p
                className={`text-sm font-black ${health.tone === "good" ? "text-emerald-800" : health.tone === "danger" ? "text-red-800" : "text-amber-900"}`}
              >
                {health.title}
              </p>
              <p
                className={`mt-1 text-xs leading-5 ${health.tone === "good" ? "text-emerald-700" : health.tone === "danger" ? "text-red-700" : "text-amber-800"}`}
              >
                {health.detail}
              </p>
              {!selectedRule.isActive && (
                <p className="mt-2 text-xs font-bold text-amber-900">
                  This commission rule is INACTIVE, so its distributions will not run until the rule
                  is reactivated.
                </p>
              )}
            </div>
          )}

          {distributionEditorOpen && (
            <AdminPanel className="mt-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-wider text-primary">
                    {editingDistributionId ? "Edit distribution" : "New distribution"}
                  </p>
                  <h2 className="mt-1 text-xl font-black">
                    {editingDistributionId ? "Update hierarchy share" : "Add a hierarchy share"}
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    A new distribution needs a valid ACTIVE recipient role. Reactivating an existing
                    distribution also requires the role to be active.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setDistributionEditorOpen(false);
                    setEditingDistributionId(null);
                    setDistributionDraft(emptyDistributionDraft);
                  }}
                  aria-label="Close distribution editor"
                  className="grid h-9 w-9 place-items-center rounded-xl border border-border text-muted-foreground hover:bg-muted"
                >
                  <X size={16} />
                </button>
              </div>

              {loadingDistribution ? (
                <div className="mt-6 flex items-center gap-2 rounded-xl bg-muted p-4 text-sm font-semibold text-muted-foreground">
                  <Loader2 size={16} className="animate-spin" /> Loading latest distribution…
                </div>
              ) : (
                <form onSubmit={submitDistribution} className="mt-6 space-y-5">
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                    <div className="xl:col-span-2">
                      <Field
                        label="Commission rule *"
                        hint={
                          editingDistributionId
                            ? "A distribution cannot be moved to another rule. Create a new one instead."
                            : "Choose the commission pool that this share belongs to."
                        }
                      >
                        <select
                          value={distributionDraft.commissionRuleId}
                          onChange={(event) =>
                            setDistributionDraft((current) => ({
                              ...current,
                              commissionRuleId: event.target.value,
                            }))
                          }
                          className={inputClass}
                          disabled={Boolean(editingDistributionId)}
                        >
                          {rules.map((rule) => (
                            <option key={rule.id} value={rule.id}>
                              {rule.serviceType} · {rule.operator || "ANY"} · {rule.role} ·{" "}
                              {ruleRate(rule)}
                            </option>
                          ))}
                        </select>
                      </Field>
                    </div>
                    <Field
                      label="Recipient role *"
                      hint="One config per recipient role per rule. Custom active role codes are supported."
                    >
                      <input
                        value={distributionDraft.recipientRole}
                        onChange={(event) =>
                          setDistributionDraft((current) => ({
                            ...current,
                            recipientRole: event.target.value,
                          }))
                        }
                        placeholder="DISTRIBUTOR"
                        list="commission-recipient-roles"
                        className={inputClass}
                      />
                      <datalist id="commission-recipient-roles">
                        <option value="RETAILER" />
                        <option value="DISTRIBUTOR" />
                        <option value="MASTER_DISTRIBUTOR" />
                      </datalist>
                    </Field>
                    <Field
                      label="Distribution type *"
                      hint="PERCENTAGE means percentage of commission pool."
                    >
                      <select
                        value={distributionDraft.distributionType}
                        onChange={(event) =>
                          setDistributionDraft((current) => ({
                            ...current,
                            distributionType: event.target.value as CommissionDistributionType,
                          }))
                        }
                        className={inputClass}
                      >
                        <option value="FIXED">FIXED</option>
                        <option value="PERCENTAGE">PERCENTAGE</option>
                      </select>
                    </Field>
                    <Field label="Priority" hint="Higher priority is processed first.">
                      <input
                        type="number"
                        step="1"
                        value={distributionDraft.priority}
                        onChange={(event) =>
                          setDistributionDraft((current) => ({
                            ...current,
                            priority: event.target.value,
                          }))
                        }
                        className={inputClass}
                      />
                    </Field>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <Field
                      label={
                        distributionDraft.distributionType === "PERCENTAGE"
                          ? "Share of commission pool *"
                          : "Fixed share from commission pool *"
                      }
                      hint={
                        distributionDraft.distributionType === "PERCENTAGE"
                          ? "0 to 100. This is not a percentage of the gross transaction."
                          : "The backend will reject execution if total active shares become larger than the actual commission pool."
                      }
                    >
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground">
                          {distributionDraft.distributionType === "PERCENTAGE" ? "%" : "₹"}
                        </span>
                        <input
                          type="number"
                          min="0"
                          max={
                            distributionDraft.distributionType === "PERCENTAGE" ? "100" : undefined
                          }
                          step="0.0001"
                          value={distributionDraft.distributionValue}
                          onChange={(event) =>
                            setDistributionDraft((current) => ({
                              ...current,
                              distributionValue: event.target.value,
                            }))
                          }
                          className={`${inputClass} pl-9`}
                        />
                      </div>
                    </Field>
                    <div className="flex items-end">
                      <label className="flex w-full cursor-pointer items-center gap-3 rounded-xl border border-border px-4 py-3 text-sm font-bold text-secondary">
                        <input
                          type="checkbox"
                          checked={distributionDraft.isActive}
                          onChange={(event) =>
                            setDistributionDraft((current) => ({
                              ...current,
                              isActive: event.target.checked,
                            }))
                          }
                          className="h-4 w-4 accent-primary"
                        />
                        Distribution is active
                      </label>
                    </div>
                  </div>

                  {distributionDraft.commissionRuleId &&
                    distributionDraft.distributionValue.trim() && (
                      <DraftHealth
                        health={proposedDistributionHealth(
                          distributionDraft,
                          editingDistributionId,
                        )}
                      />
                    )}

                  <div className="flex flex-wrap gap-3 border-t border-border pt-5">
                    <button
                      type="button"
                      onClick={() => {
                        setDistributionEditorOpen(false);
                        setEditingDistributionId(null);
                        setDistributionDraft(emptyDistributionDraft);
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
                      ) : editingDistributionId ? (
                        <Edit3 size={15} />
                      ) : (
                        <Plus size={15} />
                      )}
                      {saving
                        ? "Saving…"
                        : editingDistributionId
                          ? "Save distribution"
                          : "Create distribution"}
                    </button>
                  </div>
                </form>
              )}
            </AdminPanel>
          )}

          <AdminPanel className="mt-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <h2 className="text-xl font-black">Recipient distributions</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {selectedRule
                    ? `${visibleDistributions.length} of ${selectedRuleDistributions.length} distribution${selectedRuleDistributions.length === 1 ? "" : "s"} shown for the selected rule.`
                    : "Select a commission rule first."}
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                <label className="flex min-w-0 items-center gap-2 rounded-xl border border-border px-3 py-2.5 sm:w-72">
                  <Search size={15} className="text-muted-foreground" />
                  <input
                    value={distributionQuery}
                    onChange={(event) => setDistributionQuery(event.target.value)}
                    placeholder="Search recipient role…"
                    className="min-w-0 flex-1 bg-transparent text-xs outline-none"
                  />
                </label>
                <Select
                  value={distributionStatus}
                  onChange={(value) => setDistributionStatus(value as typeof distributionStatus)}
                  options={["ALL", "ACTIVE", "INACTIVE"]}
                />
              </div>
            </div>

            {distributionsLoading && !distributions.length ? (
              <LoadingBox text="Loading commission distributions…" />
            ) : (
              <div className="mt-6 overflow-x-auto rounded-xl border border-border">
                <table className="min-w-[900px] w-full text-left text-xs">
                  <thead className="bg-muted/70 text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3">Recipient role</th>
                      <th className="px-4 py-3">Share</th>
                      <th className="px-4 py-3">Priority</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Updated</th>
                      <th className="px-4 py-3">Distribution ID</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {visibleDistributions.map((distribution) => (
                      <tr key={distribution.id} className="bg-white align-top hover:bg-muted/25">
                        <td className="px-4 py-4">
                          <p className="font-black text-secondary">{distribution.recipientRole}</p>
                          {selectedRule?.role === distribution.recipientRole && (
                            <p className="mt-1 text-[10px] font-bold text-amber-700">
                              Same as source role
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <p className="font-black text-secondary">
                            {distributionRate(distribution)}
                          </p>
                          <p className="mt-1 text-[10px] text-muted-foreground">
                            {distribution.distributionType}
                          </p>
                        </td>
                        <td className="px-4 py-4 font-black text-secondary">
                          {distribution.priority}
                        </td>
                        <td className="px-4 py-4">
                          <StatusPill active={distribution.isActive} />
                        </td>
                        <td className="px-4 py-4 text-[11px] text-muted-foreground">
                          {dateTime(distribution.updatedAt || distribution.createdAt)}
                        </td>
                        <td className="px-4 py-4">
                          <p
                            className="max-w-52 truncate font-mono text-[9px] text-muted-foreground"
                            title={distribution.id}
                          >
                            {distribution.id}
                          </p>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              disabled={!canUpdateDistribution}
                              onClick={() => void startEditDistribution(distribution)}
                              className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-2 font-extrabold text-secondary hover:bg-muted"
                            >
                              <Edit3 size={12} /> Edit
                            </button>
                            <button
                              type="button"
                              disabled={
                                distribution.isActive
                                  ? !canDeactivateDistribution
                                  : !canUpdateDistribution
                              }
                              onClick={() =>
                                setPendingDistributionStatus({
                                  distribution,
                                  nextActive: !distribution.isActive,
                                })
                              }
                              className={`rounded-lg border px-3 py-2 font-extrabold ${
                                distribution.isActive
                                  ? "border-amber-200 text-amber-800 hover:bg-amber-50"
                                  : "border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                              }`}
                            >
                              {distribution.isActive ? "Deactivate" : "Reactivate"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {!visibleDistributions.length && (
                      <tr>
                        <td
                          colSpan={7}
                          className="px-4 py-12 text-center text-sm text-muted-foreground"
                        >
                          {selectedRule
                            ? "No distributions match the current filters for this rule."
                            : "Create a commission rule before adding distributions."}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </AdminPanel>
        </>
      )}
    </AdminLayout>
  );
}

function Summary({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Percent;
  label: string;
  value: number;
  tone?: "good";
}) {
  return (
    <AdminPanel>
      <div className="flex items-center justify-between">
        <span
          className={`grid h-10 w-10 place-items-center rounded-xl ${tone === "good" ? "bg-emerald-50 text-emerald-700" : "bg-primary/10 text-primary"}`}
        >
          <Icon size={18} />
        </span>
        <span className="text-2xl font-black text-secondary">{value}</span>
      </div>
      <p className="mt-4 text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
    </AdminPanel>
  );
}

function MetricSummary({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof CircleDollarSign;
  label: string;
  value: string;
}) {
  return (
    <AdminPanel>
      <div className="flex items-center justify-between gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
          <Icon size={18} />
        </span>
        <span className="truncate text-lg font-black text-secondary" title={value}>
          {value}
        </span>
      </div>
      <p className="mt-4 text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
    </AdminPanel>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-extrabold text-secondary">{label}</span>
      <div className="mt-2">{children}</div>
      {hint && (
        <span className="mt-1.5 block text-[10px] leading-4 text-muted-foreground">{hint}</span>
      )}
    </label>
  );
}

function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  return (
    <label className="relative">
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="appearance-none rounded-xl border border-border bg-white py-2.5 pl-3 pr-8 text-xs font-extrabold text-secondary outline-none"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      <ChevronDown
        size={13}
        className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
      />
    </label>
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

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-white p-3.5">
      <p className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-1.5 text-xs font-black text-secondary">{value}</p>
    </div>
  );
}

function DraftHealth({ health }: { health: Health }) {
  return (
    <div
      className={`rounded-xl border p-4 ${health.tone === "good" ? "border-emerald-200 bg-emerald-50" : health.tone === "danger" ? "border-red-200 bg-red-50" : "border-amber-200 bg-amber-50"}`}
    >
      <p
        className={`text-xs font-black ${health.tone === "good" ? "text-emerald-800" : health.tone === "danger" ? "text-red-800" : "text-amber-900"}`}
      >
        {health.title}
      </p>
      <p
        className={`mt-1 text-[11px] leading-5 ${health.tone === "good" ? "text-emerald-700" : health.tone === "danger" ? "text-red-700" : "text-amber-800"}`}
      >
        {health.detail}
      </p>
    </div>
  );
}
