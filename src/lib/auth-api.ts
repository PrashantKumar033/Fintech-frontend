import { getDeviceId } from "@/lib/device-id";

const browserDefaultApiUrl =
  typeof window !== "undefined"
    ? `${window.location.protocol}//${window.location.hostname}:8000`
    : "http://localhost:8000";

const API_URL = (import.meta.env.VITE_API_URL || browserDefaultApiUrl).replace(/\/$/, "");

if (!/^https?:\/\//.test(API_URL)) {
  throw new Error("VITE_API_URL must be an absolute HTTP(S) URL.");
}

export type LoginMethod = "PASSWORD" | "MPIN";
export type Identity = {
  id: string;
  loginId: string;
  fullName: string;
  username: string;
  email: string;
  phoneNumber: string;
  role: string;
  status: string;
  preferredLoginMethod: string;
  passwordChangedAt: Date | null;
  mpinChangedAt: Date | null;
};

export type ActiveSession = {
  id: string;
  identityId: string;
  device?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  locationAccuracy?: number | null;
  locationCapturedAt?: string | null;
  revoked: boolean;
  lastUsedAt?: string | null;
  expiresAt: string;
  createdAt: string;
  isCurrent: boolean;
};

export type EffectivePermission = {
  id: string;
  code: string;
  name: string;
  description?: string | null;
};

export type EffectivePermissionPackage = {
  id: string;
  code: string;
  name: string;
};

export type EffectiveAccess = {
  identity: { id: string; status: string };
  role: { id: string; name: string; isActive: boolean };
  packages: EffectivePermissionPackage[];
  permissions: EffectivePermission[];
  permissionCodes: string[];
};

const PERMISSION_CACHE_KEY = "nexus_effective_permissions";

export type RegistrationDetails = {
  draftId: string;
  fullName: string;
  aadhaarNumber: string;
  username: string;
  email: string;
  shopName: string;
  shopAddress: string;
  shopCity: string;
  shopState: string;
  city: string;
  state: string;
  pincode: string;
};
export type RegistrationResult = {
  success: boolean;
  message: string;
  loginId: string;
  temporaryPassword: string;
  temporaryMpin: string;
};

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export type IdentityOnboardingStep =
  | "ADD_AND_VERIFY_PHONE"
  | "VERIFY_PHONE_OTP"
  | "ADD_PAN"
  | "CHANGE_PASSWORD"
  | "CHANGE_MPIN"
  | "COMPLETE_ONBOARDING";
export type Session = {
  accessToken: string;
  identity: Identity;
  onboardingRequired?: boolean;
  onboardingStatus?: string;
  nextStep?: IdentityOnboardingStep | null;
};
export type DeviceVerificationChallenge = {
  requiresDeviceVerification: true;
  challengeId: string;
  maskedEmail: string;
  expiresAt: string;
  message: string;
};
export type LoginResult = Session | DeviceVerificationChallenge;

export function requiresDeviceVerification(
  result: LoginResult,
): result is DeviceVerificationChallenge {
  return "requiresDeviceVerification" in result && result.requiresDeviceVerification === true;
}
let refreshPromise: Promise<Session> | null = null;

function extractApiMessage(data: unknown): string | null {
  if (typeof data === "string" && data.trim()) return data;
  if (!data || typeof data !== "object") return null;

  const payload = data as Record<string, unknown>;
  if (Array.isArray(payload.message)) return payload.message.map(String).join(", ");
  if (typeof payload.message === "string" && payload.message.trim()) return payload.message;
  return (
    extractApiMessage(payload.message) ||
    extractApiMessage(payload.error) ||
    extractApiMessage(payload.response) ||
    (typeof payload.error === "string" && payload.error.trim() ? payload.error : null)
  );
}

async function request<T>(path: string, body: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (error) {
    console.error(`Auth API connection failed: ${API_URL}${path}`, error);
    throw new ApiError(
      "We could not connect to the service. Please try again in a few moments.",
      0,
    );
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new ApiError(
      extractApiMessage(data) || "We could not complete your request.",
      response.status,
    );
  }
  return data as T;
}

