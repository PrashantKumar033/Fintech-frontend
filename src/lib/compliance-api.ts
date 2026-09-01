import { ApiError, authenticatedRequest } from "./auth-api";

export type BankAccount = {
  id: string; bankName: string; bankCode?: string; ifsc: string; branchName?: string;
  accountHolderName: string; accountNumberLast4: string; accountType: "SAVINGS" | "CURRENT" | "SALARY";
  purposes: string[]; status: string; verificationStatus: string; ownershipStatus: string; isDefault: boolean;
};

export type KycProfile = { id: string; status: "PENDING" | "UNDER_REVIEW" | "APPROVED" | "REJECTED"; remarks?: string | null };
export type KycDocument = { id: string; documentType: string; originalFileName: string; verificationStatus: string };
export type KycBundle = { kyc: KycProfile; documents: KycDocument[]; video: { id: string; status: string } | null };

const idempotencyKey = () => crypto.randomUUID();
const form = (fields: Record<string, string>, files: Record<string, File>) => {
  const data = new FormData();
  Object.entries(fields).forEach(([key, value]) => value && data.append(key, value));
  Object.entries(files).forEach(([key, value]) => data.append(key, value));
  return data;
};

export const complianceApi = {
  banks: (token: string) => authenticatedRequest<BankAccount[]>("/identity/get-my-bank-accounts", {}, token),
  addBank: (token: string, body: { bankName: string; ifsc: string; branchName?: string; accountHolderName: string; accountNumber: string; accountType: "SAVINGS" | "CURRENT"; purposes: string[] }) =>
    authenticatedRequest<BankAccount>("/identity/bank-accounts", { method: "POST", body: JSON.stringify(body) }, token),
  setPrimary: (token: string, id: string) => authenticatedRequest<BankAccount>(`/identity/my-bank-accounts/${id}/set-primary`, { method: "PATCH" }, token),
  getKyc: (token: string) => authenticatedRequest<KycProfile>("/kyc/me", {}, token),
  createKyc: (token: string) => authenticatedRequest<KycProfile>("/kyc/create", { method: "POST", body: JSON.stringify({}) }, token),
  bundle: (token: string) => authenticatedRequest<KycBundle>("/kyc/me/documents?page=1&limit=100", {}, token),
  uploadDocument: (token: string, documentType: string, documentNumber: string, file: File) =>
    authenticatedRequest("/kyc/document", { method: "POST", headers: { "Idempotency-Key": idempotencyKey() }, body: form({ documentType, documentNumber }, { file }) }, token),
  uploadAadhaar: (token: string, documentNumber: string, frontImage: File, backImage: File) =>
    authenticatedRequest("/kyc/aadhaar", { method: "POST", headers: { "Idempotency-Key": idempotencyKey() }, body: form({ documentNumber }, { frontImage, backImage }) }, token),
  uploadVideo: (token: string, file: File) =>
    authenticatedRequest("/kyc/video", { method: "POST", headers: { "Idempotency-Key": idempotencyKey() }, body: form({}, { file }) }, token),
  submitKyc: (token: string) => authenticatedRequest<{ success: boolean; message: string }>("/kyc/submit", { method: "POST", headers: { "Idempotency-Key": idempotencyKey() }, body: JSON.stringify({}) }, token),
};

export function complianceMessage(error: unknown) {
  return error instanceof ApiError ? error.message : error instanceof Error ? error.message : "Request failed.";
}
