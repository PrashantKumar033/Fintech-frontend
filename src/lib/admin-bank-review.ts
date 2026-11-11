export type AdminReviewAccountState = {
  adminReviewRequired?: boolean;
  status?: string;
  adminReviewStatus?: string;
  verificationStatus?: string;
};

const normalized = (value?: string) => value?.trim().toUpperCase() || "";

export function isPayoutAdminReview(account: AdminReviewAccountState): boolean {
  return account.adminReviewRequired === true;
}

export function shouldLoadBankAccountReviewDetails(
  account: AdminReviewAccountState,
  isSuperAdmin: boolean,
): boolean {
  return isSuperAdmin || isPayoutAdminReview(account);
}

export function canVerifyAdminBankAccount(account: AdminReviewAccountState): boolean {
  return (
    isPayoutAdminReview(account) &&
    normalized(account.status) === "PENDING" &&
    normalized(account.adminReviewStatus) === "PENDING" &&
    normalized(account.verificationStatus) === "PENDING"
  );
}

export function applyAdminBankVerification<TAccount extends object, TUpdate extends object>(
  account: TAccount,
  update: TUpdate,
): TAccount & TUpdate {
  return { ...account, ...update };
}
