import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { Building2, CheckCircle2, LoaderCircle, Search, X } from "lucide-react";
import { buildDmtBankCreateInput } from "@/lib/bank-account-ui";
import {
  applyBankDirectorySelection,
  detailsFromIfscLookup,
  isValidIfsc,
  normalizeIfsc,
  type BankDirectoryOption,
  type BankIfscDetails,
} from "@/lib/bank-directory";
import {
  complianceApi,
  complianceMessage,
  type BankAccount,
  type BankAccountType,
} from "@/lib/compliance-api";

type MainBankDraft = {
  bankCode: string;
  ifsc: string;
  accountHolderName: string;
  accountNumber: string;
  confirmAccountNumber: string;
  accountType: BankAccountType;
};

export function MainBankAccountModal({
  accessToken,
  accountHolderName,
  onClose,
  onCreated,
}: {
  accessToken: string;
  accountHolderName: string;
  onClose: () => void;
  onCreated: (account: BankAccount, message: string) => Promise<void> | void;
}) {
  const bankSelectionRequest = useRef(0);
  const ifscLookupRequest = useRef(0);
  const [draft, setDraft] = useState<MainBankDraft>({
    bankCode: "",
    ifsc: "",
    accountHolderName,
    accountNumber: "",
    confirmAccountNumber: "",
    accountType: "SAVINGS",
  });
  const [bankSearch, setBankSearch] = useState("");
  const [banks, setBanks] = useState<BankDirectoryOption[]>([]);
  const [bankDropdownOpen, setBankDropdownOpen] = useState(false);
  const [bankLoading, setBankLoading] = useState(false);
  const [ifscLoading, setIfscLoading] = useState(false);
  const [ifscDetails, setIfscDetails] = useState<BankIfscDetails | null>(null);
  const [ifscNotice, setIfscNotice] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadBanks = useCallback(
    async (search = "") => {
      setBankLoading(true);
      try {
        const response = await complianceApi.bankDirectory(accessToken, search);
        setBanks(Array.isArray(response.banks) ? response.banks : []);
      } catch (requestError) {
        setBanks([]);
        setError(complianceMessage(requestError));
      } finally {
        setBankLoading(false);
      }
    },
    [accessToken],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => void loadBanks(bankSearch), 250);
    return () => window.clearTimeout(timer);
  }, [bankSearch, loadBanks]);

  useEffect(() => {
    if (!isValidIfsc(draft.ifsc)) {
      ifscLookupRequest.current += 1;
      setIfscDetails(null);
      setIfscNotice("");
      return;
    }

    const requestId = ++ifscLookupRequest.current;
    const timer = window.setTimeout(() => {
      setIfscLoading(true);
      void complianceApi
        .bankIfsc(accessToken, draft.ifsc)
        .then((lookup) => {
          if (requestId !== ifscLookupRequest.current) return;
          setIfscDetails(detailsFromIfscLookup(lookup));
          setIfscNotice(
            lookup.lookupStatus === "UNAVAILABLE"
              ? "IFSC lookup is temporarily unavailable. You can still add the account."
              : lookup.lookupStatus === "NOT_FOUND"
                ? "No branch details were found. Confirm the IFSC before adding the account."
                : "",
          );
        })
        .catch((requestError) => {
          if (requestId !== ifscLookupRequest.current) return;
          setIfscDetails(null);
          setIfscNotice(complianceMessage(requestError));
        })
        .finally(() => {
          if (requestId === ifscLookupRequest.current) setIfscLoading(false);
        });
    }, 400);
    return () => window.clearTimeout(timer);
  }, [accessToken, draft.ifsc]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !submitting) onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [onClose, submitting]);

  async function selectBank(bank: BankDirectoryOption) {
    const bankCode = bank.bankCode.trim();
    const requestId = ++bankSelectionRequest.current;
    ifscLookupRequest.current += 1;
    setBankSearch(bank.bankName);
    setBankDropdownOpen(false);
    setIfscDetails(null);
    setIfscNotice("");
    setDraft((current) => ({ ...current, bankCode, ifsc: "" }));
    setIfscLoading(true);
    try {
      const response = await complianceApi.bankDirectorySelection(accessToken, bankCode);
      if (requestId !== bankSelectionRequest.current) return;
      const selected = applyBankDirectorySelection(response.bank || bank, response.ifscLookup);
      setDraft((current) =>
        current.bankCode === bankCode ? { ...current, ifsc: selected.ifsc } : current,
      );
      setIfscDetails(selected.details);
      if (response.ifscLookup.lookupStatus === "UNAVAILABLE") {
        setIfscNotice("Enter the customer branch IFSC manually.");
      }
    } catch (requestError) {
      if (requestId !== bankSelectionRequest.current) return;
      setDraft((current) => (current.bankCode === bankCode ? { ...current, ifsc: "" } : current));
      setIfscDetails(null);
      setIfscNotice(`${complianceMessage(requestError)} Enter the IFSC manually.`);
    } finally {
      if (requestId === bankSelectionRequest.current) setIfscLoading(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!draft.bankCode.trim() || !draft.accountHolderName.trim()) {
      setError("Select a bank and enter the account holder name.");
      return;
    }
    if (!isValidIfsc(draft.ifsc)) {
      setError("Enter a valid 11-character IFSC code.");
      return;
    }
    if (!/^\d{9,18}$/.test(draft.accountNumber)) {
      setError("Account number must contain 9 to 18 digits.");
      return;
    }
    if (draft.accountNumber !== draft.confirmAccountNumber) {
      setError("Account numbers do not match.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await complianceApi.addDmtBank(
        accessToken,
        buildDmtBankCreateInput(draft, "ADD_ONLY"),
      );
      if (!response.success) {
        throw new Error(response.message || "The bank account could not be added.");
      }
      await onCreated(
        response.bankAccount,
        response.message || "Main bank account added. Verification is pending.",
      );
    } catch (requestError) {
      setError(complianceMessage(requestError));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[130] grid place-items-center bg-secondary/65 p-3 backdrop-blur-sm sm:p-5">
      <section
        id="add-main-bank-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-main-bank-title"
        className="max-h-[94vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl sm:p-7"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-wider text-primary">
              Main wallet bank account
            </p>
            <h2 id="add-main-bank-title" className="mt-1 text-2xl font-black text-secondary">
              Add bank account
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Add a Main wallet account, then verify and select it for this fund transfer.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-border text-secondary disabled:opacity-50"
            aria-label="Close add bank account modal"
          >
            <X size={18} />
          </button>
        </div>

        {error ? (
          <p className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-800">
            {error}
          </p>
        ) : null}

        <form onSubmit={submit} className="mt-6 grid gap-5 md:grid-cols-2">
          <label className="relative text-sm font-bold text-secondary md:col-span-2">
            Bank
            <div className="relative mt-2">
              <Search
                size={16}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <input
                value={bankSearch}
                onFocus={() => setBankDropdownOpen(true)}
                onChange={(event) => {
                  setBankSearch(event.target.value);
                  setBankDropdownOpen(true);
                  setDraft((current) => ({ ...current, bankCode: "", ifsc: "" }));
                  setIfscDetails(null);
                  setIfscNotice("");
                }}
                placeholder="Search and select a bank"
                autoComplete="off"
                className="w-full rounded-xl border border-border bg-white py-3 pl-11 pr-4 outline-none focus:border-primary"
              />
              {bankDropdownOpen ? (
                <div className="absolute z-20 mt-2 max-h-64 w-full overflow-y-auto rounded-xl border border-border bg-white p-1 shadow-xl">
                  {bankLoading ? (
                    <p className="flex items-center gap-2 px-3 py-3 text-xs text-muted-foreground">
                      <LoaderCircle size={14} className="animate-spin" /> Loading banks…
                    </p>
                  ) : banks.length ? (
                    banks.map((bank) => (
                      <button
                        key={bank.bankCode}
                        type="button"
                        onClick={() => void selectBank(bank)}
                        className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-secondary hover:bg-mint"
                      >
                        <span>{bank.bankName}</span>
                        <span className="text-[10px] text-muted-foreground">{bank.bankCode}</span>
                      </button>
                    ))
                  ) : (
                    <p className="px-3 py-3 text-xs text-muted-foreground">No banks found.</p>
                  )}
                </div>
              ) : null}
            </div>
          </label>

          <label className="text-sm font-bold text-secondary">
            IFSC
            <div className="relative mt-2">
              <input
                required
                value={draft.ifsc}
                onChange={(event) => {
                  setDraft((current) => ({ ...current, ifsc: normalizeIfsc(event.target.value) }));
                  setIfscDetails(null);
                  setIfscNotice("");
                }}
                maxLength={11}
                placeholder="ABCD0123456"
                className="w-full rounded-xl border border-border bg-white px-4 py-3 uppercase outline-none focus:border-primary"
              />
              {ifscLoading ? (
                <LoaderCircle
                  size={16}
                  className="absolute right-4 top-1/2 -translate-y-1/2 animate-spin text-primary"
                />
              ) : null}
            </div>
            {ifscNotice ? (
              <span className="mt-1 block text-xs font-medium text-amber-700">{ifscNotice}</span>
            ) : null}
          </label>

          <label className="text-sm font-bold text-secondary">
            Account type
            <select
              value={draft.accountType}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  accountType: event.target.value as BankAccountType,
                }))
              }
              className="mt-2 w-full rounded-xl border border-border bg-white px-4 py-3 outline-none focus:border-primary"
            >
              <option value="SAVINGS">Savings</option>
              <option value="CURRENT">Current</option>
              <option value="SALARY">Salary</option>
            </select>
          </label>

          {ifscDetails ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-900 md:col-span-2">
              <div className="flex gap-2">
                <CheckCircle2 size={16} className="shrink-0" />
                <div>
                  <p className="font-extrabold">{ifscDetails.bankName}</p>
                  <p className="mt-1">
                    {[ifscDetails.branch, ifscDetails.city, ifscDetails.state]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                  {ifscDetails.address ? <p className="mt-1">{ifscDetails.address}</p> : null}
                </div>
              </div>
            </div>
          ) : null}

          <label className="text-sm font-bold text-secondary md:col-span-2">
            Account holder name
            <input
              required
              value={draft.accountHolderName}
              onChange={(event) =>
                setDraft((current) => ({ ...current, accountHolderName: event.target.value }))
              }
              className="mt-2 w-full rounded-xl border border-border bg-white px-4 py-3 outline-none focus:border-primary"
            />
          </label>

          <label className="text-sm font-bold text-secondary">
            Account number
            <input
              required
              type="password"
              inputMode="numeric"
              autoComplete="new-password"
              minLength={9}
              maxLength={18}
              value={draft.accountNumber}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  accountNumber: event.target.value.replace(/\D/g, "").slice(0, 18),
                }))
              }
              className="mt-2 w-full rounded-xl border border-border bg-white px-4 py-3 outline-none focus:border-primary"
            />
          </label>

          <label className="text-sm font-bold text-secondary">
            Confirm account number
            <input
              required
              type="password"
              inputMode="numeric"
              autoComplete="new-password"
              minLength={9}
              maxLength={18}
              value={draft.confirmAccountNumber}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  confirmAccountNumber: event.target.value.replace(/\D/g, "").slice(0, 18),
                }))
              }
              className="mt-2 w-full rounded-xl border border-border bg-white px-4 py-3 outline-none focus:border-primary"
            />
          </label>

          <div className="flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:justify-end md:col-span-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-xl border border-border px-5 py-3 text-sm font-bold text-secondary disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              disabled={submitting}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-extrabold text-white disabled:opacity-50"
            >
              {submitting ? (
                <LoaderCircle size={17} className="animate-spin" />
              ) : (
                <Building2 size={17} />
              )}
              {submitting ? "Adding account…" : "Add bank account"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
