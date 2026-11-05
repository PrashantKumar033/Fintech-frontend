import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("resource-level 401 does not clear a valid refreshed identity session", async () => {
  const source = await readFile(new URL("../src/lib/auth-api.ts", import.meta.url), "utf8");
  const authenticatedRequest = source.match(
    /export async function authenticatedRequest[\s\S]*?return data as T;\n}/,
  )?.[0];

  assert.ok(authenticatedRequest);
  assert.match(authenticatedRequest, /response\.status === 401[\s\S]*?refreshSession/);
  assert.doesNotMatch(authenticatedRequest, /clearSession\(\)|redirectToLogin\(\)/);
});

test("refresh authentication rejection still clears the expired session", async () => {
  const source = await readFile(new URL("../src/lib/auth-api.ts", import.meta.url), "utf8");
  const refreshRequest = source.match(
    /async function performSessionRefresh[\s\S]*?return refreshPromise;\n}/,
  )?.[0];

  assert.ok(refreshRequest);
  assert.match(refreshRequest, /response\.status === 401 \|\| response\.status === 403/);
  assert.match(refreshRequest, /clearSession\(\);[\s\S]*?redirectToLogin\(\);/);
});

test("opening the AEPS workspace never invokes logout directly", async () => {
  const source = await readFile(
    new URL("../src/components/aeps-workspace.tsx", import.meta.url),
    "utf8",
  );
  assert.doesNotMatch(source, /\blogout\s*\(/);
});
