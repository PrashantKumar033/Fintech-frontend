import type {
  BankAccount,
  BankAccountType,
  DmtBankMutationResponse,
  DmtBankAccountInput,
  DmtBankCreationMode,
} from "@/lib/compliance-api";

export type DmtBankDraft = {
  bankCode: string;
  ifsc: string;
  accountHolderName: string;
  accountNumber: string;
  confirmAccountNumber: string;
  accountType: BankAccountType;
};

export function buildDmtBankCreateInput(
  draft: DmtBankDraft,
  creationMode: DmtBankCreationMode,
  coordinates?: { lat: string; long: string } | null,
): DmtBankAccountInput {
  return {
    bankCode: draft.bankCode.trim(),
    ifsc: draft.ifsc.trim().toUpperCase(),
    accountHolderName: draft.accountHolderName.trim(),
    accountNumber: draft.accountNumber,
    confirmAccountNumber: draft.confirmAccountNumber,
    accountType: draft.accountType,
    purposes: ["DMT"],
    creationMode,
    ...(coordinates || {}),
  };
}

export function isDmtOnlyAccount(account: Pick<BankAccount, "purposes">): boolean {
  return account.purposes.length === 1 && account.purposes[0] === "DMT";
}

export function canVerifyDmtAccount(account: Pick<BankAccount, "canVerify">): boolean {
  return account.canVerify === true;
}

export function canHardDeleteDmtAccount(
  account: Pick<BankAccount, "purposes" | "canHardDelete">,
): boolean {
  return isDmtOnlyAccount(account) && account.canHardDelete === true;
}

export function applyDmtBankMutation(
  accounts: BankAccount[],
  response: DmtBankMutationResponse,
): BankAccount[] {
  const updated = response.bankAccount;
  const existingIndex = accounts.findIndex((account) => account.id === updated.id);
  if (existingIndex < 0) return [updated, ...accounts];
  return accounts.map((account) => (account.id === updated.id ? updated : account));
}
