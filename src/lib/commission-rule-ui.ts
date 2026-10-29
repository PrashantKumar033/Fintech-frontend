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

export type RuleServiceCatalogItem = {
  serviceType: string;
  label: string;
  supportedRulePurposes: RulePurpose[];
  defaultRulePurpose: RulePurpose;
  supportedValueTypes: RuleValueType[];
  supportsTds: boolean;
  supportsDistributions: boolean;
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
  return purpose === "COMMISSION" && Boolean(item?.supportsDistributions);
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
