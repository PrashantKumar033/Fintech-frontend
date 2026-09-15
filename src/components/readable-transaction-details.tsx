type DetailField = {
  keys: string[];
  label: string;
  kind?: "money" | "date" | "operation" | "aadhaar";
};

const fields: DetailField[] = [
  { keys: ["referenceId", "transactionReferenceId"], label: "Transaction reference" },
  { keys: ["operation", "transactionType"], label: "Service", kind: "operation" },
  { keys: ["amount"], label: "Amount", kind: "money" },
  { keys: ["status"], label: "Status" },
  { keys: ["provider"], label: "Service provider" },
  { keys: ["sourceRole"], label: "Customer role" },
  { keys: ["rrn"], label: "Bank reference (RRN)" },
  {
    keys: ["npciMessage", "providerStatusMessage", "statusDescription"],
    label: "Transaction result",
  },
  { keys: ["aadhaarLast4", "maskedAadhaar"], label: "Aadhaar number", kind: "aadhaar" },
  { keys: ["settlementStatus"], label: "Settlement" },
  { keys: ["commissionStatus"], label: "Commission" },
  { keys: ["commissionAmount"], label: "Commission amount", kind: "money" },
  { keys: ["providerIncomeSource"], label: "Provider income source" },
  { keys: ["createdAt", "transactionDateTime"], label: "Started at", kind: "date" },
  { keys: ["completedAt"], label: "Completed at", kind: "date" },
];

const operationLabels: Record<string, string> = {
  BE: "Balance enquiry",
  MS: "Mini statement",
  CW: "Cash withdrawal",
  AP: "Aadhaar Pay",
  CD: "Cash deposit",
};

function present(record: Record<string, unknown>, keys: string[]) {
  const key = keys.find((candidate) => {
    const value = record[candidate];
    return value !== null && value !== undefined && value !== "";
  });
  return key ? record[key] : undefined;
}

function display(value: unknown, kind?: DetailField["kind"]) {
  if (value === null || value === undefined || value === "") return "—";
  if (kind === "operation") return operationLabels[String(value)] || String(value);
  if (kind === "money") {
    const amount = Number(value);
    return Number.isFinite(amount)
      ? new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(amount)
      : String(value);
  }
  if (kind === "date") {
    const date = new Date(String(value));
    return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString("en-IN");
  }
  if (kind === "aadhaar") {
    const lastFour = String(value).replace(/\D/g, "").slice(-4);
    return lastFour ? `XXXX XXXX ${lastFour}` : "—";
  }
  return String(value).replaceAll("_", " ");
}

export function ReadableTransactionDetails({
  detail,
  className = "mt-3 grid gap-2 sm:grid-cols-3",
}: {
  detail: object;
  className?: string;
}) {
  const record = detail as Record<string, unknown>;
  return (
    <div className={className}>
      {fields.map((field) => {
        const value = present(record, field.keys);
        if (value === undefined) return null;
        return (
          <div key={field.label} className="rounded-xl bg-muted/60 p-3">
            <p className="text-[10px] font-extrabold uppercase text-muted-foreground">
              {field.label}
            </p>
            <p className="mt-1 break-all text-xs font-bold text-secondary">
              {display(value, field.kind)}
            </p>
          </div>
        );
      })}
    </div>
  );
}
