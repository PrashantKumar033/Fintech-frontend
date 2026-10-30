export type RulePurpose = "COMMISSION" | "SURCHARGE";
export type RuleValueType = "FIXED" | "PERCENTAGE";
export type RuleProviderRegistry = "AEPS" | "PAYOUT";

export type RuleProviderEntry = {
  publicCode: string;
  publicName: string;
  isActive: boolean;
};

export type RuleProviderOption = {
  value: string;
  label: string;
  isActive: boolean | null;
  isFallback: boolean;
};

export type FinancialRoleEntry = {
  name: string;
  description?: string | null;
  isActive: boolean;
};

export type RuleServiceCatalogItem = {
  serviceType: string;
  label: string;
  supportedRulePurposes: RulePurpose[];
  defaultRulePurpose: RulePurpose;
  supportedValueTypes: RuleValueType[];
  supportsTds: boolean;
  supportsDistributions: boolean;
  hierarchyConfiguration?: {
    inlineCommissionAllocationsSupported: boolean;
    separateDistributionUiRequired: boolean;
  };
};

export type HierarchyAllocationDraftLike = {
  recipientRole: string;
  distributionType: RuleValueType;
  distributionValue: string | number;
  priority: string | number;
  isActive: boolean;
};

export function catalogServiceLabel(
  catalog: RuleServiceCatalogItem[],
  serviceType: string,
): string {
  return catalog.find((item) => item.serviceType === serviceType)?.label || serviceType;
}

export function catalogItemForService(
  catalog: RuleServiceCatalogItem[],
  serviceType: string,
): RuleServiceCatalogItem | undefined {
  return catalog.find((item) => item.serviceType === serviceType);
}

export function rulePurposeForService(
  item: RuleServiceCatalogItem,
  currentPurpose?: RulePurpose,
): RulePurpose {
  return currentPurpose && item.supportedRulePurposes.includes(currentPurpose)
    ? currentPurpose
    : item.defaultRulePurpose;
}

export function shouldShowRuleTds(
  item: RuleServiceCatalogItem | undefined,
  purpose: RulePurpose,
): boolean {
  return purpose === "COMMISSION" && Boolean(item?.supportsTds);
}

export function shouldShowRuleDistributions(
  item: RuleServiceCatalogItem | undefined,
  purpose: RulePurpose,
): boolean {
  return (
    purpose === "COMMISSION" &&
    Boolean(item?.supportsDistributions) &&
    item?.hierarchyConfiguration?.inlineCommissionAllocationsSupported !== false &&
    item?.hierarchyConfiguration?.separateDistributionUiRequired !== true
  );
}

export function validateHierarchyAllocations(
  allocations: HierarchyAllocationDraftLike[],
): string | null {
  const roles = new Set<string>();
  let activePercentageTotal = 0;

  for (const allocation of allocations) {
    const role = allocation.recipientRole.trim().toUpperCase();
    if (!role) return "Recipient role is required for every hierarchy allocation.";
    if (roles.has(role)) return `Recipient role ${role} is configured more than once.`;
    roles.add(role);

    if (typeof allocation.distributionValue === "string" && !allocation.distributionValue.trim()) {
      return `Allocation value for ${role} is required.`;
    }
    const value = Number(allocation.distributionValue);
    if (!Number.isFinite(value) || value < 0) {
      return `Allocation value for ${role} must be a valid non-negative number.`;
    }
    if (allocation.isActive && value <= 0) {
      return `Active allocation value for ${role} must be greater than 0.`;
    }
    if (allocation.distributionType === "PERCENTAGE") {
      if (value > 100) return `Percentage allocation for ${role} cannot exceed 100%.`;
      if (allocation.isActive) activePercentageTotal += value;
    }

    const priority = Number(allocation.priority);
    if (!Number.isInteger(priority)) return `Priority for ${role} must be a whole number.`;
  }

  if (activePercentageTotal > 100) {
    return "Active hierarchy percentage allocations cannot total more than 100%.";
  }
  return null;
}

export function hierarchyAllocationsForPayload(
  item: RuleServiceCatalogItem | undefined,
  purpose: RulePurpose,
  allocations: HierarchyAllocationDraftLike[],
) {
  if (!shouldShowRuleDistributions(item, purpose)) return [];
  return allocations.map((allocation) => ({
    recipientRole: allocation.recipientRole.trim(),
    distributionType: allocation.distributionType,
    distributionValue: Number(allocation.distributionValue),
    priority: Number(allocation.priority),
    isActive: allocation.isActive,
  }));
}

export function ruleTdsRate(
  item: RuleServiceCatalogItem | undefined,
  purpose: RulePurpose,
  value: string | number,
): number {
  return shouldShowRuleTds(item, purpose) ? Number(value) : 0;
}

export function numericDraftValue(
  value: string | number | null | undefined,
  fallback = "",
): string {
  return value === null || value === undefined ? fallback : String(value);
}

export function providerRegistryForService(serviceType: string): RuleProviderRegistry | null {
  const normalized = serviceType.trim().toUpperCase();
  if (normalized.startsWith("AEPS_")) return "AEPS";
  if (normalized.startsWith("PAYOUT_")) return "PAYOUT";
  return null;
}

export function ruleProviderOptions(
  providers: RuleProviderEntry[],
  storedOperator = "",
): RuleProviderOption[] {
  const seen = new Set<string>();
  const options: RuleProviderOption[] = providers.flatMap((provider) => {
    const value = provider.publicCode.trim();
    if (!value || seen.has(value)) return [];
    seen.add(value);
    const publicName = provider.publicName.trim() || value;
    return [
      {
        value,
        label: provider.isActive ? publicName : `${publicName} — Inactive`,
        isActive: provider.isActive,
        isFallback: false,
      },
    ];
  });

  const savedValue = storedOperator.trim();
  if (savedValue && !seen.has(savedValue)) {
    options.push({
      value: savedValue,
      label: `${savedValue} — Saved provider`,
      isActive: null,
      isFallback: true,
    });
  }
  return options;
}

export function providerAfterServiceChange(
  currentOperator: string,
  providers: RuleProviderEntry[],
): string {
  const current = currentOperator.trim();
  return providers.some((provider) => provider.publicCode.trim() === current) ? current : "";
}

export function financialRoleOptions(roles: FinancialRoleEntry[], preserved: string[] = []) {
  const options = roles
    .filter((role) => role.isActive && role.name.trim().toUpperCase() !== "SUPER_ADMIN")
    .map((role) => ({
      value: role.name.trim(),
      label: role.description?.trim() || role.name.trim(),
    }));
  const values = new Set(options.map((option) => option.value));
  preserved
    .map((role) => role.trim())
    .filter(Boolean)
    .forEach((value) => {
      if (!values.has(value)) options.push({ value, label: `${value} — Saved role` });
    });
  return options;
}
