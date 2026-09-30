import { ApiError, authenticatedRequest } from "./auth-api";
import { createIdempotencyKey } from "./idempotency-key";

export type BankAccountType = "SAVINGS" | "CURRENT" | "SALARY";
export type BankAccountPurpose = "PAYOUT" | "DMT";
export type BankAccountStatus = "PENDING" | "ACTIVE" | "INACTIVE" | "BLOCKED";
export type BankVerificationStatus = "PENDING" | "PROCESSING" | "VERIFIED" | "REJECTED" | "FAILED";
export type BankOwnershipStatus = "PENDING" | "VERIFIED" | "FAILED";
export type BankAdminReviewStatus = "PENDING" | "APPROVED" | "REJECTED";
export type BankAccount = {
  id: string;
  identityId?: string;
  bankName: string;
  bankCode?: string | null;
  ifsc: string;
  branchName?: string | null;
  accountHolderName: string;
  accountNumberLast4: string;
  accountType: BankAccountType;
  purposes: BankAccountPurpose[];
  status: BankAccountStatus;
  verificationStatus: BankVerificationStatus;
  ownershipStatus: BankOwnershipStatus;
  adminReviewStatus: BankAdminReviewStatus;
  adminReviewReason?: string | null;
  adminReviewedAt?: string | null;
  passbookOriginalName?: string | null;
  passbookMimeType?: string | null;
  verifiedAt?: string | null;
  isDefault: boolean;
  isDmtDefault?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type BankAccountInput = {
  bankName: string;
  bankCode?: string;
  ifsc: string;
  branchName?: string;
  accountHolderName: string;
  accountNumber: string;
  confirmAccountNumber: string;
  accountType: BankAccountType;
  purposes: BankAccountPurpose[];
  lat: string;
  long: string;
};
export type BankAccountUpdate = Partial<Omit<BankAccountInput, "accountNumber">> & {
  accountNumber?: string;
  confirmAccountNumber?: string;
};

function bankAccountForm(body: BankAccountInput | BankAccountUpdate, passbook?: File): FormData {
  const data = new FormData();
  Object.entries(body).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    data.append(key, Array.isArray(value) ? value.join(",") : String(value));
  });
  if (passbook) data.append("passbook", passbook);
  return data;
}

export type KycProfile = {
  id: string;
  status: "PENDING" | "UNDER_REVIEW" | "APPROVED" | "REJECTED";
  remarks?: string | null;
};
export type KycDocumentType =
  "SIGNATURE" | "PAN_CARD" | "AADHAAR_FRONT" | "AADHAAR_BACK" | "SHOP_FRONT" | "BUSINESS_PROOF";
export type KycDocument = {
  id: string;
  documentType: KycDocumentType;
  documentNumber?: string | null;
  originalFileName: string;
  mimeType?: string | null;
  verificationStatus: string;
  previewUrl?: string | null;
  createdAt?: string;
};
export type KycVideo = {
  id: string;
  status: string;
  originalFileName?: string;
  mimeType?: string | null;
  previewUrl?: string | null;
};
export type KycBundle = {
  kyc: Pick<KycProfile, "id" | "status">;
  documents: KycDocument[];
  video: KycVideo | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
    hasVideo: boolean;
  };
};

const form = (fields: Record<string, string>, files: Record<string, File>) => {
  const data = new FormData();
  Object.entries(fields).forEach(([key, value]) => value && data.append(key, value));
  Object.entries(files).forEach(([key, value]) => data.append(key, value));
  return data;
};