async function performSessionRefresh(rejectedAccessToken?: string): Promise<Session> {
  const latestSession = getSession();
  if (
    rejectedAccessToken &&
    latestSession?.accessToken &&
    latestSession.accessToken !== rejectedAccessToken
  ) {
    return latestSession;
  }
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    let response: Response;
    try {
      response = await fetch(`${API_URL}/auth/refresh`, {
        method: "POST",
        credentials: "include",
        headers: { Accept: "application/json" },
      });
    } catch {
      throw new ApiError("We could not refresh your session.", 0);
    }

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      // Only an authentication rejection proves that the refresh session is
      // unusable. A timeout, rate limit, or temporary backend error must not
      // sign the user out.
      if (response.status === 401 || response.status === 403) {
        clearSession();
        redirectToLogin();
      }
      throw new ApiError(
        extractApiMessage(data) || "Your session has expired. Please sign in again.",
        response.status,
      );
    }

    const session = data as Session;
    if (!session.accessToken || !session.identity) {
      throw new ApiError("The server returned an invalid refreshed session.", 500);
    }
    const existing = getSession();
    const refreshed = {
      ...session,
      onboardingRequired: session.onboardingRequired ?? existing?.onboardingRequired,
      onboardingStatus: session.onboardingStatus ?? existing?.onboardingStatus,
      nextStep: session.nextStep ?? existing?.nextStep,
    };
    saveSession(refreshed.accessToken, refreshed.identity, refreshed);
    return refreshed;
  })().finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
}

export async function refreshSession(rejectedAccessToken?: string): Promise<Session> {
  // Refresh tokens rotate after every use. Browser Locks serialize refreshes
  // across tabs; after waiting, the losing tab reuses the access token saved
  // by the winning tab instead of replaying the old refresh cookie.
  if (typeof navigator !== "undefined" && navigator.locks) {
    return navigator.locks.request("nexus-identity-session-refresh", () =>
      performSessionRefresh(rejectedAccessToken),
    );
  }
  return performSessionRefresh(rejectedAccessToken);
}

export async function authenticatedRequest<T>(
  path: string,
  init: RequestInit = {},
  accessToken?: string,
): Promise<T> {
  let response: Response;
  const send = (token: string) =>
    fetch(`${API_URL}${path}`, {
      ...init,
      credentials: "include",
      headers: {
        Accept: "application/json",
        ...(init.body && !(init.body instanceof FormData)
          ? { "Content-Type": "application/json" }
          : {}),
        ...init.headers,
        Authorization: `Bearer ${token}`,
      },
    });

  try {
    const currentToken = getSession()?.accessToken || accessToken;
    if (!currentToken) throw new ApiError("Your session has expired. Please sign in again.", 401);
    response = await send(currentToken);
    if (response.status === 401) {
      const refreshed = await refreshSession(currentToken);
      response = await send(refreshed.accessToken);
    }
  } catch (error) {
    if (error instanceof ApiError) throw error;
    console.error(`Auth API connection failed: ${API_URL}${path}`, error);
    throw new ApiError(
      "We could not connect to the service. Please try again in a few moments.",
      0,
    );
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401) {
      clearSession();
      redirectToLogin();
    }
    throw new ApiError(
      extractApiMessage(data) || "We could not complete your request.",
      response.status,
    );
  }
  return data as T;
}

