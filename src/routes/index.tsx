import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight, ArrowUpRight, CheckCircle2, Smartphone, Tv, Zap, Send, Shield, Sparkles,
  Wallet, Fingerprint, Star, Play, TrendingUp, Lock, Globe, Rocket, ChevronRight,
  CreditCard, Banknote, Layers, Target, Eye, Receipt,
} from "lucide-react";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { CustomCursor, Counter, Magnetic, Reveal, SpotlightCard } from "@/components/interactions";
import { FaqSection, ScrollToTop, TestimonialSlider } from "@/components/home-sections";
import phoneMock from "@/assets/phone-mock.png";
import testi1 from "@/assets/testi-1.jpg";
import testi2 from "@/assets/testi-2.jpg";
import testi3 from "@/assets/testi-3.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "UMOBIPAY — Pay Smart. Pay Fast. India's fintech for everyday payments" },
      { name: "description", content: "Recharge, pay bills, and send money instantly with UMOBIPAY — the fintech built for every Indian retailer and consumer." },
      { property: "og:title", content: "UMOBIPAY — Pay Smart. Pay Fast." },
      { property: "og:description", content: "Recharge, bills and money transfer — simple, seamless, secure." },
    ],
  }),
  component: Home,
});

const billers = [
  "Airtel", "Jio", "Vi", "BSNL", "BSES", "Tata Power", "Adani", "MSEB",
  "Tata Play", "Sun Direct", "Dish TV", "Airtel DTH", "Indraprastha Gas",
  "Mahanagar Gas", "JioFiber", "ACT Fibernet", "Hathway", "Vodafone Idea",
];

const services = [
  { icon: Smartphone, title: "Mobile & DTH", desc: "All operators. Instant recharge.", tone: "primary" },
  { icon: Send, title: "DMT Transfer", desc: "IMPS · NEFT · RTGS — 24×7.", tone: "secondary" },
  { icon: Zap, title: "Utility Bills", desc: "Electricity · Water · Gas · LPG.", tone: "primary" },
  { icon: Tv, title: "BBPS", desc: "500+ billers, one dashboard.", tone: "secondary" },
  { icon: Wallet, title: "AEPS", desc: "Aadhaar-enabled cash withdrawal.", tone: "primary" },
  { icon: Globe, title: "PAN / Insurance", desc: "PAN card, LIC and more.", tone: "secondary" },
];

/* “Our Professional Services” — full list from UMOBIPAY */
const proServices = [
  { icon: Send, title: "DMT", desc: "Fast, secure domestic money transfer straight to any bank account — minimal documentation, 24×7 availability." },
  { icon: Fingerprint, title: "AEPS", desc: "Aadhaar Enabled Payment System — cash withdrawal, balance enquiry and mini statement using a fingerprint." },
  { icon: Receipt, title: "BBPS", desc: "Pay every kind of utility bill in a fast, secure manner — and earn a commission on each bill you settle." },
  { icon: CreditCard, title: "Credit Bill Payment", desc: "Instant credit-card bill payments with real-time updates so your customers never pay a late fee." },
  { icon: Layers, title: "Payment Gateway", desc: "Accept and process online payments through a single integration with banks and card networks." },
  { icon: Banknote, title: "Payment Collection", desc: "Collect via UPI, cards, net banking and wallets with automated reminders and real-time tracking." },
  { icon: Smartphone, title: "Recharge", desc: "Airtel, Jio, Vi, BSNL, Tata — recharge every operator from the web dashboard or the mobile app." },
  { icon: Wallet, title: "CMS", desc: "Manage business data, customer records and workflows from one clean, user-friendly console." },
];

const heroFeatures = [
  { icon: Smartphone, title: "Mobile & DTH Recharge" },
  { icon: Send, title: "DMT Services" },
  { icon: Zap, title: "Utility Bill Collection" },
  { icon: Receipt, title: "BBPS Services" },
];

const funFacts = [
  { to: 12, suffix: "", label: "Years of Service" },
  { to: 45, suffix: "M+", label: "Recharges Processed" },
  { to: 99.9, decimals: 1, suffix: "%", label: "Secure Recharges" },
  { to: 28, suffix: "", label: "Regions Covered" },
  { to: 90000, suffix: "+", label: "Daily Recharges" },
];

