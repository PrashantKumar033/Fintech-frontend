import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { PayoutSettlementWorkspace } from "@/components/payout-settlement-workspace";
import { BusinessPage } from "@/components/business-page";
import { getSession } from "@/lib/auth-api";
import { credentialsPending, resolveWorkspaceRole, signedInHome } from "@/lib/role-hierarchy";

export const Route = createFileRoute("/retailer/wallet/payout")({
  validateSearch: (search: Record<string, unknown>) => ({
    wallet: search.wallet === "MAIN" ? ("MAIN" as const) : ("AEPS" as const),
  }),
  head: () => ({ meta: [{ title: "Payout to Bank — Retailer | UMOBIPAY" }] }),
  component: RetailerPayoutPage,
});

function RetailerPayoutPage() {
  const navigate = useNavigate();
  const session = getSession();
  const { wallet } = Route.useSearch();

  useEffect(() => {
    if (!session) {
      void navigate({ to: "/login" });
      return;
    }
    if (
      resolveWorkspaceRole(session.identity.role) !== "RETAILER" ||
      credentialsPending(session.identity)
    ) {
      window.location.replace(signedInHome(session));
    }
  }, [navigate, session]);

  if (!session) return null;

  return (
    <BusinessPage
      identity={session.identity}
      active={wallet === "AEPS" ? "wallet" : "fundTransfer"}
      eyebrow={wallet === "AEPS" ? "AEPS settlement" : "Main wallet payout"}
      title={wallet === "AEPS" ? "AEPS settlements" : "Fund transfer"}
      description={
        wallet === "AEPS"
          ? "Settle your AEPS wallet balance to an approved AEPS payout-enabled bank account."
          : "Transfer your Main wallet balance to an approved Main wallet payout-enabled bank account."
      }
    >
      <PayoutSettlementWorkspace fixedSourceWallet={wallet} />
    </BusinessPage>
  );
}