export const authApi = {
  login: (body: { identifier: string; loginWith: LoginMethod; password: string }) =>
    request<LoginResult>("/auth/login", { ...body, deviceId: getDeviceId() }),
  verifyDeviceLogin: (challengeId: string, otp: string) =>
    request<Session & { success: boolean; trustedDevice?: boolean }>("/auth/login/verify-device", {
      challengeId,
      otp,
    }),
  sendPhoneOtp: (phoneNumber: string) =>
    request<{ message: string; otp?: string }>("/auth/send-phone-otp", { phoneNumber }),
  verifyPhoneOtp: (phoneNumber: string, otp: string) =>
    request<{ success?: boolean; message: string }>("/auth/verify-phone-otp", {
      phoneNumber,
      otp,
    }),
  sendEmailOtp: (email: string) =>
    request<{ message: string; otp?: string }>("/auth/send-email-otp", { email }),
  verifyEmailOtp: (email: string, otp: string) =>
    request<{ success?: boolean; message: string }>("/auth/verify-email-otp", { email, otp }),
  registerRole: (role: "RETAILER" | "DISTRIBUTOR") =>
    request<{ draftId: string; message: string }>("/auth/register/role", { role }),
  registerPhone: (draftId: string, phoneNumber: string) =>
    request<{ draftId: string; otp?: string; message: string }>("/auth/register/phone", {
      draftId,
      phoneNumber,
    }),
  verifyRegistrationOtp: (draftId: string, phoneNumber: string, otp: string) =>
    request<{ draftId: string; message: string }>("/auth/register/verify-otp", {
      draftId,
      phoneNumber,
      otp,
    }),
  registerPan: (draftId: string, panNumber: string) =>
    request<{ draftId: string; message: string }>("/auth/register/pan", { draftId, panNumber }),
  registerDetails: (body: RegistrationDetails) =>
    request<RegistrationResult>("/auth/register/details", body),
  changePassword: (accessToken: string, body: { currentPassword: string; newPassword: string }) =>
    authenticatedRequest<{ success: boolean; message: string }>(
      "/auth/change-password",
      { method: "POST", body: JSON.stringify(body) },
      accessToken,
    ),
  changeMpin: (accessToken: string, body: { currentMpin: string; newMpin: string }) =>
    authenticatedRequest<{ message: string }>(
      "/auth/change-mpin",
      { method: "POST", body: JSON.stringify(body) },
      accessToken,
    ),
  sendIdentityOnboardingPhoneOtp: (phoneNumber: string) =>
    authenticatedRequest<{
      message: string;
      otp?: string;
      onboardingStatus: string;
      nextStep: IdentityOnboardingStep;
    }>("/auth/onboarding/phone/send-otp", {
      method: "POST",
      body: JSON.stringify({ phoneNumber }),
    }),
  verifyIdentityOnboardingPhoneOtp: (otp: string) =>
    authenticatedRequest<{
      message: string;
      onboardingStatus: string;
      nextStep: IdentityOnboardingStep;
    }>("/auth/onboarding/phone/verify-otp", { method: "POST", body: JSON.stringify({ otp }) }),
  addIdentityOnboardingPan: (panNumber: string) =>
    authenticatedRequest<{
      message: string;
      onboardingStatus: string;
      nextStep: IdentityOnboardingStep;
      panVerificationStatus: string;
    }>("/auth/onboarding/pan", { method: "POST", body: JSON.stringify({ panNumber }) }),

  getSessions: () => authenticatedRequest<ActiveSession[]>("/auth/sessions"),
  getSessionDetails: (sessionId: string) =>
    authenticatedRequest<ActiveSession>(`/auth/sessions/${encodeURIComponent(sessionId)}`),
  revokeSession: (sessionId: string) =>
    authenticatedRequest<{
      success: boolean;
      message: string;
      sessionId: string;
      isCurrent: boolean;
    }>(`/auth/sessions/${encodeURIComponent(sessionId)}`, { method: "DELETE" }),
  revokeOtherSessions: () =>
    authenticatedRequest<{
      success: boolean;
      message: string;
      revokedCount: number;
      currentSessionId: string;
    }>("/auth/sessions/others", { method: "DELETE" }),
  revokeAllSessions: () =>
    authenticatedRequest<{ success: boolean; message: string; revokedCount: number }>(
      "/auth/sessions",
      { method: "DELETE" },
    ),
  getMyPermissions: (accessToken?: string) =>
    authenticatedRequest<EffectiveAccess>("/auth/me/permissions", {}, accessToken),

  forgotPasswordVerifyUser: (body: { loginId: string; panNumber: string; aadharLast4: string }) =>
    request<{ draftId: string; otp?: string; message: string }>(
      "/auth/forgot-password/verify-user",
      body,
    ),
  forgotPasswordVerifyOtp: (draftId: string, otp: string) =>
    request<{ draftId: string; message: string }>("/auth/forgot-password/verify-otp", {
      draftId,
      otp,
    }),
  forgotPasswordReset: (body: { draftId: string; newPassword: string; confirmPassword: string }) =>
    request<{ success: boolean; message: string }>("/auth/forgot-password/reset", body),
};

