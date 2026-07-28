import { createFileRoute } from "@tanstack/react-router";
import { Smartphone, Send, Zap, Tv, CreditCard, Wifi, Droplet, Flame, ArrowRight, CheckCircle2 } from "lucide-react";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";

export const Route = createFileRoute("/services")({
  head: () => ({
    meta: [
      { title: "Our Services — UMOBIPAY | Recharge, DMT, BBPS & Bills" },
      { name: "description", content: "Mobile & DTH recharge, DMT, utility bill collection and full BBPS services under one UMOBIPAY dashboard." },
      { property: "og:title", content: "UMOBIPAY Services" },
      { property: "og:description", content: "Recharge, DMT, bills and BBPS — one platform, every service." },
    ],
  }),
  component: Services,
});

const primary = [
  {
    icon: Smartphone,
    title: "Mobile & DTH Recharge",
    desc: "Instant recharges for every prepaid mobile and DTH operator in India. Real-time confirmation, no delays.",
    tags: ["All operators", "Instant", "Auto-retry"],
  },
  {
    icon: Send,
    title: "DMT — Domestic Money Transfer",
    desc: "Send money to any bank account, anywhere in India, 24×7. Backed by RBI-licensed partners.",
    tags: ["IMPS", "NEFT", "24×7"],
  },
  {
    icon: Zap,
    title: "Utility Bill Collection",
    desc: "Collect payments for electricity, water, gas, broadband — through one unified UMOBIPAY interface.",
    tags: ["Electricity", "Water", "Gas"],
  },
  {
    icon: Tv,
    title: "BBPS Services",
    desc: "Full Bharat Bill Payment System integration. Compliant, unified, and covering 500+ billers.",
    tags: ["BBPS certified", "500+ billers", "Unified"],
  },
];

const more = [
  { icon: CreditCard, title: "Credit Card Bill" },
  { icon: Wifi, title: "Broadband & Landline" },
  { icon: Droplet, title: "Water Bill" },
  { icon: Flame, title: "Gas — LPG & PNG" },
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
            From a small recharge to a large utility payment — UMOBIPAY handles it, end to end.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-24">
        <div className="grid gap-6 md:grid-cols-2">
          {primary.map((s, i) => (
            <div
              key={s.title}
              className={`relative overflow-hidden rounded-[2rem] p-10 ${i % 2 === 0 ? "bg-secondary text-secondary-foreground" : "bg-card border border-border"}`}
            >
              <span
                className={`grid h-14 w-14 place-items-center rounded-2xl ${
                  i % 2 === 0 ? "bg-primary text-primary-foreground" : "bg-mint text-secondary"
                }`}
              >
                <s.icon size={26} />
              </span>
              <h3 className={`mt-6 font-display text-2xl font-bold ${i % 2 === 0 ? "" : "text-secondary"}`}>
                {s.title}
              </h3>
              <p className={`mt-3 max-w-md text-sm ${i % 2 === 0 ? "text-secondary-foreground/80" : "text-foreground/70"}`}>
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

      {/* MORE BILL CATEGORIES */}
      <section className="mx-auto max-w-7xl px-6 pb-24">
        <div className="rounded-[2.5rem] border border-border p-10 sm:p-16">
          <div className="grid gap-10 md:grid-cols-2 md:items-center">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-primary">Bill Categories</span>
              <h2 className="mt-3 font-display text-4xl font-extrabold text-secondary">
                Cover every bill your customer walks in with.
              </h2>
              <ul className="mt-6 space-y-3 text-sm text-foreground/80">
                {["500+ billers on-boarded", "Live receipt on completion", "Refund automation for failures", "Daily commission settlement"].map(
                  (b) => (
                    <li key={b} className="flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-primary" /> {b}
                    </li>
                  ),
                )}
              </ul>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {more.map((m) => (
                <div key={m.title} className="rounded-2xl bg-mint p-6 text-center">
                  <span className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-background text-primary">
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