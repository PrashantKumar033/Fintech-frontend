import assert from "node:assert/strict";
import test from "node:test";

import {
  formatWalletBalance,
  isNegativeWalletBalance,
  parseWalletBalance,
} from "../src/lib/wallet-balance.ts";

test("negative wallet balances remain negative when parsed and formatted", () => {
  assert.equal(parseWalletBalance(-5), -5);
  assert.equal(parseWalletBalance("-5.00"), -5);
  assert.equal(parseWalletBalance("-₹5.00"), -5);
  assert.equal(formatWalletBalance(-5), "-₹5.00");
  assert.equal(isNegativeWalletBalance("-5"), true);
});

test("zero and invalid wallet balances are handled without creating a negative zero", () => {
  assert.equal(formatWalletBalance(-0), "₹0.00");
  assert.equal(formatWalletBalance("not-a-balance"), "—");
  assert.equal(isNegativeWalletBalance(0), false);
});
