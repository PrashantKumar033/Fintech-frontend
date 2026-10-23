export type PublicAepsProvider = {
  providerCode: string;
  providerName: string;
};

export function withSelectedAepsProvider<T extends object>(
  value: T,
  provider: PublicAepsProvider,
): T & { provider: string; providerCode: string } {
  return {
    ...value,
    provider: provider.providerName.trim(),
    providerCode: provider.providerCode.trim(),
  };
}
