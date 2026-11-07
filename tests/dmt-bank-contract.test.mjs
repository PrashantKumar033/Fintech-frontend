import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  applyDmtBankMutation,
  buildDmtBankCreateInput,
  canHardDeleteDmtAccount,
  canVerifyDmtAccount,
} from "../src/lib/bank-account-ui.ts";

const bankAccount = {
  id: "bank-1",
  bankName: "Union Bank of India",
  ifsc: "UBIN0554553",
  accountHolderName: "FRANCY",
  accountNumberLast4: "0846",
  accountType: "SAVINGS",
  purposes: ["DMT"],
  status: "PENDING",
  verificationStatus: "PENDING",
  ownershipStatus: "PENDING",
  adminReviewStatus: "PENDING",
  isDefault: false,
  canVerify: true,
};

const draft = {
  bankCode: " UBIN ",
  ifsc: "ubin0554553",
  accountHolderName: " FRANCY ",
  accountNumber: "545501010050846",
  confirmAccountNumber: "545501010050846",
  accountType: "SAVINGS",
};

test("DMT add bank sends ADD_ONLY without credentials, passbook or coordinates", () => {
  assert.deepEqual(buildDmtBankCreateInput(draft, "ADD_ONLY"), {
    bankCode: "UBIN",
    ifsc: "UBIN0554553",
    accountHolderName: "FRANCY",
    accountNumber: "545501010050846",
    confirmAccountNumber: "545501010050846",
    accountType: "SAVINGS",
    purposes: ["DMT"],
    creationMode: "ADD_ONLY",
  });
});

test("DMT add and verify sends coordinates with ADD_AND_VERIFY", () => {
  assert.deepEqual(
    buildDmtBankCreateInput(draft, "ADD_AND_VERIFY", {
      lat: "30.3422",
      long: "76.8809",
    }),
    {
      bankCode: "UBIN",
      ifsc: "UBIN0554553",
      accountHolderName: "FRANCY",
      accountNumber: "545501010050846",
      confirmAccountNumber: "545501010050846",
      accountType: "SAVINGS",
      purposes: ["DMT"],
      creationMode: "ADD_AND_VERIFY",
      lat: "30.3422",
      long: "76.8809",
    },
  );
});

test("DMT verify and hard delete buttons follow backend capability flags", () => {
  assert.equal(
    canVerifyDmtAccount({
      canVerify: true,
      status: "INACTIVE",
      verificationStatus: "VERIFIED",
      ownershipStatus: "FAILED",
    }),
    true,
  );
  assert.equal(canVerifyDmtAccount({ canVerify: false }), false);
  assert.doesNotMatch(
    canVerifyDmtAccount.toString(),
    /status|verificationStatus|ownershipStatus|purposes/,
  );
  assert.equal(canHardDeleteDmtAccount({ purposes: ["DMT"], canHardDelete: true }), true);
  assert.equal(canHardDeleteDmtAccount({ purposes: ["PAYOUT"], canHardDelete: true }), false);
});

test("DMT UI state follows backend bankAccount status without optimistic verification", () => {
  const pending = applyDmtBankMutation([], {
    success: true,
    message: "Bank account added",
    bankAccount,
  });
  assert.equal(pending[0].status, "PENDING");
  assert.equal(pending[0].verificationStatus, "PENDING");
  assert.equal(pending[0].ownershipStatus, "PENDING");

  const verified = applyDmtBankMutation(pending, {
    success: true,
    message: "DMT bank account verified successfully",
    bankAccount: {
      ...bankAccount,
      status: "ACTIVE",
      verificationStatus: "VERIFIED",
      ownershipStatus: "VERIFIED",
      verifiedAt: "2026-11-02T10:00:00.000Z",
      canVerify: false,
    },
  });
  assert.equal(verified[0].status, "ACTIVE");
  assert.equal(verified[0].verificationStatus, "VERIFIED");
  assert.equal(verified[0].ownershipStatus, "VERIFIED");
});

test("DMT UI uses JSON create, verify and hard-delete routes while PAYOUT keeps passbook flow", async () => {
  const [apiSource, pageSource] = await Promise.all([
    readFile(new URL("../src/lib/compliance-api.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/routes/retailer/bank/index.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(apiSource, /addDmtBank:[\s\S]*?body: JSON\.stringify\(body\)/);
  assert.match(
    apiSource,
    /addDmtBank:[\s\S]*?"Idempotency-Key": createIdempotencyKey\("dmt-bank-create"\)/,
  );
  assert.match(apiSource, /my-bank-accounts\/\$\{encodeURIComponent\(id\)\}\/verify/);
  assert.match(
    apiSource,
    /my-bank-accounts\/\$\{encodeURIComponent\(id\)\}\/verify[\s\S]*?method: "POST"[\s\S]*?JSON\.stringify\(coordinates\)/,
  );
  assert.match(apiSource, /my-bank-accounts\/\$\{encodeURIComponent\(id\)\}\/hard/);
  assert.match(apiSource, /addBank:[\s\S]*?bankAccountForm\(body, passbook\)/);
  assert.match(pageSource, /activeTab === "AEPS" && \([\s\S]*?Passbook front/);
  assert.doesNotMatch(
    pageSource,
    /admin approval (?:is )?not required|do not require admin approval/i,
  );
  assert.match(pageSource, /createDmtBank\("ADD_ONLY"\)/);
  assert.match(pageSource, /createDmtBank\("ADD_AND_VERIFY"\)/);
  assert.match(pageSource, /creationMode: "ADD_ONLY"/);
  const createFlow = pageSource.match(
    /async function createDmtBank[\s\S]*?const verified = accounts\.some/,
  )?.[0];
  assert.ok(createFlow);
  assert.doesNotMatch(
    createFlow,
    /verifyDmtBank|status:\s*"ACTIVE"|verificationStatus:\s*"VERIFIED"/,
  );
  assert.match(pageSource, /applyDmtBankMutation\(current, response\)/);
  assert.match(pageSource, /activeTab === "MAIN" && canVerifyDmtAccount\(a\)/);
  assert.match(
    pageSource,
    /if \(bankActionInFlightRef\.current\.has\(actionKey\)\) return;[\s\S]*?bankActionInFlightRef\.current\.add\(actionKey\);[\s\S]*?setVerifyingBankId\(account\.id\);/,
  );
  assert.match(pageSource, /disabled=\{Boolean\(verifyingBankId\)\}/);
  assert.match(pageSource, /Verifying bank account…/);
  assert.match(pageSource, /\? a\.status/);
  assert.match(pageSource, /`Verification: \$\{a\.verificationStatus\}`/);
  assert.match(pageSource, /Ownership: \{a\.ownershipStatus\}/);
  assert.doesNotMatch(pageSource, /password|transactionPassword|MPIN/);
});

test("2FA reconciliation renders backend message and error code", async () => {
  const [apiSource, uiSource] = await Promise.all([
    readFile(new URL("../src/lib/admin-api.ts", import.meta.url), "utf8"),
    readFile(
      new URL("../src/components/admin/super-admin-aeps-two-factor.tsx", import.meta.url),
      "utf8",
    ),
  ]);
  assert.match(apiSource, /errorCode\?: string/);
  assert.match(uiSource, /downstreamMessage\(result\.message, result\.errorCode\)/);
  assert.match(uiSource, /downstreamMessage\(error\.message, error\.errorCode\)/);
});
