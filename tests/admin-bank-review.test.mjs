import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  canVerifyAndApprove,
  isAdminReviewProcessing,
  isPayoutAdminReview,
  requiresManualOwnershipReview,
} from "../src/lib/admin-bank-review.ts";

const payoutPending = {
  id: "bank-payout-1",
  purposes: ["PAYOUT"],
  adminReviewRequired: true,
  status: "PENDING",
  adminReviewStatus: "PENDING",
  verificationStatus: "PENDING",
  ownershipStatus: "PENDING",
};

test("PAYOUT initial review shows Verify and approve while DMT has no admin actions", () => {
  assert.equal(isPayoutAdminReview(payoutPending), true);
  assert.equal(canVerifyAndApprove(payoutPending), true);
  assert.equal(
    isPayoutAdminReview({
      ...payoutPending,
      purposes: ["DMT"],
      adminReviewRequired: false,
    }),
    false,
  );
  assert.equal(
    canVerifyAndApprove({
      ...payoutPending,
      purposes: ["DMT"],
      adminReviewRequired: false,
    }),
    false,
  );
});

test("automatic match is complete and ownership failure enables only manual approval", () => {
  const automaticMatch = {
    ...payoutPending,
    status: "ACTIVE",
    adminReviewStatus: "APPROVED",
    verificationStatus: "VERIFIED",
    ownershipStatus: "VERIFIED",
  };
  assert.equal(canVerifyAndApprove(automaticMatch), false);
  assert.equal(requiresManualOwnershipReview(automaticMatch), false);

  const ownershipMismatch = {
    ...payoutPending,
    verificationStatus: "VERIFIED",
    ownershipStatus: "FAILED",
    requiresManualOwnershipApproval: true,
  };
  assert.equal(canVerifyAndApprove(ownershipMismatch), false);
  assert.equal(requiresManualOwnershipReview(ownershipMismatch), true);
});

test("PROCESSING bank review disables repeated approval", () => {
  const processing = { ...payoutPending, verificationStatus: "PROCESSING" };
  assert.equal(isAdminReviewProcessing(processing), true);
  assert.equal(canVerifyAndApprove(processing), false);
});

test("review UI uses secure details, approval and ownership contracts without verify route", async () => {
  const [apiSource, uiSource] = await Promise.all([
    readFile(new URL("../src/lib/admin-api.ts", import.meta.url), "utf8"),
    readFile(
      new URL("../src/features/admin/banking/bank-operations-page.tsx", import.meta.url),
      "utf8",
    ),
  ]);

  assert.match(apiSource, /bankAccountReviewDetails:[\s\S]*?\/review-details/);
  assert.match(apiSource, /accountNumber: string/);
  assert.match(apiSource, /approveBankAccount:[\s\S]*?\/approve`[\s\S]*?json\("PATCH", \{\}\)/);
  assert.match(
    apiSource,
    /approveBankAccountOwnership:[\s\S]*?ownership\/approve`[\s\S]*?json\("POST", \{ reason: reason\.trim\(\) \}\)/,
  );
  assert.doesNotMatch(apiSource, /admin\/bank-accounts\/\$\{[^}]+\}\/verify/);
  assert.match(uiSource, /UI_PERMISSION\.BANK_ACCOUNT_REVIEW/);
  assert.match(uiSource, /"accountNumber" in detail && detail\.accountNumber/);
  assert.match(uiSource, /Verify and approve/);
  assert.match(uiSource, /Approve ownership/);
  assert.match(uiSource, /requiresManualOwnershipReview\(detail\)/);
  assert.match(uiSource, /isPayoutAdminReview\(detail\)/);
  assert.doesNotMatch(uiSource, /console\.(?:log|info|debug)\([^)]*accountNumber/);
  assert.doesNotMatch(uiSource, /(?:localStorage|sessionStorage)[\s\S]{0,80}accountNumber/);
});
