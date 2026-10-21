export const AEPS_MCC_OPTIONS = [
  "4215",
  "4722",
  "4812",
  "4814",
  "4900",
  "5044",
  "5045",
  "5111",
  "5331",
  "5411",
  "6533",
] as const;

export type AepsRegistrationForm = {
  bankAccountId: string;
  kycProfileId: string;
  bankCode: string;
  lat: string;
  long: string;
  firstName: string;
  middleName: string;
  lastName: string;
  dob: string;
  emailId: string;
  merchantPhoneNumber: string;
  merchantAddress1: string;
  merchantAddress2: string;
  merchantState: string;
  merchantDistrict: string;
  gender: string;
  shopName: string;
  motherName: string;
  fatherName: string;
  maritalStatus: string;
  mcc: string;
  merchantPinCode: string;
  merchantPan: string;
  aadhaarNumber: string;
  shopPan: string;
  shopAddress: string;
  shopDistrict: string;
  shopState: string;
  shopPincode: string;
  shopLat: string;
  shopLong: string;
};

export type AepsRegistrationField = keyof AepsRegistrationForm;
export type AepsRegistrationErrors = Partial<Record<AepsRegistrationField, string>>;

export const EMPTY_AEPS_REGISTRATION: AepsRegistrationForm = {
  bankAccountId: "",
  kycProfileId: "",
  bankCode: "",
  lat: "",
  long: "",
  firstName: "",
  middleName: "",
  lastName: "",
  dob: "",
  emailId: "",
  merchantPhoneNumber: "",
  merchantAddress1: "",
  merchantAddress2: "",
  merchantState: "",
  merchantDistrict: "",
  gender: "M",
  shopName: "",
  motherName: "",
  fatherName: "",
  maritalStatus: "SINGLE",
  mcc: "",
  merchantPinCode: "",
  merchantPan: "",
  aadhaarNumber: "",
  shopPan: "",
  shopAddress: "",
  shopDistrict: "",
  shopState: "",
  shopPincode: "",
  shopLat: "",
  shopLong: "",
};

const OPTIONAL_FIELDS = new Set<AepsRegistrationField>(["middleName", "merchantAddress2"]);
const REGISTRATION_FIELDS = Object.keys(EMPTY_AEPS_REGISTRATION) as AepsRegistrationField[];
const FORBIDDEN_BANK_CODE_ALIASES = ["providerBankCode", "vimopayBankCode"];

function validCoordinate(value: string, minimum: number, maximum: number): boolean {
  if (!/^-?\d+(\.\d+)?$/.test(value)) return false;
  const coordinate = Number(value);
  return Number.isFinite(coordinate) && coordinate >= minimum && coordinate <= maximum;
}

export function validateAepsRegistration(form: AepsRegistrationForm): AepsRegistrationErrors {
  const errors: AepsRegistrationErrors = {};

  for (const field of REGISTRATION_FIELDS) {
    if (!OPTIONAL_FIELDS.has(field) && !form[field].trim()) {
      errors[field] = "This field is required.";
    }
  }

  if (form.bankCode && !/^\d+$/.test(form.bankCode)) {
    errors.bankCode = "Select a valid numeric bank code.";
  }
  if (form.dob && !/^\d{2}-\d{2}-\d{4}$/.test(form.dob)) {
    errors.dob = "Use DD-MM-YYYY format.";
  }
  if (form.emailId && !/^\S+@\S+\.\S+$/.test(form.emailId)) {
    errors.emailId = "Enter a valid merchant email address.";
  }
  if (form.merchantPhoneNumber && !/^\d{10}$/.test(form.merchantPhoneNumber)) {
    errors.merchantPhoneNumber = "Enter exactly 10 digits.";
  }
  if (form.merchantPinCode && !/^\d{6}$/.test(form.merchantPinCode)) {
    errors.merchantPinCode = "Enter exactly 6 digits.";
  }
  if (form.shopPincode && !/^\d{6}$/.test(form.shopPincode)) {
    errors.shopPincode = "Enter exactly 6 digits.";
  }
  if (form.merchantPan && !/^[A-Z]{5}\d{4}[A-Z]$/.test(form.merchantPan)) {
    errors.merchantPan = "Use PAN format ABCDE1234F.";
  }
  if (form.shopPan && !/^[A-Z]{5}\d{4}[A-Z]$/.test(form.shopPan)) {
    errors.shopPan = "Use PAN format ABCDE1234F.";
  }
  if (form.aadhaarNumber && !/^\d{12}$/.test(form.aadhaarNumber)) {
    errors.aadhaarNumber = "Enter exactly 12 digits.";
  }
  if (form.gender && !["M", "F", "O"].includes(form.gender)) {
    errors.gender = "Select a valid gender.";
  }
  if (form.maritalStatus && !["SINGLE", "MARRIED"].includes(form.maritalStatus)) {
    errors.maritalStatus = "Select a valid marital status.";
  }
  if (form.mcc && !AEPS_MCC_OPTIONS.includes(form.mcc as (typeof AEPS_MCC_OPTIONS)[number])) {
    errors.mcc = "Select a supported 4-digit MCC.";
  }
  for (const field of ["lat", "shopLat"] as const) {
    if (form[field] && !validCoordinate(form[field], -90, 90)) {
      errors[field] = "Enter a valid latitude.";
    }
  }
  for (const field of ["long", "shopLong"] as const) {
    if (form[field] && !validCoordinate(form[field], -180, 180)) {
      errors[field] = "Enter a valid longitude.";
    }
  }

  return errors;
}

export function buildAepsRegistrationRequest(
  input: AepsRegistrationForm,
): Partial<AepsRegistrationForm> {
  const candidate = input as AepsRegistrationForm & Record<string, string>;
  for (const alias of FORBIDDEN_BANK_CODE_ALIASES) {
    if (alias in candidate) throw new Error(`${alias} is not accepted; use bankCode.`);
  }

  return Object.fromEntries(
    REGISTRATION_FIELDS.flatMap((field) => {
      const value = candidate[field];
      return value === "" ? [] : [[field, value]];
    }),
  ) as Partial<AepsRegistrationForm>;
}
