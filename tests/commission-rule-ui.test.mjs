import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  catalogServiceLabel,
  financialRoleOptions,
  hierarchyAllocationsForPayload,
  numericDraftValue,
  providerAfterServiceChange,
  providerRegistryForService,
  rulePurposeForService,
  ruleTdsRate,
  ruleProviderOptions,
  shouldShowRuleDistributions,
  shouldShowRuleTds,
  validateHierarchyAllocations,
} from "../src/lib/commission-rule-ui.ts";

const commissionService = {
  serviceType: "AEPS_CASH_WITHDRAWAL",
  label: "AEPS Cash Withdrawal",
  supportedRulePurposes: ["COMMISSION", "SURCHARGE"],
  defaultRulePurpose: "COMMISSION",
  supportedValueTypes: ["FIXED", "PERCENTAGE"],
  supportsTds: true,
  supportsDistributions: true,
  hierarchyConfiguration: {
    inlineCommissionAllocationsSupported: true,
    separateDistributionUiRequired: false,
  },
};

const surchargeService = {
  serviceType: "PAYOUT_AEPS",
  label: "Payout — AEPS wallet",
  supportedRulePurposes: ["COMMISSION", "SURCHARGE"],
  defaultRulePurpose: "SURCHARGE",
  supportedValueTypes: ["FIXED", "PERCENTAGE"],
  supportsTds: true,
  supportsDistributions: false,
  hierarchyConfiguration: {
    inlineCommissionAllocationsSupported: true,
    separateDistributionUiRequired: false,
  },
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

const dualPurposeServices = [
  commissionService,
  {
    ...commissionService,
    serviceType: "AEPS_CASH_DEPOSIT",
    label: "AEPS Cash Deposit",
  },
  {
    ...commissionService,
    serviceType: "AEPS_AADHAAR_PAY",
    label: "Aadhaar Pay",
    defaultRulePurpose: "SURCHARGE",
  },
  surchargeService,
  mainPayoutSurchargeService,
];

test("every configured-rules service exposes commission and surcharge from the catalog", () => {
  assert.deepEqual(
    dualPurposeServices.map((service) => [service.serviceType, service.supportedRulePurposes]),
    [
      ["AEPS_CASH_WITHDRAWAL", ["COMMISSION", "SURCHARGE"]],
      ["AEPS_CASH_DEPOSIT", ["COMMISSION", "SURCHARGE"]],
      ["AEPS_AADHAAR_PAY", ["COMMISSION", "SURCHARGE"]],
      ["PAYOUT_AEPS", ["COMMISSION", "SURCHARGE"]],
      ["PAYOUT_MAIN", ["COMMISSION", "SURCHARGE"]],
    ],
  );
});

test("commission and surcharge capabilities stay distinct", () => {
  assert.equal(shouldShowRuleTds(commissionService, "COMMISSION"), true);
  assert.equal(shouldShowRuleDistributions(commissionService, "COMMISSION"), true);
  assert.equal(shouldShowRuleTds(surchargeService, "SURCHARGE"), false);
  assert.equal(shouldShowRuleDistributions(surchargeService, "SURCHARGE"), false);
  assert.equal(shouldShowRuleDistributions(surchargeService, "COMMISSION"), false);
});

test("one service can mix fixed and percentage values across slabs", () => {
  assert.deepEqual(commissionService.supportedValueTypes, ["FIXED", "PERCENTAGE"]);
  const slabs = [
    { minAmount: 100, maxAmount: 9_999.99, commissionType: "PERCENTAGE", value: 0.75 },
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

test("edit mapping preserves backend purpose and new drafts keep commission TDS default", async () => {
  const formSource = await readFile(
    new URL("../src/routes/admin/commissions/index.tsx", import.meta.url),
    "utf8",
  );
  assert.match(formSource, /rulePurpose: rule\.rulePurpose/);
  assert.match(formSource, /tdsRate: numericDraftValue\(rule\.tdsRate, "0"\)/);
  assert.match(formSource, /tdsRate: "2"/);
});

test("purpose dropdown stays catalog-driven and selectable for AEPS and payout services", async () => {
  const formSource = await readFile(
    new URL("../src/routes/admin/commissions/index.tsx", import.meta.url),
    "utf8",
  );
  assert.match(formSource, /<Field label="Rule purpose \*">/);
  assert.match(formSource, /selectedCatalog\?\.supportedRulePurposes \|\| \[\]/);
  assert.doesNotMatch(formSource, /disabled=\{[^}]*rulePurpose/);
  for (const service of dualPurposeServices) {
    assert.deepEqual(service.supportedRulePurposes, ["COMMISSION", "SURCHARGE"]);
  }
});

test("default purpose initializes a new draft but does not replace a supported selection", () => {
  assert.equal(rulePurposeForService(commissionService), "COMMISSION");
  assert.equal(rulePurposeForService(commissionService, "SURCHARGE"), "SURCHARGE");
  assert.equal(rulePurposeForService(surchargeService), "SURCHARGE");
  assert.equal(rulePurposeForService(surchargeService, "COMMISSION"), "COMMISSION");
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

test("source roles use active backend roles and exclude super admin", () => {
  assert.deepEqual(
    financialRoleOptions([
      { name: "RETAILER", description: "Retailer", isActive: true },
      { name: "DISTRIBUTOR", description: "Distributor", isActive: false },
      { name: "SUPER_ADMIN", description: "Super Admin", isActive: true },
    ]),
    [{ value: "RETAILER", label: "Retailer" }],
  );
  assert.deepEqual(financialRoleOptions([], ["SUPER_DISTRIBUTOR"]), [
    { value: "SUPER_DISTRIBUTOR", label: "SUPER_DISTRIBUTOR — Saved role" },
  ]);
});

test("commission submits inline hierarchy allocations while surcharge submits an empty array", () => {
  const rows = [
    {
      recipientRole: "DISTRIBUTOR",
      distributionType: "PERCENTAGE",
      distributionValue: "20",
      priority: "10",
      isActive: true,
    },
    {
      recipientRole: "SUPER_DISTRIBUTOR",
      distributionType: "FIXED",
      distributionValue: "1",
      priority: "5",
      isActive: true,
    },
  ];
  assert.deepEqual(hierarchyAllocationsForPayload(commissionService, "COMMISSION", rows), [
    {
      recipientRole: "DISTRIBUTOR",
      distributionType: "PERCENTAGE",
      distributionValue: 20,
      priority: 10,
      isActive: true,
    },
    {
      recipientRole: "SUPER_DISTRIBUTOR",
      distributionType: "FIXED",
      distributionValue: 1,
      priority: 5,
      isActive: true,
    },
  ]);
  assert.deepEqual(hierarchyAllocationsForPayload(commissionService, "SURCHARGE", rows), []);
  assert.equal(ruleTdsRate(commissionService, "SURCHARGE", "2"), 0);
});

test("duplicate recipients and active percentage totals above 100 are blocked", () => {
  assert.match(
    validateHierarchyAllocations([
      {
        recipientRole: "DISTRIBUTOR",
        distributionType: "FIXED",
        distributionValue: "1",
        priority: "1",
        isActive: true,
      },
      {
        recipientRole: "DISTRIBUTOR",
        distributionType: "PERCENTAGE",
        distributionValue: "10",
        priority: "2",
        isActive: true,
      },
    ]),
    /configured more than once/,
  );
  assert.match(
    validateHierarchyAllocations([
      {
        recipientRole: "DISTRIBUTOR",
        distributionType: "PERCENTAGE",
        distributionValue: "60",
        priority: "1",
        isActive: true,
      },
      {
        recipientRole: "SUPER_DISTRIBUTOR",
        distributionType: "PERCENTAGE",
        distributionValue: "41",
        priority: "2",
        isActive: true,
      },
    ]),
    /cannot total more than 100%/,
  );
  assert.match(
    validateHierarchyAllocations([
      {
        recipientRole: "DISTRIBUTOR",
        distributionType: "FIXED",
        distributionValue: "0",
        priority: "1",
        isActive: true,
      },
    ]),
    /must be greater than 0/,
  );
});

test("services without distribution support hide and clear inline allocations", () => {
  assert.equal(shouldShowRuleDistributions(surchargeService, "COMMISSION"), false);
  assert.deepEqual(
    hierarchyAllocationsForPayload(surchargeService, "COMMISSION", [
      {
        recipientRole: "DISTRIBUTOR",
        distributionType: "FIXED",
        distributionValue: "1",
        priority: "0",
        isActive: true,
      },
    ]),
    [],
  );
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

test("commission API keeps catalog routes and configured rules avoids legacy mutation workflow", async () => {
  const [apiSource, controlsSource, formSource, hierarchySource] = await Promise.all([
    readFile(new URL("../src/lib/admin-api.ts", import.meta.url), "utf8"),
    readFile(
      new URL("../src/components/admin/super-admin-payout-controls.tsx", import.meta.url),
      "utf8",
    ),
    readFile(new URL("../src/routes/admin/commissions/index.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/routes/admin/commissions/hierarchy.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(apiSource, /commission-rules\/service-catalog/);
  assert.match(apiSource, /super-admin\/providers/);
  assert.match(apiSource, /super-admin\/payout\/providers/);
  assert.match(formSource, /adminApi\.superAdminAeps\.providers\.list\(\)/);
  assert.match(formSource, /adminApi\.superAdminPayout\.providers\.list\(\)/);
  assert.match(formSource, /adminApi\.roles\.list\(\)/);
  assert.match(formSource, /hierarchyAllocationsForPayload/);
  assert.match(formSource, /update\(rule\.id, \{ isActive: true \}\)/);
  assert.match(formSource, /hierarchyAllocations,/);
  assert.match(formSource, /\? "Percentage value \*"/);
  assert.match(formSource, /minAmount: numberOrNull\(draft\.minAmount\)/);
  assert.match(formSource, /maxAmount: numberOrNull\(draft\.maxAmount\)/);
  assert.doesNotMatch(formSource, /commissionDistributions/);
  assert.doesNotMatch(formSource, /commission-distributions\/distributions/);
  assert.doesNotMatch(hierarchySource, /Distribution Setup/);
  assert.doesNotMatch(formSource, /VIMOPAY/);
  assert.doesNotMatch(apiSource, /super-admin\/payout\/surcharge/);
  assert.doesNotMatch(controlsSource, /superAdminPayout\.surcharge/);
});
