import { clearSession, getSession, logout as identityLogout, refreshSession } from "@/lib/auth-api";
import { getDeviceId } from "@/lib/device-id";
import { isManagementRole } from "@/lib/role-hierarchy";
import type { ProviderTransaction } from "@/lib/operations-api";

const defaultUrl =
  typeof window !== "undefined"
    ? `${window.location.protocol}//${window.location.hostname}:8000`
    : "http://localhost:8000";
const API_URL = (import.meta.env.VITE_API_URL || defaultUrl).replace(/\/$/, "");
const TOKEN_KEY = "nexus_super_admin_access_token";
const SESSION_KEY = "nexus_super_admin_session";

export type AdminSession = {
  accessToken: string;
  onboardingRequired: boolean;
  onboardingStatus?: string;
  nextStep?: string;
  superAdmin?: { id?: string; loginId?: string; fullName?: string; email?: string; role?: string };
};
export type AdminDeviceVerificationChallenge = {
  requiresDeviceVerification: true;
  challengeId: string;
  maskedEmail: string;
  expiresAt: string;
  message: string;
};
export type AdminLoginResult = AdminSession | AdminDeviceVerificationChallenge;
export function adminRequiresDeviceVerification(
  result: AdminLoginResult,
): result is AdminDeviceVerificationChallenge {
  return "requiresDeviceVerification" in result && result.requiresDeviceVerification === true;
}
export type AdminEntity = {
  id: string;
  name: string;
  code?: string;
  prefix?: string;
  description?: string;
  price?: string;
  isActive: boolean;
  createdAt?: string;
};
export type PackagePermissionAssignment = {
  packageId: string;
  permissionId: string;
  permission: AdminEntity;
};
export type RolePackageAssignment = { roleId: string; packageId: string; package: AdminEntity };
export type RoleRegisterPermission = {
  registrarRoleId: string;
  targetRoleId: string;
  isActive: boolean;
  targetRole: AdminEntity;
};
export type RoleEffectiveAccess = {
  role: { id: string; name: string; isActive: boolean };
  packages: Array<{ id: string; code: string; name: string }>;
  permissions: Array<{ id: string; code: string; name: string; description?: string | null }>;
  permissionCodes: string[];
};
export type AuditLog = {
  id: string;
  eventId?: string;
  identityId?: string | null;
  loginId?: string | null;
  role?: string | null;
  service?: string;
  action?: string;
  status?: "SUCCESS" | "FAILED" | string;
  ipAddress?: string | null;
  userAgent?: string | null;
  resourceType?: string | null;
  resourceId?: string | null;
  errorMessage?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt?: string;
};
export type AuditPage = {
  data: AuditLog[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
};
export type TransactionDetail = Record<string, unknown> & {
  id?: string;
  referenceId?: string;
  userId?: string;
  serviceType?: string;
  provider?: string;
  operation?: string;
  amount?: string | number;
  status?: string;
  rrn?: string | null;
  providerTxnRefId?: string | null;
  createdAt?: string;
  updatedAt?: string;
};
export type AdminProviderTransaction = ProviderTransaction & {
  userId: string;
  sourceRole?: string | null;
  merchantRefId?: string | null;
  reversedAt?: string | null;
};
export type AdminProviderTransactionPage = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  data: AdminProviderTransaction[];
};
export type CommissionHierarchy = {
  id: string;
  parentUserId: string;
  parentRole: string;
  childUserId: string;
  childRole: string;
  serviceType?: string | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};
