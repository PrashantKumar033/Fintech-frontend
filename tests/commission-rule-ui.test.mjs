import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  catalogServiceLabel,
  numericDraftValue,
  providerAfterServiceChange,
  providerRegistryForService,
  ruleTdsRate,
  ruleProviderOptions,
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

test("rule purpose remains catalog-driven even when only one option is supported", async () => {
  assert.deepEqual(commissionService.supportedRulePurposes, ["COMMISSION"]);
  const formSource = await readFile(
    new URL("../src/routes/admin/commissions/index.tsx", import.meta.url),
    "utf8",
  );
  assert.match(formSource, /<Field label="Rule purpose \*">/);
  assert.match(formSource, /selectedDraftCatalog\?\.supportedRulePurposes \|\| \[\]/);
});

test("provider registry is selected from the catalog service family", () => {
  assert.equal(providerRegistryForService("AEPS_CASH_WITHDRAWAL"), "AEPS");
  assert.equal(providerRegistryForService("PAYOUT_AEPS"), "PAYOUT");
  assert.equal(providerRegistryForService("OTHER_SERVICE"), null);
});

test("provider labels use public names while submitted values use public codes", () => {
  const providers = [
    {
      publicCode: "PROVIDER_1",
      publicName: "Provider 1",
      internalCode: "VIMOPAY",
      displayName: "VIMOPAY",
      isActive: true,
    },
  ];
  const options = ruleProviderOptions(providers);
  assert.deepEqual(options, [
    {
      value: "PROVIDER_1",
      label: "Provider 1",
      isActive: true,
      isFallback: false,
    },
  ]);
  assert.equal(JSON.stringify(options).includes("VIMOPAY"), false);
});

test("inactive and missing saved providers remain selectable while service changes clear invalid values", () => {
  const inactiveProviders = [
    { publicCode: "PROVIDER_1", publicName: "Provider 1", isActive: false },
  ];
  assert.equal(
    ruleProviderOptions(inactiveProviders, "PROVIDER_1")[0].label,
    "Provider 1 — Inactive",
  );
  assert.deepEqual(ruleProviderOptions(inactiveProviders, "PROVIDER_2")[1], {
    value: "PROVIDER_2",
    label: "PROVIDER_2 — Saved provider",
    isActive: null,
    isFallback: true,
  });
  assert.equal(providerAfterServiceChange("PROVIDER_1", inactiveProviders), "PROVIDER_1");
  assert.equal(providerAfterServiceChange("PROVIDER_2", inactiveProviders), "");
});

test("commission API keeps service catalog route and removes old payout surcharge requests", async () => {
  const [apiSource, controlsSource, formSource] = await Promise.all([
    readFile(new URL("../src/lib/admin-api.ts", import.meta.url), "utf8"),
    readFile(
      new URL("../src/components/admin/super-admin-payout-controls.tsx", import.meta.url),
      "utf8",
    ),
    readFile(new URL("../src/routes/admin/commissions/index.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(apiSource, /commission-rules\/service-catalog/);
  assert.match(apiSource, /super-admin\/providers/);
  assert.match(apiSource, /super-admin\/payout\/providers/);
  assert.match(formSource, /adminApi\.superAdminAeps\.providers\.list\(\)/);
  assert.match(formSource, /adminApi\.superAdminPayout\.providers\.list\(\)/);
  assert.doesNotMatch(formSource, /VIMOPAY/);
  assert.doesNotMatch(apiSource, /super-admin\/payout\/surcharge/);
  assert.doesNotMatch(controlsSource, /superAdminPayout\.surcharge/);
});
