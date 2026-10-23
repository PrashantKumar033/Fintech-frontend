export type AepsBankIinItem = {
  code?: string;
  iin?: string;
  description: string;
};

export type AepsBankIinOption = {
  key: string;
  value: string;
  label: string;
};

export function normalizeAepsBankIins(items: AepsBankIinItem[]): AepsBankIinItem[] {
  const seenPairs = new Set<string>();
  const normalized: AepsBankIinItem[] = [];

  for (const item of items) {
    const iin = item.iin?.trim();
    const description = item.description?.trim();
    if (!iin || !description) continue;
    const pair = JSON.stringify([iin, description]);
    if (seenPairs.has(pair)) continue;
    seenPairs.add(pair);
    normalized.push({ ...item, iin, description });
  }

  return normalized;
}

export function filterAepsBankIins(items: AepsBankIinItem[], search: string): AepsBankIinItem[] {
  const needle = search.trim().toLocaleLowerCase("en-IN");
  if (!needle) return items;
  return items.filter((item) =>
    `${item.iin ?? ""} ${item.description}`.toLocaleLowerCase("en-IN").includes(needle),
  );
}

export function toAepsBankIinOptions(items: AepsBankIinItem[]): AepsBankIinOption[] {
  return items.map((item, index) => ({
    key: `${item.iin}:${item.description}:${index}`,
    value: item.iin ?? "",
    label: item.description,
  }));
}

export function buildAepsBankIinPath(
  providerCode: string,
  txnCode: "BE" | "MS" | "CW" | "AP" | "CD",
  authType: "BA" | "FA",
): string {
  return `/aeps/providers/${encodeURIComponent(providerCode.trim())}/bank-iins?txnCode=${txnCode}&authType=${authType}`;
}

export function buildAepsOnboardingBankPath(providerCode: string): string {
  return `/aeps/providers/${encodeURIComponent(providerCode.trim())}/banks`;
}