function Home() {
  return (
    <div className="min-h-screen bg-background overflow-x-clip">
      <CustomCursor />
      <ScrollToTop />
      <SiteNav />

      {/* ═════════════ HERO ═════════════ */}
      <section className="relative isolate bg-mint">
        {/* Subtle line-wave decoration, à la umobipay.com */}
        <svg
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-[420px] w-full opacity-40"
          viewBox="0 0 1440 420"
          fill="none"
          preserveAspectRatio="none"
        >
          {Array.from({ length: 14 }).map((_, i) => (
            <path
              key={i}
              d={`M0 ${180 + i * 8} C 360 ${120 + i * 10}, 1080 ${340 - i * 6}, 1440 ${200 + i * 8}`}
              stroke="currentColor"
              strokeWidth="1"
              className="text-secondary/25"
            />
          ))}
        </svg>

        <div className="relative mx-auto grid max-w-7xl gap-16 px-6 pb-20 pt-12 lg:grid-cols-[1.15fr_1fr] lg:items-center lg:pt-20">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-card px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-secondary">
              <span className="h-2 w-2 rounded-full bg-primary" />
              Simple · Seamless · Secure
            </span>
            <h1 className="mt-6 font-display text-[clamp(2.75rem,6.8vw,5.75rem)] font-extrabold leading-[1.02] tracking-tighter text-primary">
              Welcome to<br />
              UMOBIPAY
            </h1>
            <p className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 font-display text-xl font-bold text-primary sm:text-2xl">
              <span>· Simple</span>
              <span>· Seamless</span>
              <span>· Secure</span>
            </p>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-foreground/75">
              Online payments made easy and fast — mobile & DTH recharge, DMT, utility bills and BBPS, all on one clean dashboard trusted by retailers across India.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm font-semibold text-secondary">
                {["Online Payments", "Easy And Fast", "Safe And Secure"].map((t) => (
                  <span key={t} className="inline-flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-accent" />
                    {t}
                  </span>
                ))}
              </div>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                to="/services"
                className="group inline-flex items-center gap-2 rounded-full bg-primary px-8 py-4 text-sm font-semibold text-primary-foreground shadow-elegant transition-transform hover:-translate-y-0.5"
              >
                Get Started here
                <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                to="/services"
                className="inline-flex items-center gap-2 rounded-full border border-secondary/25 px-8 py-4 text-sm font-semibold text-secondary hover:bg-card"
              >
                Our Services
              </Link>
            </div>

            <div className="mt-12 grid max-w-lg grid-cols-3 gap-6 border-t border-secondary/10 pt-8">
              {[
                { v: "50L+", l: "Retailers" },
                { v: "₹1,200 Cr", l: "Processed" },
                { v: "99.99%", l: "Uptime" },
              ].map((s) => (
                <div key={s.l}>
                  <p className="font-display text-3xl font-extrabold text-secondary">{s.v}</p>
                  <p className="mt-1 text-xs uppercase tracking-widest text-muted-foreground">{s.l}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Phone showcase */}
          <div className="relative mx-auto w-full max-w-md">
            <div className="relative">
              <img
                src={phoneMock}
                alt="UMOBIPAY app on a phone"
                width={900}
                height={1600}
                className="relative z-10 mx-auto w-full max-w-sm drop-shadow-2xl [animation:var(--animate-float)]"
              />
              {/* Floating card 1 */}
              <div className="absolute -left-4 top-16 z-20 hidden rounded-2xl border border-border bg-card p-4 shadow-soft sm:block">
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-primary-foreground">
                    <Zap size={18} />
                  </span>
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Bill paid</p>
                    <p className="text-sm font-bold text-secondary">₹1,245 · BSES</p>
                  </div>
                </div>
              </div>
              {/* Floating card 2 */}
              <div className="absolute -right-4 bottom-32 z-20 hidden rounded-2xl border border-border bg-card p-4 shadow-soft sm:block">
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-secondary text-secondary-foreground">
                    <Shield size={18} />
                  </span>
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Secure</p>
                    <p className="text-sm font-bold text-secondary">256-bit encrypted</p>
                  </div>
                </div>
              </div>
              {/* Rating pill */}
              <div className="absolute -bottom-2 left-1/2 z-20 -translate-x-1/2 rounded-full border border-border bg-card px-5 py-2 shadow-soft">
                <div className="flex items-center gap-2 text-xs font-semibold">
                  <span className="flex text-primary">{[...Array(5)].map((_, i) => <Star key={i} size={12} className="fill-primary" />)}</span>
                  <span className="text-secondary">4.9 · 1.2L reviews</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═════════════ FEATURES — DELIVERING PAYMENT SOLUTIONS ═════════════ */}
      <section className="relative mx-auto max-w-7xl px-6 pb-4 pt-8">
        <Reveal className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-bold uppercase tracking-[0.3em] text-primary">Features</span>
          <h2 className="mt-3 font-display text-4xl font-extrabold tracking-tighter text-secondary sm:text-5xl">
            Delivering <span className="text-primary">payment solutions</span>
          </h2>
          <p className="mt-4 text-foreground/70">
            At UMOBIPAY we simplify bill payments through BBPS. From utility bills to mobile recharges — fast, secure and hassle-free, all in one place.
          </p>
        </Reveal>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {heroFeatures.map((f, i) => (
            <Reveal key={f.title} delay={i * 90}>
              <SpotlightCard className="group h-full rounded-[1.75rem] border border-border bg-card p-7 transition-transform duration-300 hover:-translate-y-2">
                <span className="grid h-14 w-14 place-items-center rounded-2xl bg-mint text-secondary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <f.icon size={24} />
                </span>
                <h3 className="mt-6 font-display text-lg font-bold text-secondary">{f.title}</h3>
                <p className="mt-2 text-sm text-foreground/65">
                  Instant processing, live receipts and transparent commissions on every transaction.
                </p>
                <span className="mt-5 inline-flex items-center gap-1 text-xs font-semibold text-primary opacity-0 transition-opacity group-hover:opacity-100">
                  Learn more <ArrowUpRight size={13} />
                </span>
              </SpotlightCard>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ═════════════ MARQUEE — BILLERS ═════════════ */}
      <section className="border-y border-border bg-secondary/5 py-8">
        <p className="mb-6 text-center text-xs font-bold uppercase tracking-[0.3em] text-muted-foreground">
          Trusted by 500+ billers · powered by BBPS
        </p>
        <div className="group relative overflow-hidden">
          <div className="pointer-events-none absolute left-0 top-0 z-10 h-full w-24 bg-gradient-to-r from-background to-transparent" />
          <div className="pointer-events-none absolute right-0 top-0 z-10 h-full w-24 bg-gradient-to-l from-background to-transparent" />
          <div className="flex w-max gap-14 [animation:var(--animate-marquee)]">
            {[...billers, ...billers].map((b, i) => (
              <span key={i} className="font-display text-2xl font-bold tracking-tight text-secondary/50 hover:text-secondary transition-colors">
                {b}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ═════════════ BENTO SERVICES ═════════════ */}
      <section className="relative mx-auto max-w-7xl px-6 py-28">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-primary">All-in-one</span>
            <h2 className="mt-3 max-w-2xl font-display text-4xl font-extrabold tracking-tighter text-secondary sm:text-6xl">
              Every payment. <span className="text-primary">One platform.</span>
            </h2>
          </div>
          <Link to="/services" className="inline-flex items-center gap-1 text-sm font-semibold text-secondary hover:text-primary">
            See all services <ArrowUpRight size={16} />
          </Link>
        </div>

        <div className="mt-14 grid gap-5 md:grid-cols-6 md:grid-rows-2 md:[grid-auto-rows:minmax(220px,auto)]">
          {/* Big highlight card */}
          <div className="relative overflow-hidden rounded-[2rem] bg-secondary p-8 text-secondary-foreground md:col-span-3 md:row-span-2 md:p-10">
            <div aria-hidden className="absolute -right-16 -top-16 h-72 w-72 rounded-full bg-primary/40 blur-3xl" />
            <div className="absolute -bottom-10 -left-10 h-60 w-60 rounded-full bg-primary/20 blur-3xl" />
            <div className="relative flex h-full flex-col justify-between">
              <div>
                <span className="inline-flex items-center gap-2 rounded-full bg-primary/20 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-primary">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary [animation:var(--animate-shine)]" /> Flagship
                </span>
                <h3 className="mt-6 font-display text-4xl font-extrabold tracking-tight sm:text-5xl">
                  BBPS payments,<br /> made retail-simple.
                </h3>
                <p className="mt-4 max-w-md text-secondary-foreground/70">
                  A single API, one screen, every biller in India — from electricity to LPG to broadband. Instant settlement, transparent commissions.
                </p>
              </div>
              <div className="mt-10 flex flex-wrap gap-3">
                {["500+ billers", "Live receipts", "Auto refunds", "Daily settlement"].map((t) => (
                  <span key={t} className="rounded-full border border-secondary-foreground/15 bg-secondary-foreground/5 px-3 py-1.5 text-xs font-medium">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {services.slice(0, 4).map((s, idx) => {
            const spans = ["md:col-span-2", "md:col-span-1", "md:col-span-1", "md:col-span-2"];
            return (
            <div
              key={s.title}
              className={`group relative overflow-hidden rounded-[2rem] p-7 transition-transform hover:-translate-y-1 ${spans[idx]} ${
                s.tone === "primary" ? "bg-mint text-secondary" : "bg-card text-secondary border border-border"
              }`}
            >
              <span className={`grid h-12 w-12 place-items-center rounded-2xl ${
                s.tone === "primary" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
              }`}>
                <s.icon size={22} />
              </span>
              <h3 className="mt-5 font-display text-xl font-bold">{s.title}</h3>
              <p className="mt-1 text-sm text-foreground/70">{s.desc}</p>
              <ChevronRight size={16} className="absolute right-6 top-6 opacity-0 transition-opacity group-hover:opacity-100" />
            </div>
            );
          })}
        </div>
      </section>

      {/* ═════════════ OUR PROFESSIONAL SERVICES ═════════════ */}
      <section id="professional" className="relative border-y border-border bg-mint/60 py-28">
        <div className="relative mx-auto max-w-7xl px-6">
          <Reveal className="mx-auto max-w-2xl text-center">
            <span className="text-xs font-bold uppercase tracking-[0.3em] text-primary">Our Services</span>
            <h2 className="mt-3 font-display text-4xl font-extrabold tracking-tighter text-secondary sm:text-5xl">
              We provide you our <span className="text-primary">valuable services</span>
            </h2>
            <p className="mt-4 text-foreground/70">
              Eight production-grade rails powering retailers, agents and businesses across India.
            </p>
          </Reveal>

          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {proServices.map((s, i) => (
              <Reveal key={s.title} delay={(i % 4) * 80}>
                <SpotlightCard className="group flex h-full flex-col rounded-[1.75rem] border border-border bg-card p-7 transition-all duration-300 hover:-translate-y-2 hover:border-primary/40">
                  <span className="grid h-12 w-12 place-items-center rounded-2xl bg-secondary text-secondary-foreground transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                    <s.icon size={20} />
                  </span>
                  <h3 className="mt-5 font-display text-xl font-bold text-secondary">{s.title}</h3>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-foreground/65">{s.desc}</p>
                  <Link to="/services" className="mt-5 inline-flex items-center gap-1 text-xs font-bold uppercase tracking-widest text-primary">
                    Learn more <ArrowRight size={13} className="transition-transform group-hover:translate-x-1" />
                  </Link>
                </SpotlightCard>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═════════════ WHY CHOOSE UMOBIPAY — VISION / MISSION ═════════════ */}
      <section className="mx-auto max-w-7xl px-6 py-28">
        <div className="grid gap-14 lg:grid-cols-[1fr_1.1fr] lg:items-center">
          <Reveal>
            <span className="text-xs font-bold uppercase tracking-[0.3em] text-primary">Why us</span>
            <h2 className="mt-3 font-display text-4xl font-extrabold tracking-tighter text-secondary sm:text-5xl">
              Why choose <span className="text-primary">UMOBIPAY?</span>
            </h2>
            <p className="mt-5 max-w-md text-foreground/70">
              Choose UMOBIPAY for an unparalleled Recharge and BBPS experience. Our technology keeps every transaction secure, efficient and completely transparent.
            </p>
            <div className="mt-8 grid max-w-md gap-3">
              {["Instant settlements, every single day", "Transparent, industry-best commissions", "24×7 human support in your language"].map((p) => (
                <div key={p} className="flex items-center gap-3 rounded-2xl border border-border bg-card px-5 py-4">
                  <CheckCircle2 size={18} className="shrink-0 text-primary" />
                  <span className="text-sm font-medium text-secondary">{p}</span>
                </div>
              ))}
            </div>
          </Reveal>

          <div className="grid gap-5 sm:grid-cols-2">
            <Reveal delay={100}>
              <SpotlightCard className="h-full rounded-[2rem] bg-secondary p-8 text-secondary-foreground">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary text-primary-foreground">
                  <Eye size={20} />
                </span>
                <h3 className="mt-6 font-display text-2xl font-bold">Our Vision</h3>
                <p className="mt-3 text-sm leading-relaxed text-secondary-foreground/75">
                  To ace the Indian e-commerce sector by redefining its concept and serving every Indian by driving a self-employment revolution through the power of mobile and Aadhaar.
                </p>
              </SpotlightCard>
            </Reveal>
            <Reveal delay={200}>
              <SpotlightCard className="h-full rounded-[2rem] border border-border bg-card p-8">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-mint text-secondary">
                  <Target size={20} />
                </span>
                <h3 className="mt-6 font-display text-2xl font-bold text-secondary">Our Mission</h3>
                <p className="mt-3 text-sm leading-relaxed text-foreground/70">
                  To create numerous jobs through an ever-expanding network of individuals with entrepreneurial spirit, and give every Indian the best value for their money.
                </p>
              </SpotlightCard>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ═════════════ FUN FACTS / COUNTERS ═════════════ */}
      <section className="relative overflow-hidden border-y border-border bg-card py-24">
        <div className="relative mx-auto max-w-7xl px-6">
          <div className="flex flex-wrap items-end justify-between gap-8">
            <Reveal className="max-w-xl">
              <span className="text-xs font-bold uppercase tracking-[0.3em] text-primary">Fun facts</span>
              <h2 className="mt-3 font-display text-4xl font-extrabold tracking-tighter text-secondary sm:text-5xl">
                Tap into Digital India payments
              </h2>
              <p className="mt-4 text-foreground/70">
                Our Recharge, BBPS and AEPS rails are built on deep industry knowledge and years of collaboration with trusted telecom, utility and banking partners.
              </p>
            </Reveal>
            <Magnetic>
              <Link
                to="/contact"
                className="inline-flex items-center gap-2 rounded-full bg-secondary px-8 py-4 text-sm font-semibold text-secondary-foreground transition-colors hover:bg-primary hover:text-primary-foreground"
              >
                Reach out <ArrowUpRight size={16} />
              </Link>
            </Magnetic>
          </div>

          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
            {funFacts.map((f, i) => (
              <Reveal key={f.label} delay={i * 80}>
                <SpotlightCard className="h-full rounded-[1.75rem] border border-border bg-background p-7 text-center transition-transform duration-300 hover:-translate-y-2">
                  <p className="font-display text-4xl font-black tracking-tighter text-secondary">
                    <Counter to={f.to} decimals={f.decimals ?? 0} />
                    <span className="text-primary">{f.suffix}</span>
                  </p>
                  <p className="mt-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">{f.label}</p>
                </SpotlightCard>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═════════════ FEATURE STRIP w/ ICON GRID ═════════════ */}
      <section className="mx-auto max-w-7xl px-6 pb-20">
        <div className="relative overflow-hidden rounded-[2.5rem] bg-secondary p-10 text-secondary-foreground sm:p-16">
          <div className="relative grid gap-14 lg:grid-cols-2 lg:items-center">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-primary">Built for scale</span>
              <h2 className="mt-3 font-display text-4xl font-extrabold tracking-tighter sm:text-5xl">
                Enterprise-grade fintech, retail-simple UX.
              </h2>
              <p className="mt-4 max-w-md text-secondary-foreground/70">
                We handle the infra — RBI-aligned custody, PCI-DSS, real-time reconciliation — so you can focus on serving customers.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <button className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground">
                  Start free trial
                </button>
                <Link to="/contact" className="rounded-full border border-secondary-foreground/25 px-6 py-3 text-sm font-semibold">
                  Book a demo
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {[
                { icon: Shield, label: "PCI-DSS" },
                { icon: Lock, label: "256-bit SSL" },
                { icon: Fingerprint, label: "Biometric login" },
                { icon: TrendingUp, label: "Live analytics" },
                { icon: Rocket, label: "Instant onboarding" },
                { icon: Globe, label: "Pan-India" },
              ].map((f) => (
                <div key={f.label} className="rounded-2xl border border-secondary-foreground/10 bg-secondary-foreground/5 p-5 backdrop-blur">
                  <f.icon size={20} className="text-primary" />
                  <p className="mt-4 text-sm font-semibold">{f.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═════════════ TESTIMONIALS ═════════════ */}
      <FaqSection />
      <TestimonialSlider avatars={[testi1, testi2, testi3]} />

      {/* ═════════════ 3-STEP ONBOARDING ═════════════ */}
      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid gap-14 lg:grid-cols-[1fr_1.2fr] lg:items-center">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-primary">How it works</span>
            <h2 className="mt-3 font-display text-4xl font-extrabold tracking-tighter text-secondary sm:text-5xl">
              Three steps. <br />Zero friction.
            </h2>
            <p className="mt-4 max-w-md text-foreground/70">
              Get onboarded in the time it takes to make chai. Real KYC in minutes, transacting on the same day.
            </p>
          </div>

          <div className="space-y-4">
            {[
              { n: "01", t: "Sign up in 60 seconds", d: "Enter your mobile, verify OTP, done." },
              { n: "02", t: "Complete KYC", d: "PAN + Aadhaar. Auto-verified in minutes." },
              { n: "03", t: "Start transacting", d: "Recharge, pay bills, transfer money instantly." },
            ].map((s) => (
              <div key={s.n} className="group flex items-center gap-6 rounded-2xl border border-border bg-card p-6 transition-colors hover:border-primary/50">
                <span className="font-display text-5xl font-black text-primary/30 transition-colors group-hover:text-primary">
                  {s.n}
                </span>
                <div className="flex-1">
                  <p className="font-display text-lg font-bold text-secondary">{s.t}</p>
                  <p className="mt-1 text-sm text-foreground/70">{s.d}</p>
                </div>
                <ArrowRight size={18} className="text-secondary/40 transition-transform group-hover:translate-x-1 group-hover:text-primary" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═════════════ FINAL CTA ═════════════ */}
      <section className="mx-auto max-w-7xl px-6 pb-24 pt-12">
        <div className="relative overflow-hidden rounded-[3rem] bg-primary p-12 text-primary-foreground sm:p-20">
          <div className="relative grid gap-10 lg:grid-cols-[1.4fr_1fr] lg:items-center">
            <div>
              <h2 className="font-display text-5xl font-extrabold tracking-tighter sm:text-6xl">
                Ready to power<br /> your payments?
              </h2>
              <p className="mt-6 max-w-md text-lg text-primary-foreground/85">
                Join 5 lakh+ agents and retailers who trust UMOBIPAY every single day.
              </p>
              <div className="mt-10 flex flex-wrap gap-4">
                <button className="rounded-full bg-background px-8 py-4 text-sm font-semibold text-secondary hover:bg-mint">
                  Become an Agent
                </button>
                <Link to="/contact" className="rounded-full border border-primary-foreground/40 px-8 py-4 text-sm font-semibold hover:bg-primary-foreground/10">
                  Talk to sales
                </Link>
              </div>
            </div>
            <div className="grid gap-3">
              {["No setup fees", "Instant onboarding", "24/7 human support", "Daily settlements"].map((b) => (
                <div key={b} className="flex items-center gap-3 rounded-2xl bg-primary-foreground/10 p-4 backdrop-blur">
                  <CheckCircle2 size={20} className="text-primary-foreground" />
                  <span className="font-medium">{b}</span>
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