import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  catalogServiceLabel,
  numericDraftValue,
  ruleTdsRate,
  shouldShowRuleDistributions,
  shouldShowRuleTds,
} from "../src/lib/commission-rule-ui.ts";

const commissionService = {
  serviceType: "AEPS_CASH_WITHDRAWAL",
  label: "AEPS Cash Withdrawal",
  supportedRulePurposes: ["COMMISSION"],
  defaultRulePurpose: "COMMISSION",
  supportedValueTypes: ["FIXED", "PERCENTAGE"],
  supportsTds: true,
  supportsDistributions: true,
};

const surchargeService = {
  serviceType: "PAYOUT_AEPS",
  label: "Payout — AEPS wallet",
  supportedRulePurposes: ["SURCHARGE"],
  defaultRulePurpose: "SURCHARGE",
  supportedValueTypes: ["FIXED", "PERCENTAGE"],
  supportsTds: false,
  supportsDistributions: false,
};

const mainPayoutSurchargeService = {
  ...surchargeService,
  serviceType: "PAYOUT_MAIN",
  label: "Payout — Main wallet",
};

test("configured rules use catalog-driven service labels", () => {
  assert.equal(
    catalogServiceLabel(
      [commissionService, surchargeService, mainPayoutSurchargeService],
      "PAYOUT_AEPS",
    ),
    "Payout — AEPS wallet",
  );
  assert.equal(
    catalogServiceLabel([surchargeService, mainPayoutSurchargeService], "PAYOUT_MAIN"),
    "Payout — Main wallet",
  );
  assert.equal(catalogServiceLabel([commissionService], "UNKNOWN_SERVICE"), "UNKNOWN_SERVICE");
});

test("commission and surcharge capabilities stay distinct", () => {
  assert.equal(shouldShowRuleTds(commissionService, "COMMISSION"), true);
  assert.equal(shouldShowRuleDistributions(commissionService, "COMMISSION"), true);
  assert.equal(shouldShowRuleTds(surchargeService, "SURCHARGE"), false);
  assert.equal(shouldShowRuleDistributions(surchargeService, "SURCHARGE"), false);
});

test("one service can mix fixed and percentage values across slabs", () => {
  assert.deepEqual(commissionService.supportedValueTypes, ["FIXED", "PERCENTAGE"]);
  const slabs = [
    { minAmount: 100, maxAmount: 10_000, commissionType: "PERCENTAGE", value: 0.75 },
    { minAmount: 10_000, maxAmount: 20_000, commissionType: "FIXED", value: 15 },
  ];
  assert.deepEqual(
    slabs.map((slab) => slab.commissionType),
    ["PERCENTAGE", "FIXED"],
  );
});

test("surcharge always submits zero TDS and hides distributions", () => {
  assert.equal(ruleTdsRate(surchargeService, "SURCHARGE", "18"), 0);
  assert.equal(shouldShowRuleDistributions(surchargeService, "SURCHARGE"), false);
});

test("editing a rule preserves an explicit zero", () => {
  assert.equal(numericDraftValue(0, "2"), "0");
  assert.equal(numericDraftValue("0", "2"), "0");
});

test("commission API keeps service catalog route and removes old payout surcharge requests", async () => {
  const [apiSource, controlsSource] = await Promise.all([
    readFile(new URL("../src/lib/admin-api.ts", import.meta.url), "utf8"),
    readFile(
      new URL("../src/components/admin/super-admin-payout-controls.tsx", import.meta.url),
      "utf8",
    ),
  ]);
  assert.match(apiSource, /commission-rules\/service-catalog/);
  assert.doesNotMatch(apiSource, /super-admin\/payout\/surcharge/);
  assert.doesNotMatch(controlsSource, /superAdminPayout\.surcharge/);
});
