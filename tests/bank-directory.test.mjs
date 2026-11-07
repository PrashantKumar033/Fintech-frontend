import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  applyBankDirectorySelection,
  detailsFromIfscLookup,
  isValidIfsc,
  normalizeIfsc,
} from "../src/lib/bank-directory.ts";
import { buildDmtBankCreateInput } from "../src/lib/bank-account-ui.ts";

const bank = {
  bankCode: "SBIN",
  bankName: "State Bank of India",
  suggestedIfsc: "SBIN0004343",
};

const details = {
  ifsc: "SBIN0011847",
  bankCode: "SBIN",
  bankName: "State Bank of India",
  branch: "CHEEKA",
  address: "CHEEKA, KAITHAL",
  city: "CHEEKA",
  district: "KAITHAL",
  state: "HARYANA",
};

test("directory selection autofills only a found IFSC and preserves backend bank identity", () => {
  assert.deepEqual(
    applyBankDirectorySelection(bank, {
      found: true,
      lookupStatus: "FOUND",
      details,
    }),
    { bankCode: "SBIN", ifsc: "SBIN0011847", details },
  );

  for (const lookupStatus of ["NOT_FOUND", "UNAVAILABLE"]) {
    assert.deepEqual(
      applyBankDirectorySelection(bank, { found: false, lookupStatus, details: null }),
      { bankCode: "SBIN", ifsc: "", details: null },
    );
  }
});

test("manual IFSC input normalizes, validates and refreshes read-only branch details", () => {
  assert.equal(normalizeIfsc("  sbin0011847  "), "SBIN0011847");
  assert.equal(isValidIfsc("sbin0011847"), true);
  assert.equal(isValidIfsc("SBIN123"), false);
  assert.equal(detailsFromIfscLookup({ found: true, lookupStatus: "FOUND", details }), details);
  assert.equal(
    detailsFromIfscLookup({ found: false, lookupStatus: "NOT_FOUND", details: null }),
    null,
  );
});

test("MAIN/DMT create payload sends bankCode and IFSC without legacy bank fields", () => {
  const payload = buildDmtBankCreateInput(
    {
      bankCode: " SBIN ",
      ifsc: "sbin0011847",
      accountHolderName: " Customer Name ",
      accountNumber: "12345678901",
      confirmAccountNumber: "12345678901",
      accountType: "SAVINGS",
    },
    "ADD_ONLY",
  );
  assert.equal(payload.bankCode, "SBIN");
  assert.equal(payload.ifsc, "SBIN0011847");
  assert.equal("bankName" in payload, false);
  assert.equal("branchName" in payload, false);
});

test("PAYOUT and DMT forms use directory APIs and never submit free-text bank metadata", async () => {
  const [apiSource, pageSource] = await Promise.all([
    readFile(new URL("../src/lib/compliance-api.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/routes/retailer/bank/index.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(apiSource, /`\/bank\/directory\$\{search\.trim\(\)/);
  assert.match(apiSource, /`\/bank\/directory\/\$\{encodeURIComponent\(bankCode\.trim\(\)\)\}`/);
  assert.match(
    apiSource,
    /`\/bank\/ifsc\/\$\{encodeURIComponent\(ifsc\.trim\(\)\.toUpperCase\(\)\)\}`/,
  );
  assert.match(pageSource, /role="combobox"/);
  assert.match(pageSource, /bank\.bankName/);
  assert.match(pageSource, /void selectDirectoryBank\(bank\)/);
  assert.match(pageSource, /ifsc: latest\.ifsc/);
  assert.match(
    pageSource,
    /setForm\(\(current\) => \(\{ \.\.\.current, bankCode: "", ifsc: "" \}\)\)/,
  );

  const payloadSource = pageSource.match(/const payload = \{[\s\S]*?const requestKey =/)?.[0];
  assert.ok(payloadSource);
  assert.match(payloadSource, /bankCode: form\.bankCode\.trim\(\)/);
  assert.match(payloadSource, /ifsc: normalizeIfsc\(form\.ifsc\)/);
  assert.doesNotMatch(payloadSource, /bankName|branchName/);
  assert.doesNotMatch(
    pageSource,
    /\["Bank name", "bankName"\]|\["Branch \(optional\)", "branchName"\]/,
  );
  assert.match(pageSource, /activeTab === "AEPS"/);
  assert.match(pageSource, /activeTab === "MAIN"/);
});