export type ReconciliationStatus = "PENDING" | "UNKNOWN";
export type ReconciliationResolution = "SUCCESS" | "FAILED";
export type ReconciliationItem = {
  referenceId: string;
  userId?: string;
  serviceType?: string;
  provider?: string;
  operation?: string;
  amount?: string | number;
  status?: ReconciliationStatus | string;
  providerMerchantRefId?: string | null;
  providerTxnRefId?: string | null;
  rrn?: string | null;
  npciCode?: string | null;
  npciMessage?: string | null;
  providerStatusCode?: string | null;
  providerStatusMessage?: string | null;
  bankIIN?: string | null;
  aadhaarLast4?: string | null;
  needsReconciliation?: boolean;
  reconciliationReason?: string | null;
  providerCalledAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
};
export type ReconciliationPage = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  data: ReconciliationItem[];
};
export type ResolveTransactionInput = {
  resolution: ReconciliationResolution;
  note?: string;
  providerTxnRefId?: string;
  rrn?: string;
  npciCode?: string;
  npciMessage?: string;
};
export type ResolveTransactionResult = Record<string, unknown> & {
  referenceId?: string;
  status?: string;
  needsReconciliation?: boolean;
  reconciledAt?: string | null;
};
export type ReversalRequestResult = Record<string, unknown> & {
  id?: string;
  referenceId?: string;
  providerTransactionId?: string;
  amount?: string | number;
  status?: string;
  reason?: string;
  requestedBy?: string;
  createdAt?: string;
  originalTransactionReference?: string;
  originalTransactionStatus?: string;
  nextAction?: string;
  duplicate?: boolean;
};
export type ProviderIncomeInput = {
  providerIncomeAmount?: number;
  incomeSource?: "VIMOPAY_WALLET" | "VIMOPAY_MS";
  externalReference?: string;
};
export type ProviderReversal = {
  referenceId: string;
  providerTransactionReference: string;
  provider: string;
  operation: string;
  userId: string;
  amount: string | number;
  status: "REQUESTED" | "PROCESSING" | "COMPLETED" | "FAILED" | string;
  principalStatus?: string;
  commissionStatus?: string;
  reason?: string;
  requestedBy?: string;
  processedBy?: string | null;
  failedReason?: string | null;
  createdAt?: string;
  completedAt?: string | null;
};
export type ProviderReversalPage = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  data: ProviderReversal[];
};
export type ProviderReversalDetail = {
  id?: string;
  referenceId: string;
  providerTransactionId?: string;
  idempotencyKey?: string;
  amount: string | number;
  status: "REQUESTED" | "PROCESSING" | "COMPLETED" | "FAILED" | "UNKNOWN" | string;
  reason?: string;
  requestedBy?: string;
  compensationReferenceId?: string | null;
  processingAt?: string | null;
  completedAt?: string | null;
  failedReason?: string | null;
  createdAt?: string;
  updatedAt?: string;
  principalStatus?: string;
  principalCompensationReference?: string | null;
  principalFailureReason?: string | null;
  commissionStatus?: string;
  commissionReversalReference?: string | null;
  commissionFailureReason?: string | null;
  processedBy?: string | null;
  providerTransaction?: ProviderTransaction;
};

export type CommissionRuleType = "FIXED" | "PERCENTAGE";
export type CommissionRule = {
  id: string;
  ruleKey: string;
  serviceType: string;
  operator?: string | null;
  role: string;
  commissionType: CommissionRuleType;
  commissionValue: string | number;
  minAmount?: string | number | null;
  maxAmount?: string | number | null;
  priority: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};
export type CreateCommissionRuleInput = {
  serviceType: string;
  operator?: string;
  role: string;
  commissionType: CommissionRuleType;
  commissionValue: number;
  minAmount?: number;
  maxAmount?: number;
  priority?: number;
  isActive?: boolean;
};
export type UpdateCommissionRuleInput = Partial<
  Omit<CreateCommissionRuleInput, "operator" | "minAmount" | "maxAmount">
> & {
  operator?: string | null;
  minAmount?: number | null;
  maxAmount?: number | null;
};

export type CommissionDistributionType = "FIXED" | "PERCENTAGE";
export type CommissionDistribution = {
  id: string;
  distributionKey?: string;
  commissionRuleId: string;
  recipientRole: string;
  distributionType: CommissionDistributionType;
  distributionValue: string | number;
  priority: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};
