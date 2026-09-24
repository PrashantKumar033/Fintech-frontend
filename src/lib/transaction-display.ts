export function compactTransactionReference(reference: string, visibleCharacters = 8): string {
  const value = reference.trim();
  if (!value) return "—";

  const prefixMatch = value.match(/^([A-Za-z]+-)(.+)$/);
  const prefix = prefixMatch?.[1]?.toUpperCase() ?? "";
  const identifier = prefixMatch?.[2] ?? value;

  if (identifier.length <= visibleCharacters) return `${prefix}${identifier}`;
  return `${prefix}${identifier.slice(0, visibleCharacters)}••••`;
}
