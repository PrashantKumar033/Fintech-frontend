import { authenticatedRequest } from "./auth-api";
import {
  assertAepsCaptureSupported,
  buildFingerprintPidOptions,
  isMockPidEnabled,
  resolveAepsWadh,
} from "./aeps-pid";
import { createIdempotencyKey } from "./idempotency-key";
import { buildAepsBankIinPath, buildAepsOnboardingBankPath } from "./aeps-bank-iins";
import { withSelectedAepsProvider } from "./aeps-provider-selection";

export { resolveAepsWadh } from "./aeps-pid";

export type AepsNextAction =
  | "REGISTER"
  | "OTP"
  | "EKYC"
  | "TWO_FACTOR_AUTH"
  | "AEPS_TRANSACTION"
  | "WAIT"
  | "RETRY_REGISTRATION"
  | "CONTACT_SUPPORT";
export type AepsTxnCode = "BE" | "MS" | "CW" | "AP" | "CD";
export type AuthType = "BA" | "FA";
export type AepsProvider = {
  providerCode: string;
  providerName: string;
  status: "AVAILABLE";
};
export type MasterItem = { code?: string; iin?: string; description: string };
export type AepsStatus = {
  provider: string;
  providerCode: string;
  pipe: string;
  profileId?: string;
  providerMerchantId?: string;
  status?: string;
  onboardingStep?: string;
  serviceActivated?: boolean;
  lastTwoFactorAuthAt?: string;
  nextAction: AepsNextAction;
  reason?: string | null;
};
export type SavedBank = {
  id: string;
  bankName?: string;
  accountNumberLast4?: string;
  accountType?: string;
  status?: string;
  verificationStatus?: string;
  ownershipStatus?: string;
  isDeleted?: boolean;
};
export type KycProfile = {
  id: string;
  identityId: string;
  status: "PENDING" | "UNDER_REVIEW" | "APPROVED" | "REJECTED";
  submittedAt?: string | null;
  reviewedAt?: string | null;
  remarks?: string | null;
};
export type BiometricPayload = {
  aadhaarNumber: string;
  mobileNumber: string;
  bankIIN: string;
  lat: string;
  long: string;
  deviceType: string;
  pidData: string;
  udf1?: string;
  udf2?: string;
  udf3?: string;
};
export type AepsAccounting = {
  grossAmount?: string;
  commissionAmount?: string;
  surchargeAmount?: string;
  netSettlementAmount?: string;
  customerPayoutAmount?: string;
  netPrincipalAmount?: string;
};
export type AepsSettlement = {
  status?: "NOT_REQUIRED" | "PENDING" | "SETTLED" | "FAILED" | "COMPENSATED" | string;
  walletType?: string | null;
  amount?: string | null;
  transactionReference?: string | null;
  compensationTransactionReference?: string | null;
};
export type AepsCommission = {
  status?: string;
  commissionReference?: string | null;
  walletTransactionReference?: string | null;
  reason?: string | null;
  distributions?: unknown[];
};
export type TransactionResult = {
  provider?: string;
  transactionType?: string;
  transactionReferenceId?: string;
  providerReference?: string | null;
  profileId?: string;
  merchantRefId?: string;
  providerMerchantId?: string;
  amount?: string;
  accounting?: AepsAccounting;
  settlement?: AepsSettlement;
  commission?: AepsCommission;
  result?: Record<string, unknown>;
  status?: string;
  message?: string;
  [key: string]: unknown;
};
export type TransactionOtpResult = {
  provider?: string;
  transactionType?: "CWTFA" | "APTFA";
  authRequestId: string;
  amount?: string;
  bankIIN?: string;
  expiresAt: string;
  message?: string;
  nextAction?: "CAPTURE_BIOMETRIC_WITH_OTP";
};

async function call<T>(token: string, path: string, init: RequestInit = {}): Promise<T> {
  return authenticatedRequest<T>(path, init, token);
}

const get = <T>(token: string, path: string) => call<T>(token, path);
const post = <T>(token: string, path: string, body?: unknown, idempotencyKey?: string) =>
  call<T>(token, path, {
    method: "POST",
    body: JSON.stringify(body ?? {}),
    headers: idempotencyKey ? { "Idempotency-Key": idempotencyKey } : undefined,
  });

let providerRequest: Promise<AepsProvider> | null = null;

async function activeProvider(token: string): Promise<AepsProvider> {
  if (!providerRequest) {
    providerRequest = get<AepsProvider[]>(token, "/aeps/providers")
      .then((providers) => {
        const provider = providers.find((item) => item.status === "AVAILABLE") ?? providers[0];
        if (!provider?.providerCode || !provider.providerName) {
          throw new Error("No AEPS provider is currently available.");
        }
        return provider;
      })
      .catch((error) => {
        providerRequest = null;
        throw error;
      });
  }
  return providerRequest;
}

async function activeProviderCode(token: string): Promise<string> {
  return (await activeProvider(token)).providerCode;
}

async function providerPath(token: string, suffix: string): Promise<string> {
  const providerCode = await activeProviderCode(token);
  return `/aeps/providers/${encodeURIComponent(providerCode)}/${suffix}`;
}

