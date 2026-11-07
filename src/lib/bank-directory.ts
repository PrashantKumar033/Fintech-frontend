export const IFSC_PATTERN = /^[A-Z]{4}0[A-Z0-9]{6}$/;

export type BankDirectoryOption = {
  bankCode: string;
  bankName: string;
  suggestedIfsc?: string | null;
};

export type BankIfscDetails = {
  ifsc: string;
  bankCode: string;
  bankName: string;
  branch?: string | null;
  address?: string | null;
  city?: string | null;
  district?: string | null;
  state?: string | null;
  centre?: string | null;
  contact?: string | null;
  micr?: string | null;
  supports?: {
    imps?: boolean;
    neft?: boolean;
    rtgs?: boolean;
    upi?: boolean;
  } | null;
};

export type BankIfscLookup = {
  found: boolean;
  lookupStatus: "FOUND" | "NOT_FOUND" | "UNAVAILABLE" | string;
  details?: BankIfscDetails | null;
};

export type BankDirectoryResponse = {
  source: string;
  version: string;
  banks: BankDirectoryOption[];
};

export type BankDirectorySelectionResponse = {
  bank: BankDirectoryOption;
  ifscLookup: BankIfscLookup;
};

export type BankSelectionResult = {
  bankCode: string;
  ifsc: string;
  details: BankIfscDetails | null;
};

export function normalizeIfsc(value: string): string {
  return value.trim().toUpperCase().slice(0, 11);
}

export function isValidIfsc(value: string): boolean {
  return IFSC_PATTERN.test(normalizeIfsc(value));
}

export function applyBankDirectorySelection(
  bank: BankDirectoryOption,
  lookup?: BankIfscLookup | null,
): BankSelectionResult {
  const details = lookup?.found === true && lookup.details ? lookup.details : null;
  return {
    bankCode: bank.bankCode.trim(),
    ifsc: details ? normalizeIfsc(details.ifsc) : "",
    details,
  };
}

export function detailsFromIfscLookup(lookup?: BankIfscLookup | null): BankIfscDetails | null {
  return lookup?.found === true && lookup.details ? lookup.details : null;
}
