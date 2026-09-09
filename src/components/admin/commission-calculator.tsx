import { useState, type FormEvent } from "react";
import { Calculator } from "lucide-react";
import { AdminPanel } from "@/components/admin/admin-layout";
import { getAdminSession } from "@/lib/admin-api";
import { getSession } from "@/lib/auth-api";
import { operationsApi, operationsMessage } from "@/lib/operations-api";

const field = "rounded-xl border border-border bg-white px-3 py-3 text-sm outline-none focus:border-primary";

export function CommissionCalculator() {
  const identity = getSession()?.identity;
  const [userId, setUserId] = useState(identity?.id || "");
  const [role, setRole] = useState(identity?.role || "RETAILER");
  const [serviceType, setServiceType] = useState("AEPS");
  const [operator, setOperator] = useState("");
  const [amount, setAmount] = useState("");
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const token = getSession()?.accessToken || getAdminSession()?.accessToken;
    if (!token) return setError("Sign in again before calculating commission.");
    setBusy(true); setError(""); setResult(null);
    try {
      setResult(await operationsApi.calculateCommission(token, {
        userId: userId.trim(), role: role.trim().toUpperCase(), serviceType: serviceType.trim().toUpperCase(),
        operator: operator.trim().toUpperCase() || undefined, transactionAmount: Number(amount),
        idempotencyKey: crypto.randomUUID(),
      }));
    } catch (requestError) { setError(operationsMessage(requestError)); }
    finally { setBusy(false); }
  }

  return <AdminPanel className="mt-5"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary"><Calculator size={18}/></span><div><h2 className="font-black">Commission preview</h2><p className="text-xs text-muted-foreground">Run the live backend calculation before applying a rule to a transaction.</p></div></div><form onSubmit={submit} className="mt-4 grid gap-3 md:grid-cols-5"><input required value={userId} onChange={e=>setUserId(e.target.value)} placeholder="User UUID" className={field}/><input required value={role} onChange={e=>setRole(e.target.value)} placeholder="Role" className={field}/><input required value={serviceType} onChange={e=>setServiceType(e.target.value)} placeholder="Service" className={field}/><input value={operator} onChange={e=>setOperator(e.target.value)} placeholder="Operator (optional)" className={field}/><div className="flex gap-2"><input required min="0.01" step="0.01" type="number" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="Amount" className={`${field} min-w-0 flex-1`}/><button disabled={busy} className="rounded-xl bg-primary px-4 text-xs font-extrabold text-white disabled:opacity-50">{busy?"…":"Calculate"}</button></div></form>{error&&<p className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}{result&&<pre className="mt-3 max-h-72 overflow-auto rounded-xl bg-secondary p-4 text-xs text-white">{JSON.stringify(result,null,2)}</pre>}</AdminPanel>;
}
