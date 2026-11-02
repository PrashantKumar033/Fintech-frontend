import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  asAepsCoordinates,
  configuredMockDevelopmentLocation,
  getBrowserLocation,
} from "../src/lib/browser-location.ts";

test("AEPS location requests share one automatic browser capture and reuse recent coordinates", async () => {
  const windowDescriptor = Object.getOwnPropertyDescriptor(globalThis, "window");
  const navigatorDescriptor = Object.getOwnPropertyDescriptor(globalThis, "navigator");
  let captures = 0;

  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { isSecureContext: true },
  });
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: {
      geolocation: {
        getCurrentPosition(success) {
          captures += 1;
          queueMicrotask(() => success({ coords: { latitude: 30.3422, longitude: 76.8809 } }));
        },
      },
    },
  });

  try {
    const [first, concurrent] = await Promise.all([getBrowserLocation(), getBrowserLocation()]);
    const cached = await getBrowserLocation();

    assert.equal(captures, 1);
    assert.deepEqual(asAepsCoordinates(first), { lat: "30.3422", long: "76.8809" });
    assert.equal(concurrent.capturedAt, first.capturedAt);
    assert.equal(cached.capturedAt, first.capturedAt);

    await getBrowserLocation({ forceRefresh: true });
    assert.equal(captures, 2);
  } finally {
    if (windowDescriptor) Object.defineProperty(globalThis, "window", windowDescriptor);
    else Reflect.deleteProperty(globalThis, "window");
    if (navigatorDescriptor) Object.defineProperty(globalThis, "navigator", navigatorDescriptor);
    else Reflect.deleteProperty(globalThis, "navigator");
  }
});

test("all AEPS location consumers use the shared automatic location service", async () => {
  const [workspace, bankPage, payoutWorkspace] = await Promise.all([
    readFile(new URL("../src/components/aeps-workspace.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/routes/retailer/bank/index.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/payout-settlement-workspace.tsx", import.meta.url), "utf8"),
  ]);

  assert.doesNotMatch(workspace, /navigator\.geolocation/);
  assert.doesNotMatch(bankPage, /navigator\.geolocation/);
  assert.doesNotMatch(payoutWorkspace, /navigator\.geolocation/);
  assert.match(workspace, /allowMockDevelopmentFallback: true/);
  assert.match(bankPage, /allowMockDevelopmentFallback: true/);
  assert.match(payoutWorkspace, /allowMockDevelopmentFallback: true/);
  assert.match(workspace, /if \(!captured\) void capture\(\)/);
  assert.match(bankPage, /captureBankCoordinates\(true\)/);
  assert.match(payoutWorkspace, /captureLocation\(true\)/);
});

test("desktop location automatically falls back when high accuracy is unavailable", async () => {
  const windowDescriptor = Object.getOwnPropertyDescriptor(globalThis, "window");
  const navigatorDescriptor = Object.getOwnPropertyDescriptor(globalThis, "navigator");
  const attempts = [];

  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { isSecureContext: true },
  });
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: {
      geolocation: {
        getCurrentPosition(success, failure, options) {
          attempts.push(options);
          if (!options || options.enableHighAccuracy) {
            queueMicrotask(() => failure({ code: 2 }));
          } else {
            queueMicrotask(() => success({ coords: { latitude: 30.3422, longitude: 76.8809 } }));
          }
        },
      },
    },
  });

  try {
    const location = await getBrowserLocation({ forceRefresh: true });
    assert.deepEqual(
      attempts.map((options) => options?.enableHighAccuracy),
      [undefined, true, false],
    );
    assert.deepEqual(asAepsCoordinates(location), { lat: "30.3422", long: "76.8809" });
  } finally {
    if (windowDescriptor) Object.defineProperty(globalThis, "window", windowDescriptor);
    else Reflect.deleteProperty(globalThis, "window");
    if (navigatorDescriptor) Object.defineProperty(globalThis, "navigator", navigatorDescriptor);
    else Reflect.deleteProperty(globalThis, "navigator");
  }
});

test("configured development location is restricted to mock development mode", () => {
  const configured = { latitude: "30.3422", longitude: "76.8809" };
  assert.equal(
    configuredMockDevelopmentLocation({
      ...configured,
      isDevelopment: false,
      mockPidEnabled: true,
    }),
    null,
  );
  assert.equal(
    configuredMockDevelopmentLocation({
      ...configured,
      isDevelopment: true,
      mockPidEnabled: false,
    }),
    null,
  );
  assert.equal(
    configuredMockDevelopmentLocation({
      isDevelopment: true,
      mockPidEnabled: true,
      latitude: "",
      longitude: "",
    }),
    null,
  );
  assert.deepEqual(
    asAepsCoordinates(
      configuredMockDevelopmentLocation({
        ...configured,
        isDevelopment: true,
        mockPidEnabled: true,
      }),
    ),
    { lat: configured.latitude, long: configured.longitude },
  );
});
