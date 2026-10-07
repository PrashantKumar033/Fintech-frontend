const browserDefaultApiUrl =
  typeof window !== "undefined"
    ? `${window.location.protocol}//${window.location.hostname}:8000`
    : "http://localhost:8081";

const API_URL = (import.meta.env.VITE_API_URL || browserDefaultApiUrl).replace(/\/$/, "");

if (!/^https?:\/\//.test(API_URL)) {
  throw new Error("VITE_API_URL must be an absolute HTTP(S) URL.");
}

export type LoginMethod = "PASSWORD" | "MPIN";
export type WalletBalanceValue = number | string | null;
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
  mainWalletBalance?: WalletBalanceValue;
  aepsWalletBalance?: WalletBalanceValue;
  profitWalletBalance?: WalletBalanceValue;
  walletBalances?: {
    main?: WalletBalanceValue;
    aeps?: WalletBalanceValue;
    profit?: WalletBalanceValue;
  };
};
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

type Session = { accessToken: string; identity: Identity };
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

export async function refreshSession(): Promise<Session> {
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
      clearSession();
      redirectToLogin();
      throw new ApiError(
        extractApiMessage(data) || "Your session has expired. Please sign in again.",
        response.status,
      );
    }

    const session = data as Session;
    if (!session.accessToken || !session.identity) {
      clearSession();
      redirectToLogin();
      throw new ApiError("The server returned an invalid refreshed session.", 500);
    }
    saveSession(session.accessToken, session.identity);
    return session;
  })().finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
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
      const refreshed = await refreshSession();
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
    request<{ accessToken: string; identity: Identity }>("/auth/login", body),
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

export function saveSession(accessToken: string, identity: Identity) {
  if (typeof window === "undefined") return;
  localStorage.setItem("nexus_access_token", accessToken);
  localStorage.setItem("nexus_identity", JSON.stringify(identity));
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
    return { accessToken, identity: JSON.parse(identityRaw) as Identity };
  } catch {
    return null;
  }
}

export function clearSession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("nexus_access_token");
  localStorage.removeItem("nexus_identity");
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