export type CreateCommissionDistributionInput = {
  commissionRuleId: string;
  recipientRole: string;
  distributionType: CommissionDistributionType;
  distributionValue: number;
  priority?: number;
  isActive?: boolean;
};
export type UpdateCommissionDistributionInput = {
  recipientRole?: string;
  distributionType?: CommissionDistributionType;
  distributionValue?: number;
  priority?: number;
  isActive?: boolean;
};

export type AdminLoginMethod = "PASSWORD" | "MPIN";
export type CreateManagedAccountInput = {
  role: string;
  fullName: string;
  username: string;
  email: string;
  city: string;
  state: string;
  pincode: string;
  shopName?: string;
  shopAddress?: string;
  shopCity?: string;
  shopState?: string;
};
export type CreateManagedAccountResult = {
  success: boolean;
  message: string;
  credentialsEmailQueued: boolean;
  account: {
    id: string;
    loginId: string;
    fullName: string;
    username: string;
    email: string;
    role: string;
    onboardingStatus: string;
    temporaryCredentialsExpireAt: string;
  };
};

export class AdminApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "AdminApiError";
  }
}

function messageOf(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value;
  if (!value || typeof value !== "object") return null;
  const data = value as Record<string, unknown>;
  if (Array.isArray(data.message)) return data.message.join(", ");
  return messageOf(data.message) || messageOf(data.error) || messageOf(data.response);
}
function storeSession(session: AdminSession) {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY, session.accessToken);
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}
export function getAdminSession(): AdminSession | null {
  if (typeof window === "undefined") return null;
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) return null;
  try {
    return {
      ...(JSON.parse(localStorage.getItem(SESSION_KEY) || "{}") as AdminSession),
      accessToken: token,
    };
  } catch {
    return null;
  }
}
export function clearAdminSession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(SESSION_KEY);
}
let refreshInFlight: Promise<AdminSession> | null = null;
async function parse<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new AdminApiError(
      messageOf(data) || "The request could not be completed.",
      response.status,
    );
  return data as T;
}
async function refresh(): Promise<AdminSession> {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = fetch(`${API_URL}/super-admin/auth/refresh`, {
    method: "POST",
    credentials: "include",
    headers: { Accept: "application/json" },
  })
    .then(parse<AdminSession>)
    .then((session) => {
      storeSession(session);
      return session;
    })
    .catch((error) => {
      clearAdminSession();
      throw error;
    })
    .finally(() => {
      refreshInFlight = null;
    });
  return refreshInFlight;
}
export function getAdminActor() {
  const superSession = getAdminSession();
  if (superSession)
    return {
      kind: "SUPER_ADMIN" as const,
      accessToken: superSession.accessToken,
      name: superSession.superAdmin?.fullName || "Super Admin",
      role: "SUPER_ADMIN",
    };
  const identitySession = getSession();
  const role = identitySession?.identity.role?.trim().toUpperCase();
  if (identitySession && (role === "SUPER_ADMIN" || isManagementRole(role)))
    return {
      kind: "IDENTITY_ADMIN" as const,
      accessToken: identitySession.accessToken,
      name: identitySession.identity.fullName || "Administrator",
      role: role!,
    };
  return null;
}
async function call<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
  const actor = getAdminActor();
  const token = actor?.accessToken;
  if (!token) throw new AdminApiError("Super Admin session is missing.", 401);
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...init,
      credentials: "include",
      headers: {
        Accept: "application/json",
        ...(init.body ? { "Content-Type": "application/json" } : {}),
        ...init.headers,
        Authorization: `Bearer ${token}`,
      },
    });
  } catch {
    throw new AdminApiError("Cannot connect to the API Gateway on port 8000.", 0);
  }
  if (response.status === 401 && retry) {
    if (actor?.kind === "SUPER_ADMIN") await refresh();
    else await refreshSession();
    return call<T>(path, init, false);
  }
  return parse<T>(response);
}
const json = (method: string, body?: unknown): RequestInit => ({
  method,
  ...(body === undefined ? {} : { body: JSON.stringify(body) }),
});

