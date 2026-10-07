# Authentication and Transaction Security Requirements

Recorded from the product owner's requirements on 2 September 2026. This document describes future behavior only; it does not mean the flows are currently implemented.

## Login OTP policy

- Require OTP verification on a user's first successful login.
- Require OTP verification whenever the user signs in from a new or untrusted device.
- A trusted-device decision must be made by the backend. The frontend must not decide trust from local storage alone.
- OTP verification should happen before granting access to protected dashboard functionality.
- OTP resend, expiry, retry limit, lockout and audit behavior must follow backend policy.

## Transaction authorization policy

- Require OTP authorization for financial transactions performed for another person/customer or an external beneficiary.
- Never allow the frontend alone to bypass transaction OTP requirements.
- The backend must issue a short-lived, transaction-bound OTP challenge and verify it before executing the transaction.
- The challenge should be bound to the logged-in identity, transaction type, amount, beneficiary/customer and idempotency key.
- A verified OTP must not be reusable for another transaction or changed transaction details.

## Self-transaction exception

- For an eligible transaction between the user's own accounts/wallets, allow authorization with MPIN or password instead of OTP.
- The backend must determine that the source and destination belong to the same identity.
- The user must explicitly choose MPIN or password verification where the backend permits it.
- Normal transaction limits, idempotency, audit logging and risk controls still apply.

## Intended high-level flows

### First-time or new-device login

1. Submit login credentials.
2. Backend returns an OTP challenge instead of a fully authorized session when verification is required.
3. User enters the OTP.
4. Backend verifies the challenge and optionally registers the device as trusted.
5. Backend issues the authenticated session and refresh token.

### Customer/external transaction

1. User enters and confirms transaction details.
2. Frontend requests a transaction OTP challenge.
3. User enters the OTP.
4. Frontend submits the challenge ID, OTP and unchanged transaction details.
5. Backend verifies and executes the transaction atomically.

### Self transaction

1. Backend confirms that both sides belong to the same identity and that self-authorization is allowed.
2. User selects MPIN or password.
3. Backend verifies the selected credential.
4. Backend executes the transaction atomically.

## Required backend contracts before frontend implementation

- Login response indicating whether OTP is required and returning a challenge ID.
- Login OTP verify and resend endpoints.
- Trusted-device registration, listing and revocation endpoints.
- Transaction challenge create, verify and resend endpoints.
- A backend-provided transaction authorization mode such as `OTP`, `MPIN` or `PASSWORD`.
- Secure self-ownership validation; the frontend must not infer it.
- Rate limiting, OTP attempt limits, expiry and lockout responses.
- Audit events for challenge creation, verification, failure, device trust and transaction execution.

## Security constraints

- Never store OTP, password or MPIN in local storage, session storage, logs or analytics.
- Never include credentials or OTP values in URLs.
- Mask destination identifiers and phone numbers in the UI.
- Clear challenge state after success, expiry, cancellation or logout.
- Refreshing an access token must not count as a new-device login.
- Device fingerprinting must be privacy-aware and backed by a revocable server-issued device token.
