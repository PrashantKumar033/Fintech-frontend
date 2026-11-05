import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  applyAdminBankVerification,
  canVerifyAdminBankAccount,
  isPayoutAdminReview,
} from "../src/lib/admin-bank-review.ts";

const payoutPending = {
  id: "bank-payout-1",
  adminReviewRequired: true,
  status: "PENDING",
  adminReviewStatus: "PENDING",
  verificationStatus: "PENDING",
};

test("only an exact pending PAYOUT admin-review state can be verified", () => {
  assert.equal(isPayoutAdminReview(payoutPending), true);
  assert.equal(canVerifyAdminBankAccount(payoutPending), true);

  for (const update of [
    { adminReviewRequired: false },
    { status: "ACTIVE" },
    { adminReviewStatus: "APPROVED" },
    { verificationStatus: "PROCESSING" },
    { verificationStatus: "VERIFIED" },
  ]) {
    assert.equal(canVerifyAdminBankAccount({ ...payoutPending, ...update }), false);
  }
});

test("legacy ownership status does not affect admin verification visibility", () => {
  assert.equal(canVerifyAdminBankAccount({ ...payoutPending, ownershipStatus: "FAILED" }), true);
  assert.equal(canVerifyAdminBankAccount({ ...payoutPending, ownershipStatus: "VERIFIED" }), true);
});

test("DMT-only accounts do not receive the admin Verify action", () => {
  assert.equal(
    canVerifyAdminBankAccount({
      ...payoutPending,
      purposes: ["DMT"],
      adminReviewRequired: false,
    }),
    false,
  );
});

test("successful verification immediately replaces the old account-holder name", () => {
  const updated = applyAdminBankVerification(
    {
      ...payoutPending,
      accountHolderName: "USER ENTERED NAME",
    },
    {
      accountHolderName: "VIMOPAY RETURNED NAME",
      status: "ACTIVE",
      adminReviewStatus: "APPROVED",
      verificationStatus: "VERIFIED",
      verifiedAt: "2026-11-05T10:00:00.000Z",
    },
  );

  assert.equal(updated.accountHolderName, "VIMOPAY RETURNED NAME");
  assert.equal(updated.status, "ACTIVE");
  assert.equal(updated.adminReviewStatus, "APPROVED");
  assert.equal(updated.verificationStatus, "VERIFIED");
});

test("admin review UI uses body-less Verify and secure full-number details only", async () => {
  const [apiSource, uiSource, stateSource] = await Promise.all([
    readFile(new URL("../src/lib/admin-api.ts", import.meta.url), "utf8"),
    readFile(
      new URL("../src/features/admin/banking/bank-operations-page.tsx", import.meta.url),
      "utf8",
    ),
    readFile(new URL("../src/lib/admin-bank-review.ts", import.meta.url), "utf8"),
  ]);

  assert.match(apiSource, /bankAccountReviewDetails:[\s\S]*?\/review-details/);
  assert.match(apiSource, /accountNumber: string/);
  assert.match(apiSource, /verifyBankAccount:[\s\S]*?\/verify`[\s\S]*?\{ method: "POST" \}/);
  assert.doesNotMatch(apiSource, /admin\/bank-accounts\/\$\{[^}]+\}\/approve/);
  assert.doesNotMatch(apiSource, /admin\/bank-accounts\/\$\{[^}]+\}\/ownership\/approve/);
  assert.match(uiSource, /UI_PERMISSION\.BANK_ACCOUNT_REVIEW/);
  assert.match(uiSource, /"accountNumber" in detail && detail\.accountNumber/);
  assert.match(uiSource, /item\.bankName} ····\{item\.accountNumberLast4}/);
  assert.match(uiSource, /verifyBusy \? "Verifying…" : "Verify"/);
  assert.match(uiSource, /reviewInFlightRef\.current/);
  assert.match(uiSource, /applyAdminBankVerification\(current, response\.bankAccount\)/);
  assert.match(uiSource, /Promise\.allSettled\(\[refreshDetail\(detail\), load\(page\)\]\)/);
  assert.doesNotMatch(uiSource, /Verify and approve|Approve ownership|ownershipStatus|Ownership/);
  assert.doesNotMatch(stateSource, /ownershipStatus|requiresManualOwnership/);
  assert.doesNotMatch(uiSource, /console\.(?:log|info|debug)\([^)]*accountNumber/);
  assert.doesNotMatch(uiSource, /(?:localStorage|sessionStorage)[\s\S]{0,80}accountNumber/);
});