export function saveEffectiveAccess(access: EffectiveAccess) {
  if (typeof window === "undefined") return;
  localStorage.setItem(
    PERMISSION_CACHE_KEY,
    JSON.stringify({ ...access, fetchedAt: new Date().toISOString() }),
  );
}

export function getEffectiveAccess(): (EffectiveAccess & { fetchedAt?: string }) | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(PERMISSION_CACHE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as EffectiveAccess & { fetchedAt?: string };
  } catch {
    localStorage.removeItem(PERMISSION_CACHE_KEY);
    return null;
  }
}

export async function syncMyPermissions(accessToken?: string): Promise<EffectiveAccess> {
  const access = await authApi.getMyPermissions(accessToken);
  saveEffectiveAccess(access);
  return access;
}

export function hasPermission(code: string): boolean {
  const normalized = code.trim().toUpperCase();
  if (!normalized) return false;
  return Boolean(
    getEffectiveAccess()?.permissionCodes?.some((item) => item.toUpperCase() === normalized),
  );
}

export function saveSession(
  accessToken: string,
  identity: Identity,
  onboarding?: Pick<Session, "onboardingRequired" | "onboardingStatus" | "nextStep">,
) {
  if (typeof window === "undefined") return;
  if (!onboarding) localStorage.removeItem(PERMISSION_CACHE_KEY);
  const previousIdentityRaw = localStorage.getItem("nexus_identity");
  if (!onboarding && previousIdentityRaw) {
    try {
      const previousIdentity = JSON.parse(previousIdentityRaw) as Identity;
      if (previousIdentity.id !== identity.id) localStorage.removeItem("nexus_identity_onboarding");
    } catch {
      localStorage.removeItem("nexus_identity_onboarding");
    }
  }
  localStorage.setItem("nexus_access_token", accessToken);
  localStorage.setItem("nexus_identity", JSON.stringify(identity));
  if (onboarding) {
    localStorage.setItem(
      "nexus_identity_onboarding",
      JSON.stringify({
        onboardingRequired: onboarding.onboardingRequired,
        onboardingStatus: onboarding.onboardingStatus,
        nextStep: onboarding.nextStep,
      }),
    );
  }
}

export function updateIdentityOnboarding(
  nextStep: IdentityOnboardingStep | null,
  onboardingStatus?: string,
) {
  const session = getSession();
  if (!session) return;
  saveSession(session.accessToken, session.identity, {
    onboardingRequired: Boolean(nextStep && nextStep !== "COMPLETE_ONBOARDING"),
    onboardingStatus: onboardingStatus ?? session.onboardingStatus,
    nextStep,
  });
}

export function updateSessionIdentity(identity: Identity) {
  if (typeof window === "undefined") return;
  localStorage.setItem("nexus_identity", JSON.stringify(identity));
}

export function getSession(): Session | null {
  if (typeof window === "undefined") return null;
  const accessToken = localStorage.getItem("nexus_access_token");
  const identityRaw = localStorage.getItem("nexus_identity");
  if (!accessToken || !identityRaw) return null;
  try {
    const onboardingRaw = localStorage.getItem("nexus_identity_onboarding");
    const onboarding = onboardingRaw ? (JSON.parse(onboardingRaw) as Partial<Session>) : {};
    return { accessToken, identity: JSON.parse(identityRaw) as Identity, ...onboarding };
  } catch {
    return null;
  }
}

export function clearSession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("nexus_access_token");
  localStorage.removeItem("nexus_identity");
  localStorage.removeItem("nexus_identity_onboarding");
  localStorage.removeItem(PERMISSION_CACHE_KEY);
}

function redirectToLogin() {
  if (typeof window !== "undefined" && window.location.pathname !== "/login") {
    window.location.assign("/login");
  }
}

export async function logout() {
  try {
    await fetch(`${API_URL}/auth/logout`, {
      method: "POST",
      credentials: "include", // refreshToken cookie backend ko chahiye logout ke liye
    });
  } finally {
    clearSession(); // fetch fail then also local session will be clear
  }
}
