export type AdminReviewAccountState = {
  adminReviewRequired?: boolean;
  purposes?: string[];
  status?: string;
  adminReviewStatus?: string;
  verificationStatus?: string;
  ownershipStatus?: string;
  requiresManualOwnershipApproval?: boolean;
};

const normalized = (value?: string) => value?.trim().toUpperCase() || "";

export function isPayoutAdminReview(account: AdminReviewAccountState): boolean {
  return account.adminReviewRequired === true;
}

export function isAdminReviewProcessing(account: AdminReviewAccountState): boolean {
  return [
    account.status,
    account.adminReviewStatus,
    account.verificationStatus,
    account.ownershipStatus,
  ].some((value) => normalized(value) === "PROCESSING");
}

export function requiresManualOwnershipReview(account: AdminReviewAccountState): boolean {
  if (!isPayoutAdminReview(account)) return false;
  return (
    account.requiresManualOwnershipApproval === true ||
    (normalized(account.verificationStatus) === "VERIFIED" &&
      normalized(account.ownershipStatus) === "FAILED" &&
      normalized(account.adminReviewStatus) === "PENDING")
  );
}

export function canVerifyAndApprove(account: AdminReviewAccountState): boolean {
  return (
    isPayoutAdminReview(account) &&
    normalized(account.adminReviewStatus) === "PENDING" &&
    !requiresManualOwnershipReview(account) &&
    !isAdminReviewProcessing(account)
  );
}
