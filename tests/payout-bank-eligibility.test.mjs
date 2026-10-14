import assert from "node:assert/strict";
import test from "node:test";

import {
  isPayoutBankEligible,
  payoutBankPurpose,
} from "../src/lib/payout-bank-eligibility.ts";

const verifiedBank = {
  id: "bank-1",
  bankName: "Test Bank",
  ifsc: "TEST0000001",
  accountHolderName: "Test User",
  accountNumberLast4: "0001",
  accountType: "SAVINGS",
  purposes: ["PAYOUT"],
  status: "ACTIVE",
  verificationStatus: "VERIFIED",
  ownershipStatus: "VERIFIED",
  adminReviewStatus: "APPROVED",
  isDefault: true,
};

test("wallets map to their backend bank-account purpose", () => {
  assert.equal(payoutBankPurpose("AEPS"), "PAYOUT");
  assert.equal(payoutBankPurpose("MAIN"), "DMT");
});

test("AEPS payout accepts only an AEPS-enabled verified bank", () => {
  assert.equal(isPayoutBankEligible(verifiedBank, "AEPS"), true);
  assert.equal(isPayoutBankEligible({ ...verifiedBank, purposes: ["DMT"] }, "AEPS"), false);
});

test("Main payout accepts only a Main-enabled verified bank", () => {
  assert.equal(isPayoutBankEligible({ ...verifiedBank, purposes: ["DMT"] }, "MAIN"), true);
  assert.equal(isPayoutBankEligible(verifiedBank, "MAIN"), false);
});

test("purpose alone does not bypass payout bank verification", () => {
  assert.equal(
    isPayoutBankEligible({ ...verifiedBank, purposes: ["PAYOUT", "DMT"], status: "INACTIVE" }, "MAIN"),
    false,
  );
});
