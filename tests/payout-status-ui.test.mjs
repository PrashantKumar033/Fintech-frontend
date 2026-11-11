import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
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

test("retailer payout navigation separates AEPS settlements from MAIN fund transfer", async () => {
  const [navigation, businessPage, sectionTabs, payoutRoute, payoutWorkspace, mainBankModal] =
    await Promise.all([
      readFile(new URL("../src/lib/app-navigation.ts", import.meta.url), "utf8"),
      readFile(new URL("../src/components/business-page.tsx", import.meta.url), "utf8"),
      readFile(new URL("../src/components/section-tabs.tsx", import.meta.url), "utf8"),
      readFile(new URL("../src/routes/retailer/wallet/payout.tsx", import.meta.url), "utf8"),
      readFile(
        new URL("../src/components/payout-settlement-workspace.tsx", import.meta.url),
        "utf8",
      ),
      readFile(new URL("../src/components/main-bank-account-modal.tsx", import.meta.url), "utf8"),
    ]);

  assert.match(
    navigation,
    /key:\s*"fundTransfer"[\s\S]*?label:\s*"Fund Transfer"[\s\S]*?\/retailer\/wallet\/payout\?wallet=MAIN/,
  );
  assert.match(
    businessPage,
    /label:\s*"AEPS Settlements"[\s\S]*?href:\s*"\/retailer\/wallet\/payout\?wallet=AEPS"[\s\S]*?activeHrefs:\s*\["\/retailer\/wallet\/payout"\]/,
  );
  assert.match(sectionTabs, /\[tab\.href, \.\.\.\(tab\.activeHrefs \|\| \[\]\)\]/);
  assert.match(payoutRoute, /search\.wallet === "MAIN"[\s\S]*?: \("AEPS" as const\)/);
  assert.match(payoutRoute, /active=\{wallet === "AEPS" \? "wallet" : "fundTransfer"\}/);
  assert.match(payoutRoute, /<PayoutSettlementWorkspace fixedSourceWallet=\{wallet\} \/>/);
  assert.match(payoutWorkspace, /!fixedSourceWallet \?[\s\S]*?Debit from wallet/);
  assert.match(payoutWorkspace, /sourceWallet === "AEPS"[\s\S]*?AEPS wallet balance/);
  assert.match(payoutWorkspace, /sourceWallet === "MAIN"[\s\S]*?Main wallet balance/);
  assert.match(payoutWorkspace, /MainBankAccountChooser[\s\S]*?Choose payout account/);
  assert.match(payoutWorkspace, /Loading Main payout bank accounts[\s\S]*?animate-pulse/);
  assert.match(
    payoutWorkspace,
    /const \[bankAccountsLoading, setBankAccountsLoading\] = useState\(true\)/,
  );
  assert.match(payoutWorkspace, /<MainBankAccountChooser[\s\S]*?loading=\{bankAccountsLoading\}/);
  assert.match(
    payoutWorkspace,
    /MIN_BANK_SKELETON_MS[\s\S]*?setAccounts\(loadedAccounts\)[\s\S]*?setBankAccountsLoading\(false\)/,
  );
  assert.match(
    payoutWorkspace,
    /<MainBankAccountModal[\s\S]*?onCreated=\{mainBankAccountCreated\}/,
  );
  assert.match(payoutWorkspace, /type="radio"[\s\S]*?name="main-payout-bank-account"/);
  assert.match(
    payoutWorkspace,
    /Verification status:[\s\S]*?account\.verificationStatus\.replaceAll/,
  );
  assert.doesNotMatch(payoutWorkspace, /Selected Main payout bank account/);
  assert.match(
    mainBankModal,
    /id="add-main-bank-modal"[\s\S]*?role="dialog"[\s\S]*?aria-modal="true"/,
  );
  assert.doesNotMatch(payoutWorkspace, /href="\/retailer\/bank\?add=MAIN"/);
  assert.match(payoutWorkspace, /canVerifyDmtAccount\(account\)[\s\S]*?Verify/);
  assert.match(
    payoutWorkspace,
    /canHardDeleteDmtAccount\(account\)[\s\S]*?title="Delete permanently"[\s\S]*?<Trash2/,
  );
  assert.doesNotMatch(payoutWorkspace, /deleting \? "Deleting…" : "Delete permanently"/);
  assert.match(mainBankModal, /bankDirectorySelection[\s\S]*?applyBankDirectorySelection/);
  assert.match(mainBankModal, /addDmtBank[\s\S]*?buildDmtBankCreateInput\(draft, "ADD_ONLY"\)/);
});
