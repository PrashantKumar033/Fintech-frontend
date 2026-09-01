import { createFileRoute } from "@tanstack/react-router";
import {
  Smartphone,
  Send,
  Zap,
  Tv,
  CreditCard,
  Wifi,
  Droplet,
  Flame,
  ArrowRight,
  CheckCircle2,
  Banknote,
  Landmark,
  BadgeCheck,
  ReceiptText,
  Store,
  ShieldCheck,
  ScanLine,
} from "lucide-react";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";

export const Route = createFileRoute("/services")({
  head: () => ({
    meta: [
      { title: "Our Services — UMOBIPAY | Recharge, DMT, BBPS & Bills" },
      { name: "description", content: "Mobile & DTH recharge, domestic money transfer, utility bill collection, BBPS, insurance payments and merchant services under one UMOBIPAY dashboard." },
      { property: "og:title", content: "UMOBIPAY Services" },
      { property: "og:description", content: "Recharge, money transfer, bills, insurance and merchant payments — one platform, every service." },
    ],
  }),
  component: Services,
});

const featured = [
  {
    icon: Smartphone,
    title: "Mobile & DTH Recharge",
    desc: "Instant recharges for prepaid mobile, postpaid mobile and DTH services with real-time confirmation and auto-retry support.",
    tags: ["All operators", "Instant", "Auto-retry"],
  },
  {
    icon: Send,
    title: "Domestic Money Transfer",
    desc: "Send money to bank accounts all across India with secure transfer options and fast settlement support.",
    tags: ["IMPS", "NEFT", "24×7"],
  },
  {
    icon: Zap,
    title: "Utility Bill Payments",
    desc: "Collect and process electricity, water, gas and broadband bills through one unified interface.",
    tags: ["Electricity", "Water", "Gas"],
  },
  {
    icon: ReceiptText,
    title: "BBPS & Billers",
    desc: "500+ billers integrated with Bharat Bill Payment System support for seamless customer coverage.",
    tags: ["BBPS", "500+ billers", "Unified"],
  },
  {
    icon: Banknote,
    title: "Credit Card & Loan EMI",
    desc: "Support customers with card bill payments and EMI commitments without adding operational friction.",
    tags: ["Cards", "EMI", "Easy pay"],
  },
  {
    icon: Landmark,
    title: "Insurance Premiums",
    desc: "Help customers stay active on life, health and vehicle insurance renewals with convenient payments.",
    tags: ["Insurance", "Renewal", "Fast"],
  },
];

const categories = [
  { icon: CreditCard, title: "Credit Card Bills" },
  { icon: Wifi, title: "Broadband & Landline" },
  { icon: Droplet, title: "Water Bills" },
  { icon: Flame, title: "Gas — LPG & PNG" },
  { icon: ScanLine, title: "FASTag Recharge" },
  { icon: Store, title: "Merchant Payments" },
  { icon: BadgeCheck, title: "Education Fees" },
  { icon: ShieldCheck, title: "Secure Transactions" },
];

const benefits = [
  "500+ billers on-boarded",
  "Instant confirmation receipts",
  "Refund support for failed transactions",
  "Daily commission settlement",
  "High uptime for peak demand",
  "Multi-channel support for agents",
];

function Services() {
  return (
    <div className="min-h-screen bg-background">
      <SiteNav />

      <section className="bg-mint">
        <div className="mx-auto max-w-7xl px-6 py-20 text-center">
          <span className="text-xs font-bold uppercase tracking-widest text-primary">Our Services</span>
          <h1 className="mx-auto mt-3 max-w-3xl font-display text-5xl font-extrabold text-secondary sm:text-6xl">
            One platform. <span className="text-primary">Every payment.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-foreground/70">
            From a quick recharge to a large utility payment — UMOBIPAY helps you serve every customer need with confidence.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-24">
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {featured.map((s, i) => (
            <div
              key={s.title}
              className={`relative overflow-hidden rounded-[2rem] p-8 ${i % 2 === 0 ? "bg-secondary text-secondary-foreground" : "bg-card border border-border"}`}
            >
              <span
                className={`grid h-14 w-14 place-items-center rounded-2xl ${
                  i % 2 === 0 ? "bg-primary text-primary-foreground" : "bg-mint text-secondary"
                }`}
              >
                <s.icon size={24} />
              </span>
              <h3 className={`mt-6 font-display text-2xl font-bold ${i % 2 === 0 ? "" : "text-secondary"}`}>
                {s.title}
              </h3>
              <p className={`mt-3 min-h-20 text-sm leading-7 ${i % 2 === 0 ? "text-secondary-foreground/80" : "text-foreground/70"}`}>
                {s.desc}
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                {s.tags.map((t) => (
                  <span
                    key={t}
                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                      i % 2 === 0 ? "bg-secondary-foreground/10" : "bg-mint text-secondary"
                    }`}
                  >
                    {t}
                  </span>
                ))}
              </div>
              <button
                className={`mt-8 inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold ${
                  i % 2 === 0 ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
                }`}
              >
                Explore <ArrowRight size={14} />
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-24">
        <div className="rounded-[2.5rem] border border-border bg-gradient-to-br from-card via-background to-mint/40 p-10 sm:p-16">
          <div className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-primary">Service Coverage</span>
              <h2 className="mt-3 font-display text-4xl font-extrabold text-secondary">
                Cover every bill and payment your customer walks in with.
              </h2>
              <p className="mt-4 max-w-xl text-base leading-8 text-foreground/75">
                From everyday recharges to premium services, the UMOBIPAY stack gives retailers and agents a single, reliable place to serve more customers.
              </p>
              <ul className="mt-6 space-y-3 text-sm text-foreground/80">
                {benefits.map((b) => (
                  <li key={b} className="flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-primary" /> {b}
                  </li>
                ))}
              </ul>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {categories.map((m) => (
                <div key={m.title} className="rounded-2xl bg-background/90 p-6 text-center shadow-sm ring-1 ring-border/60">
                  <span className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-mint text-primary">
                    <m.icon size={22} />
                  </span>
                  <p className="mt-3 font-semibold text-secondary">{m.title}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}