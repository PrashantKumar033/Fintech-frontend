import assert from "node:assert/strict";
import test from "node:test";
import {
  AEPS_MCC_OPTIONS,
  buildAepsRegistrationRequest,
  EMPTY_AEPS_REGISTRATION,
  validateAepsRegistration,
} from "../src/lib/aeps-registration.ts";
import { aepsErrorMessage } from "../src/lib/aeps-errors.ts";

function validRegistration(overrides = {}) {
  return {
    ...EMPTY_AEPS_REGISTRATION,
    bankAccountId: "b0f1cbe4-2432-4f83-89be-e3765b28214a",
    kycProfileId: "5ea595b6-e9fe-441e-8786-9c7ef693efbb",
    bankCode: "123",
    lat: "28.6139",
    long: "77.2090",
    firstName: "Asha",
    lastName: "Sharma",
    dob: "01-02-1990",
    emailId: "asha@example.com",
    merchantPhoneNumber: "9876543210",
    merchantAddress1: "1 Main Road",
    merchantState: "09",
    merchantDistrict: "101",
    gender: "F",
    shopName: "Asha General Store",
    motherName: "Meera Sharma",
    fatherName: "Raj Sharma",
    maritalStatus: "MARRIED",
    mcc: "5411",
    merchantPinCode: "110001",
    merchantPan: "ABCDE1234F",
    aadhaarNumber: "123456789012",
    shopPan: "ABCDE1234F",
    shopAddress: "1 Market Road",
    shopDistrict: "101",
    shopState: "09",
    shopPincode: "110001",
    shopLat: "28.6139",
    shopLong: "77.2090",
    ...overrides,
  };
}

test("v1.0.14 registration accepts all required fields and the MCC allow-list", () => {
  assert.equal(AEPS_MCC_OPTIONS.length, 11);
  assert.deepEqual(validateAepsRegistration(validRegistration()), {});
});

test("registration without lastName succeeds validation", () => {
  assert.deepEqual(validateAepsRegistration(validRegistration({ lastName: "" })), {});
});

test("empty lastName is omitted without duplicating firstName", () => {
  const request = buildAepsRegistrationRequest(
    validRegistration({ firstName: "FRANCY", middleName: "", lastName: "   " }),
  );

  assert.equal(request.firstName, "FRANCY");
  assert.equal("lastName" in request, false);
  assert.notEqual(request.lastName, request.firstName);
});

test("explicit lastName is trimmed and otherwise preserved exactly", () => {
  const request = buildAepsRegistrationRequest(
    validRegistration({ firstName: "FRANCY", lastName: "  D'Souza  " }),
  );

  assert.equal(request.firstName, "FRANCY");
  assert.equal(request.lastName, "D'Souza");
});

test("existing mandatory registration fields remain required", () => {
  for (const field of [
    "bankAccountId",
    "kycProfileId",
    "bankCode",
    "lat",
    "long",
    "firstName",
    "dob",
    "emailId",
    "merchantPhoneNumber",
    "merchantAddress1",
    "merchantState",
    "merchantDistrict",
    "gender",
    "shopName",
    "motherName",
    "fatherName",
    "maritalStatus",
    "mcc",
    "merchantPinCode",
    "merchantPan",
    "aadhaarNumber",
    "shopPan",
    "shopAddress",
    "shopDistrict",
    "shopState",
    "shopPincode",
    "shopLat",
    "shopLong",
  ]) {
    const errors = validateAepsRegistration(validRegistration({ [field]: "" }));
    assert.equal(errors[field], "This field is required.");
  }
});

test("backend provider-specific registration error is preserved for the UI", () => {
  const providerMessage = "Agent name does not match with PAN Name.";
  assert.equal(aepsErrorMessage(new Error(providerMessage)), providerMessage);
});

test("registration validates numeric bankCode, MCC and coordinate ranges", () => {
  const errors = validateAepsRegistration(
    validRegistration({ bankCode: "AIR-1", mcc: "9999", lat: "91", shopLong: "181" }),
  );
  assert.match(errors.bankCode, /numeric bank code/);
  assert.match(errors.mcc, /supported 4-digit MCC/);
  assert.match(errors.lat, /valid latitude/);
  assert.match(errors.shopLong, /valid longitude/);
});

test("registration sends bankCode and rejects provider-specific aliases", () => {
  const request = buildAepsRegistrationRequest(validRegistration());
  assert.equal(request.bankCode, "123");
  assert.equal("providerBankCode" in request, false);
  assert.throws(
    () =>
      buildAepsRegistrationRequest({
        ...validRegistration(),
        providerBankCode: "internal",
      }),
    /providerBankCode is not accepted/,
  );
});