export const adminAuthApi = {
  async login(identifier: string, loginWith: AdminLoginMethod, credential: string) {
    const response = await fetch(`${API_URL}/super-admin/auth/login`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        identifier,
        loginWith,
        password: credential,
        deviceId: getDeviceId(),
      }),
    });
    const result = await parse<AdminLoginResult>(response);
    if (!adminRequiresDeviceVerification(result)) storeSession(result);
    return result;
  },
  async verifyDeviceLogin(challengeId: string, otp: string) {
    const response = await fetch(`${API_URL}/super-admin/auth/login/verify-device`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ challengeId, otp }),
    });
    const session = await parse<AdminSession & { success: boolean; trustedDevice?: boolean }>(
      response,
    );
    storeSession(session);
    return session;
  },
  sendOnboardingPhoneOtp: (phoneNumber: string) =>
    call<{ message: string; onboardingStatus: string; nextStep: string }>(
      "/super-admin/auth/onboarding/phone/send-otp",
      json("POST", { phoneNumber }),
    ),
  verifyOnboardingPhoneOtp: (otp: string) =>
    call<{ message: string; onboardingStatus: string; nextStep: string }>(
      "/super-admin/auth/onboarding/phone/verify-otp",
      json("POST", { otp }),
    ),
  addOnboardingPan: (panNumber: string) =>
    call<{ message: string; onboardingStatus: string; nextStep: string }>(
      "/super-admin/auth/onboarding/pan",
      json("POST", { panNumber }),
    ),
  changeOnboardingPassword: (currentPassword: string, newPassword: string) =>
    call<{ message: string; onboardingRequired: boolean; nextStep: string }>(
      "/super-admin/auth/onboarding/change-password",
      json("POST", { currentPassword, newPassword }),
    ),
  changeOnboardingMpin: (currentMpin: string, newMpin: string) =>
    call<{ message: string; onboardingRequired: boolean; nextStep: null }>(
      "/super-admin/auth/onboarding/change-mpin",
      json("POST", { currentMpin, newMpin }),
    ),
  async logout() {
    const actor = getAdminActor();
    try {
      if (actor?.kind === "SUPER_ADMIN") await call("/super-admin/auth/logout", { method: "POST" });
      else if (actor?.kind === "IDENTITY_ADMIN") await identityLogout();
    } finally {
      clearAdminSession();
      clearSession();
    }
  },
};

export function updateAdminOnboarding(nextStep: string | null, onboardingStatus?: string) {
  const session = getAdminSession();
  if (!session) return;
  storeSession({
    ...session,
    nextStep: nextStep || undefined,
    onboardingStatus: onboardingStatus || session.onboardingStatus,
    onboardingRequired: Boolean(nextStep),
  });
}

