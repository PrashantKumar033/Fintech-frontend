import { useQuery } from "@tanstack/react-query";
import { ApiError, getSession } from "./auth-api";
import { complianceApi } from "./compliance-api";

export type ServiceReadiness = {
  kycStatus: string;
  kycSubmitted: boolean;
  hasBankAccount: boolean;
  hasVerifiedBank: boolean;
  complianceStatusAvailable: boolean;
  complianceSetupComplete: boolean;
  aepsUnlocked: boolean;
};

export function useServiceReadiness(enabled = true) {
  const session = typeof window === "undefined" ? null : getSession();
  return useQuery({
    queryKey: ["service-readiness", session?.identity.id],
    enabled: enabled && !!session,
    staleTime: 60_000,
    // KYC and bank changes happen on separate routes. Always re-check when a user
    // returns so AEPS navigation and prerequisites never show stale lock state.
    refetchOnMount: "always",
    gcTime: 10 * 60_000,
    queryFn: async (): Promise<ServiceReadiness> => {
      const token = getSession()?.accessToken;
      if (!token) throw new ApiError("Your session has expired.", 401);
      const [kycResult, bankResult] = await Promise.allSettled([
        complianceApi.getKyc(token),
        complianceApi.banks(token),
      ]);
      const kycStatus =
        kycResult.status === "fulfilled"
          ? kycResult.value.status
          : kycResult.reason instanceof ApiError && kycResult.reason.status === 404
            ? "NOT_STARTED"
            : "UNAVAILABLE";
      const kycSubmitted = kycStatus === "UNDER_REVIEW" || kycStatus === "APPROVED";
      const hasBankAccount = bankResult.status === "fulfilled" && bankResult.value.length > 0;
      const hasVerifiedBank =
        bankResult.status === "fulfilled" &&
        bankResult.value.some(
          (bank) =>
            bank.status === "ACTIVE" &&
            bank.adminReviewStatus === "APPROVED" &&
            bank.verificationStatus === "VERIFIED" &&
            bank.ownershipStatus === "VERIFIED",
        );
      const complianceStatusAvailable =
        kycStatus !== "UNAVAILABLE" && bankResult.status === "fulfilled";
      return {
        kycStatus,
        kycSubmitted,
        hasBankAccount,
        hasVerifiedBank,
        complianceStatusAvailable,
        complianceSetupComplete: kycSubmitted && hasBankAccount,
        aepsUnlocked: kycStatus === "APPROVED" && hasVerifiedBank,
      };
    },
  });
}
