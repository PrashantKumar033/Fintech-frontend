import assert from "node:assert/strict";
import test from "node:test";
import {
  assertAepsCaptureSupported,
  buildAepsTransactionRequest,
  buildFingerprintPidOptions,
  isMockPidEnabled,
  pidDataAfterBindingChange,
  resolveAepsWadh,
  transactionRequiresOtp,
  transactionAuthorizationFromResponse,
} from "../src/lib/aeps-pid.ts";

const wadhValues = {
  1: "PIPE_1_WADH",
  2: "PIPE_2_WADH",
  4: "PIPE_4_WADH",
};

test("pipe 2 and pipe 4 select their matching WADH", () => {
  assert.equal(resolveAepsWadh("2", wadhValues, false), "PIPE_2_WADH");
  assert.equal(resolveAepsWadh("4", wadhValues, false), "PIPE_4_WADH");
});

test("optimized UAT accepts pipe 1 when explicitly allowed", () => {
  assert.equal(resolveAepsWadh("1", wadhValues, true), "PIPE_1_WADH");
});

test("pipe 1 is rejected when explicit allowance is disabled", () => {
  assert.throws(
    () => resolveAepsWadh("1", wadhValues, false),
    /AEPS biometric configuration is unavailable for pipe 1\./,
  );
});

test("pipe 1 is rejected when its WADH is missing", () => {
  assert.throws(
    () => resolveAepsWadh("1", { ...wadhValues, 1: "" }, true),
    /AEPS biometric configuration is unavailable for pipe 1\./,
  );
});

test("missing WADH and unsupported pipes fail closed", () => {
  assert.throws(
    () => resolveAepsWadh("2", { ...wadhValues, 2: "" }, false),
    /AEPS biometric configuration is unavailable for pipe 2\./,
  );
  assert.throws(
    () => resolveAepsWadh("3", wadhValues, true),
    /AEPS biometric configuration is unavailable for pipe 3\./,
  );
  assert.throws(
    () => resolveAepsWadh("", wadhValues, false),
    /AEPS biometric configuration is unavailable for pipe unknown\./,
  );
});

test("normal PID uses empty OTP and the selected WADH", () => {
  const xml = buildFingerprintPidOptions(resolveAepsWadh("2", wadhValues, false));
  assert.match(xml, /^<\?xml version="1\.0" encoding="UTF-8"\?>/);
  assert.match(xml, /fCount="1"/);
  assert.match(xml, /fType="2"/);
  assert.match(xml, /iCount="0"/);
  assert.match(xml, /pCount="0"/);
  assert.match(xml, /format="0"/);
  assert.match(xml, /pidVer="2\.0"/);
  assert.match(xml, /timeout="10000"/);
  assert.match(xml, /posh="UNKNOWN"/);
  assert.match(xml, /env="P"/);
  assert.match(xml, /otp=""/);
  assert.match(xml, /wadh="PIPE_2_WADH"/);
});

test("high-value PID contains only a valid customer-entered OTP", () => {
  const xml = buildFingerprintPidOptions(resolveAepsWadh("4", wadhValues, false), "123456");
  assert.match(xml, /otp="123456"/);
  assert.match(xml, /wadh="PIPE_4_WADH"/);
  assert.throws(() => buildFingerprintPidOptions("PIPE_4_WADH", "12x4"), /4 to 8 digits/);
});

test("PID XML attribute values are escaped", () => {
  const xml = buildFingerprintPidOptions('WADH&"<value>');
  assert.match(xml, /wadh="WADH&amp;&quot;&lt;value&gt;"/);
});

test("OTP authorization metadata never treats a response OTP as customer input", () => {
  const authorization = transactionAuthorizationFromResponse({
    authRequestId: "request-1",
    expiresAt: "2026-10-09T12:00:00.000Z",
    otp: "should-not-be-used",
  });
  assert.deepEqual(authorization, {
    authRequestId: "request-1",
    expiresAt: "2026-10-09T12:00:00.000Z",
  });
  assert.equal("otp" in authorization, false);
});

