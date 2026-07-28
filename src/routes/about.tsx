import { createFileRoute } from "@tanstack/react-router";
import { Target, Heart, Sparkles, Award, ShieldCheck, Rocket } from "lucide-react";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import aboutImg from "@/assets/about-team.png";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About UMOBIPAY — Building India's payment backbone" },
      { name: "description", content: "UMOBIPAY is on a mission to make digital payments simple and reliable for every Indian retailer and consumer." },
      { property: "og:title", content: "About UMOBIPAY" },
      { property: "og:description", content: "Building India's payment backbone — simple, seamless, secure." },
    ],
  }),
  component: About,
});

const values = [
  { icon: Target, title: "Purpose-first", desc: "Every feature we build starts with a real retailer's problem." },
  { icon: Heart, title: "People-obsessed", desc: "We treat every customer like our first — priority support, always." },
  { icon: ShieldCheck, title: "Trust as default", desc: "RBI-aligned, PCI-DSS handled, encryption end-to-end." },
  { icon: Sparkles, title: "Craft over speed", desc: "Ship carefully. Break nothing. Delight everyone." },
];

function About() {
  return (
    <div className="min-h-screen bg-background">
      <SiteNav />

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="mx-auto grid max-w-7xl gap-12 px-6 py-20 lg:grid-cols-2 lg:items-center">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-primary">About Us</span>
            <h1 className="mt-4 font-display text-5xl font-extrabold leading-tight text-secondary sm:text-6xl">
              Payments that meet<br />
              <span className="text-primary">India, where it is.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg text-foreground/70">
              UMOBIPAY started with a simple belief: bill payments and money transfers shouldn't be complicated. Today we power millions of transactions for retailers, agents and everyday customers.
            </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              {[
                { k: "2019", v: "Founded" },
                { k: "28", v: "States served" },
                { k: "5L+", v: "Retailers" },
              ].map((s) => (
                <div key={s.v} className="rounded-2xl border border-border bg-card p-4">
                  <p className="font-display text-2xl font-extrabold text-primary">{s.k}</p>
                  <p className="text-xs text-muted-foreground">{s.v}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="relative">
            <div className="absolute -inset-4 rounded-[3rem] bg-mint" />
            <div className="relative rounded-[2.5rem] p-6">
              <img src={aboutImg} alt="Team collaborating" width={1200} height={900} loading="lazy" className="w-full" />
            </div>
          </div>
        </div>
      </section>

      {/* MISSION */}
      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="grid gap-12 rounded-[2.5rem] bg-secondary p-10 text-secondary-foreground md:grid-cols-3 md:p-16">
          <div>
            <Rocket className="text-primary" size={32} />
            <h3 className="mt-4 font-display text-xl font-bold">Our mission</h3>
            <p className="mt-2 text-sm text-secondary-foreground/75">
              Make every rupee move instantly, safely, and affordably — from Tier-1 cities to remote taluks.
            </p>
          </div>
          <div>
            <Award className="text-primary" size={32} />
            <h3 className="mt-4 font-display text-xl font-bold">Our vision</h3>
            <p className="mt-2 text-sm text-secondary-foreground/75">
              To be the payments platform of choice for the next 500 million digital Indians.
            </p>
          </div>
          <div>
            <Heart className="text-primary" size={32} />
            <h3 className="mt-4 font-display text-xl font-bold">Our promise</h3>
            <p className="mt-2 text-sm text-secondary-foreground/75">
              Zero surprises. Transparent pricing, instant support, real people on the other side.
            </p>
          </div>
        </div>
      </section>

      {/* VALUES */}
      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-bold uppercase tracking-widest text-primary">What we stand for</span>
          <h2 className="mt-3 font-display text-4xl font-extrabold text-secondary sm:text-5xl">
            Values we ship every day.
          </h2>
        </div>
        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {values.map((v) => (
            <div key={v.title} className="rounded-3xl border border-border bg-card p-8">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-mint text-secondary">
                <v.icon size={22} />
              </span>
              <h3 className="mt-5 font-display text-lg font-bold text-secondary">{v.title}</h3>
              <p className="mt-2 text-sm text-foreground/70">{v.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}