export const adminApi = {
  roles: {
    list: () => call<unknown>("/roles"),
    create: (body: unknown) => call("/roles", json("POST", body)),
    update: (id: string, body: unknown) => call(`/roles/${id}`, json("PATCH", body)),
    status: (id: string, isActive: boolean) =>
      call(`/roles/${id}/status`, json("PATCH", { isActive })),
    packages: (id: string) => call<RolePackageAssignment[]>(`/roles/${id}/packages`),
    assignPackage: (id: string, packageId: string) =>
      call<RolePackageAssignment>(`/roles/${id}/packages`, json("POST", { packageId })),
    removePackage: (id: string, packageId: string) =>
      call(`/roles/${id}/packages/${packageId}`, { method: "DELETE" }),
    registrationPermissions: (id: string) =>
      call<RoleRegisterPermission[]>(`/roles/${id}/register-permissions`),
    allowRegistration: (id: string, targetRoleId: string) =>
      call<RoleRegisterPermission>(
        `/roles/${id}/register-permissions`,
        json("POST", { targetRoleId, isActive: true }),
      ),
    registrationStatus: (id: string, targetRoleId: string, isActive: boolean) =>
      call<RoleRegisterPermission>(
        `/roles/${id}/register-permissions/${targetRoleId}/status`,
        json("PATCH", { isActive }),
      ),
    removeRegistration: (id: string, targetRoleId: string) =>
      call(`/roles/${id}/register-permissions/${targetRoleId}`, { method: "DELETE" }),
    effectivePermissions: (id: string) =>
      call<RoleEffectiveAccess>(`/roles/${id}/effective-permissions`),
  },
  permissions: {
    list: () => call<unknown>("/permissions"),
    create: (body: unknown) => call("/permissions", json("POST", body)),
    update: (id: string, body: unknown) => call(`/permissions/${id}`, json("PATCH", body)),
    status: (id: string, isActive: boolean) =>
      call(`/permissions/${id}/status`, json("PATCH", { isActive })),
  },
  packages: {
    list: () => call<unknown>("/packages"),
    create: (body: unknown) => call("/packages", json("POST", body)),
    update: (id: string, body: unknown) => call(`/packages/${id}`, json("PATCH", body)),
    status: (id: string, isActive: boolean) =>
      call(`/packages/${id}/status`, json("PATCH", { isActive })),
    permissions: (id: string) => call<PackagePermissionAssignment[]>(`/packages/${id}/permissions`),
    assignPermission: (id: string, permissionId: string) =>
      call(`/packages/${id}/permissions`, json("POST", { permissionId })),
    removePermission: (id: string, permissionId: string) =>
      call(`/packages/${id}/permissions/${permissionId}`, { method: "DELETE" }),
  },
  async createAccount(body: CreateManagedAccountInput) {
    const actor = getAdminActor();
    const path = actor?.kind === "SUPER_ADMIN" ? "/super-admin/accounts" : "/accounts";
    try {
      return await call<CreateManagedAccountResult>(path, json("POST", body));
    } catch (error) {
      if (error instanceof AdminApiError && error.status >= 500)
        throw new AdminApiError(
          "The account service could not complete the request. Confirm admin-service and auth-service are connected to Kafka, then try again.",
          error.status,
        );
      throw error;
    }
  },
  auditLogs: (query = "") => {
    const path = getAdminActor()?.kind === "SUPER_ADMIN" ? "/audit" : "/audit/me";
    return call<AuditPage>(`${path}${query ? `?${query}` : ""}`);
  },
  auditLog: (auditId: string) =>
    call<AuditLog>(`/audit/me/${encodeURIComponent(auditId)}`),
  transaction: (referenceId: string) =>
    call<TransactionDetail>(`/admin/transactions/provider/${encodeURIComponent(referenceId)}`),
  providerTransactions: (query = "") =>
    call<AdminProviderTransactionPage>(`/admin/transactions/provider${query ? `?${query}` : ""}`),
  pendingProviderIncome: (query = "") =>
    call<AdminProviderTransactionPage>(
      `/admin/transactions/provider-income/pending${query ? `?${query}` : ""}`,
    ),
  reconcileProviderIncome: (referenceId: string, body: ProviderIncomeInput) =>
    call(
      `/admin/transactions/${encodeURIComponent(referenceId)}/provider-income/reconcile`,
      json("POST", body),
    ),
  reconciliation: (query = "") =>
    call<ReconciliationPage>(`/admin/transactions/reconciliation${query ? `?${query}` : ""}`),
  resolveTransaction: (referenceId: string, body: ResolveTransactionInput) =>
    call<ResolveTransactionResult>(
      `/admin/transactions/reconciliation/${encodeURIComponent(referenceId)}/resolve`,
      json("POST", body),
    ),
  recoverFinancialEffects: (referenceId: string) =>
    call(
      `/admin/transactions/reconciliation/${encodeURIComponent(referenceId)}/recover-financial-effects`,
      { method: "POST" },
    ),
  requestReversal: (referenceId: string, reason: string, idempotencyKey: string) =>
    call<ReversalRequestResult>(`/admin/transactions/${encodeURIComponent(referenceId)}/reversal`, {
      ...json("POST", { reason }),
      headers: { "Idempotency-Key": idempotencyKey },
    }),
  reversals: (query = "") =>
    call<ProviderReversalPage>(`/admin/transactions/reversals${query ? `?${query}` : ""}`),
  reversal: (referenceId: string) =>
    call<ProviderReversalDetail>(
      `/admin/transactions/reversals/${encodeURIComponent(referenceId)}`,
    ),
  processReversal: (referenceId: string) =>
    call<ProviderReversalDetail>(
      `/admin/transactions/reversals/${encodeURIComponent(referenceId)}/process`,
      { method: "POST" },
    ),
  commissionRules: {
    list: () => call<CommissionRule[]>("/commission-rules"),
    get: (id: string) => call<CommissionRule>(`/commission-rules/${encodeURIComponent(id)}`),
    create: (body: CreateCommissionRuleInput) =>
      call<CommissionRule>("/commission-rules", json("POST", body)),
    update: (id: string, body: UpdateCommissionRuleInput) =>
      call<CommissionRule>(`/commission-rules/${encodeURIComponent(id)}`, json("PATCH", body)),
    deactivate: (id: string) =>
      call<CommissionRule>(`/commission-rules/${encodeURIComponent(id)}`, { method: "DELETE" }),
  },
  commissionDistributions: {
    list: (commissionRuleId?: string) =>
      call<CommissionDistribution[]>(
        `/commission-distributions/distributions${
          commissionRuleId ? `?commissionRuleId=${encodeURIComponent(commissionRuleId)}` : ""
        }`,
      ),
    get: (id: string) =>
      call<CommissionDistribution>(
        `/commission-distributions/distributions/${encodeURIComponent(id)}`,
      ),
    create: (body: CreateCommissionDistributionInput) =>
      call<CommissionDistribution>("/commission-distributions/distributions", json("POST", body)),
    update: (id: string, body: UpdateCommissionDistributionInput) =>
      call<CommissionDistribution>(
        `/commission-distributions/distributions/${encodeURIComponent(id)}`,
        json("PATCH", body),
      ),
    deactivate: (id: string) =>
      call<CommissionDistribution>(
        `/commission-distributions/distributions/${encodeURIComponent(id)}`,
        {
          method: "DELETE",
        },
      ),
  },
  commissionHierarchy: {
    list: (serviceType?: string) =>
      call<CommissionHierarchy[]>(
        `/commission-hierarchy${serviceType ? `?serviceType=${encodeURIComponent(serviceType)}` : ""}`,
      ),
    create: (body: Omit<CommissionHierarchy, "id" | "createdAt" | "updatedAt">) =>
      call<CommissionHierarchy>("/commission-hierarchy", json("POST", body)),
    update: (id: string, body: { serviceType?: string; isActive?: boolean }) =>
      call<CommissionHierarchy>(
        `/commission-hierarchy/${encodeURIComponent(id)}`,
        json("PATCH", body),
      ),
    remove: (id: string) =>
      call(`/commission-hierarchy/${encodeURIComponent(id)}`, { method: "DELETE" }),
    resolve: (sourceUserId: string, serviceType: string) =>
      call<unknown>(
        `/commission-hierarchy/resolve/${encodeURIComponent(sourceUserId)}?serviceType=${encodeURIComponent(serviceType)}`,
      ),
    parents: (childUserId: string, serviceType?: string) =>
      call<CommissionHierarchy[]>(
        `/commission-hierarchy/child/${encodeURIComponent(childUserId)}/parents${serviceType ? `?serviceType=${encodeURIComponent(serviceType)}` : ""}`,
      ),
  },
};

export function asArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (!value || typeof value !== "object") return [];
  const object = value as Record<string, unknown>;
  for (const key of [
    "data",
    "items",
    "results",
    "records",
    "roles",
    "permissions",
    "packages",
    "transactions",
    "logs",
  ])
    if (Array.isArray(object[key])) return object[key] as T[];
  if (object.data && typeof object.data === "object") return asArray<T>(object.data);
  return [];
}