test("mock PID can only be enabled in development", () => {
  assert.equal(isMockPidEnabled(true, "true"), true);
  assert.equal(isMockPidEnabled(false, "true"), false);
  assert.equal(isMockPidEnabled(true, "false"), false);
});

test("face capture fails closed until verified Face RD transport and WADH exist", () => {
  assert.doesNotThrow(() => assertAepsCaptureSupported("BA"));
  assert.throws(() => assertAepsCaptureSupported("FA"), /Face RD capture is unavailable/);
});

test("CW and AP OTP rules include the Pipe 4 Airtel exception", () => {
  assert.equal(transactionRequiresOtp("CW", "5000", "2", "607094"), false);
  assert.equal(transactionRequiresOtp("AP", "5000", "4", "607094"), false);
  assert.equal(transactionRequiresOtp("CW", "5001", "2", "607094"), true);
  assert.equal(transactionRequiresOtp("AP", "5001", "4", "607094"), false);
  assert.equal(transactionRequiresOtp("CW", "5001", "4", "999999"), true);
  assert.equal(transactionRequiresOtp("BE", "5001", "4", "999999"), false);
});

test("pipe or OTP changes clear PID data", () => {
  assert.equal(pidDataAfterBindingChange("PID", "2", "4"), "");
  assert.equal(pidDataAfterBindingChange("PID", "123456", "654321"), "");
  assert.equal(pidDataAfterBindingChange("PID", "2", "2"), "PID");
});

test("every transaction binding input change invalidates captured PID", () => {
  const original = {
    pipe: "2",
    aadhaarNumber: "123456789012",
    mobileNumber: "9876543210",
    amount: "5001",
    bankIIN: "999999",
    lat: "28.6139",
    long: "77.2090",
    authType: "BA",
    otp: "123456",
  };

  for (const [field, value] of Object.entries({
    pipe: "4",
    aadhaarNumber: "123456789013",
    mobileNumber: "9876543211",
    amount: "5002",
    bankIIN: "607094",
    lat: "28.6140",
    long: "77.2091",
    authType: "FA",
    otp: "654321",
  })) {
    assert.equal(
      pidDataAfterBindingChange(
        "PID",
        JSON.stringify(original),
        JSON.stringify({ ...original, [field]: value }),
      ),
      "",
      `${field} must invalidate PID data`,
    );
  }
});

test("Pipe 4 Airtel high-value request omits authRequestId", () => {
  const needsOtp = transactionRequiresOtp("CW", "5001", "4", "607094");
  const body = buildAepsTransactionRequest(
    {
      aadhaarNumber: "123456789012",
      bankIIN: "607094",
      amount: "5001",
      pidData: "FRESH_PID",
    },
    true,
    needsOtp
      ? { authRequestId: "must-not-be-sent", expiresAt: "2026-10-21T12:00:00.000Z" }
      : undefined,
  );
  assert.equal("authRequestId" in body, false);
});

test("transaction request includes authorization metadata but excludes pipe and raw OTP", () => {
  const body = buildAepsTransactionRequest(
    {
      aadhaarNumber: "123456789012",
      amount: "6000",
      pidData: "PID",
      pipe: "2",
      otp: "123456",
      wadh: "must-not-leak",
      WADH: "must-not-leak",
      providerBankCode: "internal",
      vimopayBankCode: "internal",
      deviceIP: "127.0.0.1",
      ipAddress: "127.0.0.1",
    },
    true,
    { authRequestId: "request-1", expiresAt: "2026-10-09T12:00:00.000Z" },
  );
  assert.deepEqual(body, {
    aadhaarNumber: "123456789012",
    amount: "6000",
    pidData: "PID",
    authRequestId: "request-1",
  });
});
