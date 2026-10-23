import assert from "node:assert/strict";
import test from "node:test";
import {
  buildAepsBankIinPath,
  buildAepsOnboardingBankPath,
  filterAepsBankIins,
  normalizeAepsBankIins,
  toAepsBankIinOptions,
} from "../src/lib/aeps-bank-iins.ts";
import {
  canRecoverProviderFinancialEffects,
  canResolveProviderTransaction,
  buildFinancialRecoveryPath,
  financialRecoveryRequestInit,
  providerTransactionDescription,
} from "../src/lib/provider-transaction-ui.ts";

test("NPCI message is shown before the generic provider message", () => {
  assert.equal(
    providerTransactionDescription({
      npciMessage: "Customer Bank Account is blocked for AEPS transactions",
      providerStatusMessage: "Failed",
      status: "FAILED",
    }),
    "Customer Bank Account is blocked for AEPS transactions",
  );
});

test("status description wins and generic fallback remains available when it is absent", () => {
  assert.equal(
    providerTransactionDescription({
      statusDescription: "SUSPECTED FRAUD",
      npciMessage: "NPCI fallback",
      providerStatusMessage: "Failed",
      status: "FAILED",
    }),
    "SUSPECTED FRAUD",
  );
  assert.equal(providerTransactionDescription({ status: "FAILED" }), "FAILED");
});

test("resolve and financial recovery actions are shown for their distinct states", () => {
  assert.equal(
    canResolveProviderTransaction({ status: "UNKNOWN", needsReconciliation: true }),
    true,
  );
  assert.equal(
    canRecoverProviderFinancialEffects({ status: "FAILED", needsReconciliation: true }),
    true,
  );
  assert.equal(
    canRecoverProviderFinancialEffects({ status: "SUCCESS", needsReconciliation: true }),
    true,
  );
  assert.equal(
    canRecoverProviderFinancialEffects({ status: "UNKNOWN", needsReconciliation: true }),
    false,
  );
});

test("recovery action is hidden after recovery completes", () => {
  assert.equal(
    canRecoverProviderFinancialEffects({
      status: "FAILED",
      needsReconciliation: false,
      recoveryComplete: true,
    }),
    false,
  );
});

test("financial recovery POST has no request body", () => {
  const init = financialRecoveryRequestInit();
  assert.equal(
    buildFinancialRecoveryPath(" TXN/123 "),
    "/admin/transactions/reconciliation/TXN%2F123/recover-financial-effects",
  );
  assert.deepEqual(init, { method: "POST" });
  assert.equal("body" in init, false);
});

test("bank IINs preserve provider descriptions, order and distinct same-IIN pairs", () => {
  const banks = normalizeAepsBankIins([
    { iin: " 607161 ", description: " Provider label one " },
    { iin: "607161", description: "Provider label two" },
    { iin: "607161 ", description: "Provider label one  " },
    { iin: "607152", description: "STATE BANK OF INDIA" },
  ]);

  assert.deepEqual(banks, [
    { iin: "607161", description: "Provider label one" },
    { iin: "607161", description: "Provider label two" },
    { iin: "607152", description: "STATE BANK OF INDIA" },
  ]);
  assert.deepEqual(filterAepsBankIins(banks, "PROVIDER LABEL"), banks.slice(0, 2));
});

test("bank options use a composite key and submit only their IIN value", () => {
  assert.deepEqual(
    toAepsBankIinOptions([
      { iin: "607161", description: "Provider label one" },
      { iin: "607161", description: "Provider label two" },
    ]),
    [
      {
        key: "607161:Provider label one:0",
        value: "607161",
        label: "Provider label one",
      },
      {
        key: "607161:Provider label two:1",
        value: "607161",
        label: "Provider label two",
      },
    ],
  );
});

test("onboarding banks and transaction bank IIN routes remain separate", () => {
  const onboardingPath = buildAepsOnboardingBankPath("VIMOPAY");
  const transactionPath = buildAepsBankIinPath("SELECTED_PROVIDER", "CW", "BA");

  assert.equal(onboardingPath, "/aeps/providers/VIMOPAY/banks");
  assert.equal(
    transactionPath,
    "/aeps/providers/SELECTED_PROVIDER/bank-iins?txnCode=CW&authType=BA",
  );
  assert.doesNotMatch(transactionPath, /\/banks(?:\?|$)/);
  assert.doesNotMatch(onboardingPath, /bank-iins/);
});
