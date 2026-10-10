export type AepsPipe = "1" | "2" | "4";
export type AepsWadhValues = Record<AepsPipe, string | undefined>;

function configuredAepsWadhValues(): AepsWadhValues {
  return {
    "1": import.meta.env.VITE_AEPS_PIPE_1_WADH,
    "2": import.meta.env.VITE_AEPS_PIPE_2_WADH,
    "4": import.meta.env.VITE_AEPS_PIPE_4_WADH,
  };
}

export function resolveAepsWadh(
  pipe: string,
  values?: AepsWadhValues,
  allowPipe1?: boolean,
): string {
  const configuredValues = values ?? configuredAepsWadhValues();
  const pipe1Allowed = allowPipe1 ?? import.meta.env.VITE_AEPS_ALLOW_PIPE_1 === "true";
  const allowedPipe = pipe === "2" || pipe === "4" || (pipe === "1" && pipe1Allowed);
  const wadh = (allowedPipe ? configuredValues[pipe as AepsPipe] : undefined)?.trim();
  if (!wadh) {
    throw new Error(`AEPS biometric configuration is unavailable for pipe ${pipe || "unknown"}.`);
  }
  return wadh;
}

function escapeXmlAttribute(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

export function buildFingerprintPidOptions(wadh: string, otp?: string): string {
  if (otp && !/^\d{4,8}$/.test(otp)) {
    throw new Error("RD provider OTP must contain 4 to 8 digits.");
  }
  return `<?xml version="1.0"?><PidOptions ver="1.0"><Opts fCount="1" fType="2" iCount="0" pCount="0" format="0" pidVer="2.0" timeout="10000" otp="${escapeXmlAttribute(otp || "")}" env="P" wadh="${escapeXmlAttribute(wadh)}" posh="UNKNOWN"/></PidOptions>`;
}

export function isMockPidEnabled(isDevelopment: boolean, configuredValue?: string): boolean {
  return isDevelopment && configuredValue === "true";
}

export type TransactionAuthorization = {
  authRequestId: string;
  expiresAt: string;
};

export function pidDataAfterBindingChange(
  pidData: string,
  previousBinding: string | undefined,
  nextBinding: string | undefined,
): string {
  return previousBinding === nextBinding ? pidData : "";
}

export function transactionAuthorizationFromResponse(
  response: TransactionAuthorization,
): TransactionAuthorization {
  return {
    authRequestId: response.authRequestId,
    expiresAt: response.expiresAt,
  };
}

export function buildAepsTransactionRequest<T extends { amount?: string }>(
  form: T,
  needsAmount: boolean,
  authorization?: TransactionAuthorization,
): Omit<T, "pipe" | "otp"> & { amount?: string; authRequestId?: string } {
  const body = { ...form } as Record<string, unknown>;
  delete body.pipe;
  delete body.otp;
  if (!needsAmount) delete body.amount;
  if (authorization) body.authRequestId = authorization.authRequestId;
  return body as Omit<T, "pipe" | "otp"> & { amount?: string; authRequestId?: string };
}