export const aepsApi = {
  providers: (t: string) => get<AepsProvider[]>(t, "/aeps/providers"),
  status: async (t: string) => {
    const provider = await activeProvider(t);
    const status = await get<Omit<AepsStatus, "providerCode"> & { providerCode?: string }>(
      t,
      `/aeps/providers/${encodeURIComponent(provider.providerCode)}/status`,
    );
    return withSelectedAepsProvider(status, provider);
  },
  banks: async (t: string) =>
    get<MasterItem[]>(t, buildAepsOnboardingBankPath(await activeProviderCode(t))),
  states: async (t: string) => get<MasterItem[]>(t, await providerPath(t, "states")),
  districts: async (t: string, stateCode: string) =>
    get<MasterItem[]>(
      t,
      `${await providerPath(t, "districts")}?stateCode=${encodeURIComponent(stateCode)}`,
    ),
  bankIins: (t: string, providerCode: string, txnCode: AepsTxnCode, authType: AuthType) =>
    get<MasterItem[]>(t, buildAepsBankIinPath(providerCode, txnCode, authType)),
  savedBanks: (t: string) => get<SavedBank[]>(t, "/identity/get-my-bank-accounts"),
  myKyc: (t: string) => get<KycProfile>(t, "/kyc/me"),
  register: async (t: string, body: Record<string, string>) =>
    post<TransactionResult>(t, await providerPath(t, "onboarding/register"), body),
  sendOtp: async (t: string, resend = false) =>
    post<TransactionResult>(
      t,
      await providerPath(t, `onboarding/otp/${resend ? "resend" : "send"}`),
    ),
  verifyOtp: async (t: string, otp: string) =>
    post<TransactionResult>(t, await providerPath(t, "onboarding/otp/verify"), { otp }),
  ekyc: async (t: string, pidData: string) =>
    post<TransactionResult>(t, await providerPath(t, "onboarding/ekyc"), { pidData }),
  twoFactor: (
    t: string,
    body: { aadhaarNumber: string; deviceType: string; pidData: string; lat: string; long: string },
    idempotencyKey: string,
  ) =>
    providerPath(t, "onboarding/2fa").then((path) =>
      post<TransactionResult>(t, path, body, idempotencyKey),
    ),
  transactionOtp: async (t: string, operation: "CW" | "AP", body: Record<string, string>) =>
    post<TransactionOtpResult>(
      t,
      await providerPath(t, `${operation === "CW" ? "cash-withdrawal" : "aadhaar-pay"}/otp`),
      body,
    ),
  transact: (
    t: string,
    operation: AepsTxnCode,
    body: BiometricPayload & { amount?: string; authRequestId?: string },
    key?: string,
  ) => {
    const paths = {
      BE: "balance-enquiry",
      MS: "mini-statement",
      CW: "cash-withdrawal",
      AP: "aadhaar-pay",
      CD: "cash-deposit",
    } as const;
    return providerPath(t, paths[operation]).then((path) =>
      post<TransactionResult>(t, path, body, key),
    );
  },
};

export function newIdempotencyKey(): string {
  return createIdempotencyKey("aeps");
}

// Mock PID is opt-in and development-only. Production always calls the configured RD service.
export const USE_MOCK_FINGERPRINT = isMockPidEnabled(
  import.meta.env.DEV,
  import.meta.env.VITE_AEPS_USE_MOCK_PID,
);

export async function capturePid(
  rdUrl: string,
  pipe: string,
  otp?: string,
  includeWadh = true,
): Promise<string> {
  assertAepsCaptureSupported("BA");
  const wadh = includeWadh ? resolveAepsWadh(pipe) : "";
  if (USE_MOCK_FINGERPRINT) {
    console.warn("Using development-only mock fingerprint data.");
    return '<PidData><Resp errCode="0" errInfo="Success" fCount="1" fType="2" nmPoints="40" qScore="80"/><DeviceInfo dpId="TEST" rdsId="TEST" rdsVer="1.0" dc="TEST" mi="TEST" mc="TEST"/><Skey ci="20260901">TEST</Skey><Hmac>TEST</Hmac><Data type="X">TEST</Data></PidData>';
  }

  let endpoint: URL;
  try {
    endpoint = new URL(rdUrl);
  } catch {
    throw new Error("Enter a valid RD service capture URL.");
  }
  if (!["http:", "https:"].includes(endpoint.protocol))
    throw new Error("RD service URL must use HTTP or HTTPS.");
  const options = buildFingerprintPidOptions(wadh, otp);
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 12_000);
  let response: Response;
  try {
    response = await fetch(endpoint.toString(), {
      method: "CAPTURE",
      headers: { "Content-Type": "text/xml" },
      body: options,
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError")
      throw new Error("RD device capture timed out. Check the device and retry.");
    throw new Error(
      "Cannot connect to the RD service. Start the registered device service and confirm its capture URL.",
    );
  } finally {
    window.clearTimeout(timeout);
  }
  const xml = await response.text();
  if (!response.ok || !xml.includes("<PidData"))
    throw new Error("RD capture failed. Check the device service and try again.");
  const error = xml.match(/errCode=["']([^"']+)["']/)?.[1];
  if (error && error !== "0")
    throw new Error(xml.match(/errInfo=["']([^"']*)["']/)?.[1] || `RD device error ${error}`);
  return xml;
}