export const complianceApi = {
  banks: (token: string) =>
    authenticatedRequest<BankAccount[]>(
      "/identity/get-my-bank-accounts",
      { cache: "no-store" },
      token,
    ),
  bank: (token: string, id: string) =>
    authenticatedRequest<BankAccount>(
      `/identity/get-my-bank-account/${id}`,
      { cache: "no-store" },
      token,
    ),
  primaryBank: (token: string, purpose: BankAccountPurpose = "PAYOUT") =>
    authenticatedRequest<BankAccount>(
      `/identity/my-bank-accounts/primary?purpose=${encodeURIComponent(purpose)}`,
      { cache: "no-store" },
      token,
    ),
  bankDirectory: (token: string) => authenticatedRequest<unknown>("/bank/list", {}, token),
  addBank: (
    token: string,
    body: BankAccountInput,
    passbook: File,
    idempotencyKey = createIdempotencyKey("bank-create"),
  ) =>
    authenticatedRequest<BankAccount>(
      "/identity/bank-accounts",
      {
        method: "POST",
        headers: { "Idempotency-Key": idempotencyKey },
        body: bankAccountForm(body, passbook),
      },
      token,
    ),
  updateBank: (token: string, id: string, body: BankAccountUpdate, passbook?: File) =>
    authenticatedRequest<BankAccount>(
      `/identity/update-my-bank-account/${id}`,
      {
        method: "PATCH",
        body: bankAccountForm(body, passbook),
      },
      token,
    ),
  deleteBank: (token: string, id: string) =>
    authenticatedRequest<{ success?: boolean; message?: string }>(
      `/identity/delete-my-bank-account/${id}`,
      { method: "DELETE" },
      token,
    ),
  setPrimary: (token: string, id: string, purpose: BankAccountPurpose = "PAYOUT") =>
    authenticatedRequest<BankAccount>(
      `/identity/my-bank-accounts/${id}/set-primary`,
      { method: "PATCH", body: JSON.stringify({ purpose }) },
      token,
    ),
  getKyc: (token: string) =>
    authenticatedRequest<KycProfile>("/kyc/me", { cache: "no-store" }, token),
  createKyc: (token: string) =>
    authenticatedRequest<KycProfile>(
      "/kyc/create",
      { method: "POST", body: JSON.stringify({}) },
      token,
    ),
  bundle: (token: string) =>
    authenticatedRequest<KycBundle>(
      "/kyc/me/documents?page=1&limit=100",
      { cache: "no-store" },
      token,
    ),
  uploadDocument: (token: string, documentType: string, documentNumber: string, file: File) =>
    authenticatedRequest(
      "/kyc/document",
      {
        method: "POST",
        headers: { "Idempotency-Key": createIdempotencyKey("kyc-document") },
        body: form({ documentType, documentNumber }, { file }),
      },
      token,
    ),
  uploadAadhaar: (token: string, documentNumber: string, frontImage: File, backImage: File) =>
    authenticatedRequest(
      "/kyc/aadhaar",
      {
        method: "POST",
        headers: { "Idempotency-Key": createIdempotencyKey("kyc-aadhaar") },
        body: form({ documentNumber }, { frontImage, backImage }),
      },
      token,
    ),
  uploadVideo: (token: string, file: File) =>
    authenticatedRequest(
      "/kyc/video",
      {
        method: "POST",
        headers: { "Idempotency-Key": createIdempotencyKey("kyc-video") },
        body: form({}, { file }),
      },
      token,
    ),
  updateDocument: (
    token: string,
    documentType: KycDocumentType,
    documentNumber: string,
    file: File,
  ) =>
    authenticatedRequest(
      "/kyc/document",
      { method: "PUT", body: form({ documentType, documentNumber }, { file }) },
      token,
    ),
  updateAadhaar: (token: string, documentNumber: string, frontImage?: File, backImage?: File) =>
    authenticatedRequest(
      "/kyc/aadhaar",
      {
        method: "PUT",
        body: form(
          { documentNumber },
          { ...(frontImage ? { frontImage } : {}), ...(backImage ? { backImage } : {}) },
        ),
      },
      token,
    ),
  deleteDocument: (token: string, id: string) =>
    authenticatedRequest<{ success?: boolean; message?: string }>(
      `/kyc/document/${id}`,
      { method: "DELETE" },
      token,
    ),
  deleteVideo: (token: string, id: string) =>
    authenticatedRequest<{ success?: boolean; message?: string }>(
      `/kyc/video/${id}`,
      { method: "DELETE" },
      token,
    ),
  submitKyc: (token: string) =>
    authenticatedRequest<{ success: boolean; message: string }>(
      "/kyc/submit",
      {
        method: "POST",
        headers: { "Idempotency-Key": createIdempotencyKey("kyc-submit") },
        body: JSON.stringify({}),
      },
      token,
    ),
};

export function complianceMessage(error: unknown) {
  return error instanceof ApiError
    ? error.message
    : error instanceof Error
      ? error.message
      : "Request failed.";
}
