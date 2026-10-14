import type { BankAccount, BankAccountPurpose } from "@/lib/compliance-api";
import type { PayoutSourceWallet } from "@/lib/payout-api";

export function payoutBankPurpose(sourceWallet: PayoutSourceWallet): BankAccountPurpose {
  return sourceWallet === "MAIN" ? "DMT" : "PAYOUT";
}

export function isPayoutBankEligible(
  account: BankAccount,
  sourceWallet: PayoutSourceWallet,
): boolean {
  return (
    account.status === "ACTIVE" &&
    account.adminReviewStatus === "APPROVED" &&
    account.verificationStatus === "VERIFIED" &&
    account.ownershipStatus === "VERIFIED" &&
    account.purposes.includes(payoutBankPurpose(sourceWallet))
  );
}
