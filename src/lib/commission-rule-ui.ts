export type RulePurpose = "COMMISSION" | "SURCHARGE";
export type RuleValueType = "FIXED" | "PERCENTAGE";

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
