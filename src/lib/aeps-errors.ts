export function aepsErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : "Something went wrong.";

  if (
    message.includes("Unique constraint failed") ||
    message.includes("aepsMerchantProfile.update") ||
    message.includes("AEPS_PROVIDER_MERCHANT_ALREADY_LINKED")
  ) {
    return "This provider merchant ID is already linked to another account. Please contact support with your registered mobile number; repeated submission will not fix it.";
  }
  if (message === "Internal server error") {
    return "AEPS registration could not be completed right now. Please try once more; if it continues, contact support.";
  }

  // Preserve actionable provider validation messages exactly as supplied by the backend.
  return message;
}
