import assert from "node:assert/strict";
import test from "node:test";
import {
  PAYOUT_TOTAL_DEBIT_LABEL,
  payoutFailureDescription,
  payoutFailureNpciCode,
  payoutProviderPublicCode,
  payoutProviderPublicName,
} from "../src/lib/payout-ui.ts";

test("payout failure description gives NPCI message highest priority", () => {
  assert.equal(
    payoutFailureDescription({
      status: "FAILED",
      npciMessage: "Beneficiary account is blocked",
      statusDescription: "Bank rejected the payout",
      failure: { code: "BANK_REJECTED", message: "Transfer failed" },
    }),
    "Beneficiary account is blocked",
  );
});

test("payout failure description falls back to status description", () => {
  assert.equal(
    payoutFailureDescription({
      status: "FAILED",
      npciMessage: null,
      statusDescription: "Bank rejected the payout",
      failure: { code: "BANK_REJECTED", message: "Transfer failed" },
    }),
    "Bank rejected the payout",
  );
});

test("payout failure description falls back to failure message", () => {
  assert.equal(
    payoutFailureDescription({
      status: "FAILED",
      statusDescription: null,
      failure: { code: "BANK_REJECTED", message: "Transfer failed" },
    }),
    "Transfer failed",
  );
});

test("payout failure description has a stable generic fallback", () => {
  assert.equal(
    payoutFailureDescription({ status: "FAILED", failure: { code: null, message: null } }),
    "The payout failed.",
  );
});

test("successful and in-progress payouts do not expose failure details", () => {
  for (const status of ["SUCCESS", "PENDING", "QUEUED"]) {
    const payout = {
      status,
      npciCode: "U30",
      npciMessage: "A stale failure message",
      statusDescription: "A stale status description",
      failure: { code: "STALE", message: "A stale nested failure" },
    };
    assert.equal(payoutFailureDescription(payout), null);
    assert.equal(payoutFailureNpciCode(payout), null);
  }
});

test("payout provider displays public name while requests retain public code", () => {
  const provider = { publicCode: "PROVIDER_1", publicName: "Provider 1", status: "AVAILABLE" };
  assert.equal(payoutProviderPublicName(provider), "Provider 1");
  assert.equal(payoutProviderPublicCode(provider), "PROVIDER_1");
});

test("wallet debit label never renders an undefined wallet name", () => {
  assert.equal(PAYOUT_TOTAL_DEBIT_LABEL.toUpperCase(), "TOTAL WALLET DEBIT");
  assert.doesNotMatch(PAYOUT_TOTAL_DEBIT_LABEL.toUpperCase(), /UNDEFINED/);
});
