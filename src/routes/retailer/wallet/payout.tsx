import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { PayoutSettlementWorkspace } from "@/components/payout-settlement-workspace";
import { BusinessPage } from "@/components/business-page";
import { getSession } from "@/lib/auth-api";
import { credentialsPending, resolveWorkspaceRole, signedInHome } from "@/lib/role-hierarchy";

export const Route = createFileRoute("/retailer/wallet/payout")({
  head: () => ({ meta: [{ title: "Payout to Bank — Retailer | UMOBIPAY" }] }),
  component: RetailerPayoutPage,
});

function RetailerPayoutPage() {
  const navigate = useNavigate();
  const session = getSession();

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
      active="wallet"
      eyebrow="Payout service"
      title="Payout to bank"
      description="Settle your AEPS or MAIN wallet balance to an approved payout-enabled bank account."
    >
      <PayoutSettlementWorkspace />
    </BusinessPage>
  );
}
