import { useEffect, useState } from "react";
import { ArrowUp, ChevronLeft, ChevronRight, Minus, Plus, Quote, Star } from "lucide-react";
import { Reveal, SpotlightCard } from "@/components/interactions";

const faqs = [
  {
    q: "What services can I access through this platform?",
    a: "Mobile & DTH recharges, utility bill payments (electricity, water, gas, broadband and more), and Aadhaar-based banking services like cash withdrawal and balance inquiry.",
  },
  {
    q: "Are the transactions secure?",
    a: "Absolutely. Every transaction runs through encrypted channels and follows industry-standard safety protocols, including RBI and NPCI-compliant systems.",
  },
  {
    q: "What happens if a transaction fails?",
    a: "If a transaction fails due to a technical or network issue, the deducted amount is automatically refunded to your wallet or source account within 24–48 hours.",
  },
  {
    q: "Do I get proof or receipt after the transaction?",
    a: "Yes. Every successful recharge, bill payment or AEPS transaction sends a confirmation via SMS, email or printed receipt with a transaction reference ID.",
  },
];

export function FaqSection() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="faq" className="relative mx-auto max-w-7xl px-6 py-28">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-10 -z-10 mx-auto h-72 max-w-3xl rounded-full bg-primary/10 blur-3xl" />
      <Reveal className="mx-auto max-w-2xl text-center">
        <span className="text-xs font-bold uppercase tracking-[0.3em] text-primary">FAQ's</span>
        <h2 className="mt-3 font-display text-4xl font-extrabold tracking-tighter text-secondary sm:text-5xl">
          Frequently asked <span className="text-gradient-brand">questions</span>
        </h2>
        <p className="mt-4 text-foreground/70">
          Quick answers to common queries — from account management to transaction security.
        </p>
      </Reveal>

      <div className="mx-auto mt-12 max-w-3xl space-y-4">
        {faqs.map((f, i) => {
          const active = open === i;
          return (
            <Reveal key={f.q} delay={i * 70}>
              <SpotlightCard
                className={`overflow-hidden rounded-3xl border transition-colors ${
                  active ? "border-primary/40 bg-card" : "border-border bg-card/70"
                }`}
              >
                <button
                  onClick={() => setOpen(active ? null : i)}
                  aria-expanded={active}
                  className="flex w-full items-center justify-between gap-6 px-7 py-6 text-left"
                >
                  <span className="font-display text-lg font-bold text-secondary">{f.q}</span>
                  <span
                    className={`grid h-9 w-9 shrink-0 place-items-center rounded-full transition-colors ${
                      active ? "bg-primary text-primary-foreground" : "bg-mint text-secondary"
                    }`}
                  >
                    {active ? <Minus size={16} /> : <Plus size={16} />}
                  </span>
                </button>
                <div
                  className="grid transition-all duration-500 ease-out"
                  style={{ gridTemplateRows: active ? "1fr" : "0fr" }}
                >
                  <div className="overflow-hidden">
                    <p className="px-7 pb-7 text-sm leading-relaxed text-foreground/70">{f.a}</p>
                  </div>
                </div>
              </SpotlightCard>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}

const testimonials = [
  {
    name: "Mohit Yadav",
    role: "Client · Delhi",
    quote:
      "This portal is very good and attractive. It is very beneficial for all online payments — my son liked it a lot.",
  },
  {
    name: "Priya Sharma",
    role: "Retailer · Jaipur",
    quote:
      "Recharge and bill collection on one screen. My daily wait time dropped by half and my customers genuinely love it.",
  },
  {
    name: "Ramesh Yadav",
    role: "Kirana owner · Lucknow",
    quote:
      "DMT settlement is instant and commissions credit daily. UMOBIPAY changed the way I run my shop.",
  },
  {
    name: "Arjun Nair",
    role: "Mobile agent · Kochi",
    quote:
      "The dashboard is beautifully simple. Even my father, who never used a smartphone, does BBPS payments now.",
  },
];

export function TestimonialSlider({ avatars }: { avatars: string[] }) {
  const [i, setI] = useState(0);
  const go = (d: number) => setI((p) => (p + d + testimonials.length) % testimonials.length);

  useEffect(() => {
    const t = setInterval(() => setI((p) => (p + 1) % testimonials.length), 6000);
    return () => clearInterval(t);
  }, []);

  const t = testimonials[i];

  return (
    <section className="relative overflow-hidden bg-secondary py-28 text-secondary-foreground">
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-grid opacity-20" />
      <div aria-hidden className="pointer-events-none absolute -left-24 top-10 h-96 w-96 rounded-full bg-primary/25 blur-3xl [animation:var(--animate-blob)]" />
      <div className="relative mx-auto max-w-5xl px-6">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <span className="text-xs font-bold uppercase tracking-[0.3em] text-primary">Testimonial</span>
            <h2 className="mt-3 font-display text-4xl font-extrabold tracking-tighter sm:text-5xl">
              What our clients say
            </h2>
          </div>
          <div className="flex gap-3">
            <button
              aria-label="Previous testimonial"
              onClick={() => go(-1)}
              className="grid h-12 w-12 place-items-center rounded-full border border-secondary-foreground/20 transition-colors hover:bg-primary hover:text-primary-foreground"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              aria-label="Next testimonial"
              onClick={() => go(1)}
              className="grid h-12 w-12 place-items-center rounded-full border border-secondary-foreground/20 transition-colors hover:bg-primary hover:text-primary-foreground"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        <SpotlightCard className="mt-10 rounded-[2.5rem] border border-secondary-foreground/10 bg-secondary-foreground/5 p-10 backdrop-blur sm:p-14">
          <Quote size={40} className="text-primary" />
          <p key={t.name} className="mt-6 font-display text-2xl leading-snug tracking-tight sm:text-3xl [animation:var(--animate-float)_0s_1]">
            “{t.quote}”
          </p>
          <div className="mt-10 flex items-center gap-4">
            <img
              src={avatars[i % avatars.length]}
              alt={t.name}
              width={56}
              height={56}
              loading="lazy"
              className="h-14 w-14 rounded-full object-cover ring-2 ring-primary/60"
            />
            <div className="flex-1">
              <p className="font-display text-lg font-bold">{t.name}</p>
              <p className="text-xs text-secondary-foreground/70">{t.role}</p>
            </div>
            <span className="hidden gap-1 text-primary sm:flex">
              {[...Array(5)].map((_, k) => (
                <Star key={k} size={14} className="fill-primary" />
              ))}
            </span>
          </div>

          <div className="mt-8 flex gap-2">
            {testimonials.map((x, k) => (
              <button
                key={x.name}
                aria-label={`Show testimonial ${k + 1}`}
                onClick={() => setI(k)}
                className={`h-1.5 rounded-full transition-all ${
                  k === i ? "w-10 bg-primary" : "w-4 bg-secondary-foreground/25"
                }`}
              />
            ))}
          </div>
        </SpotlightCard>
      </div>
    </section>
  );
}

export function ScrollToTop() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 600);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <button
      aria-label="Scroll to top"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className={`fixed bottom-8 right-8 z-40 grid h-12 w-12 place-items-center rounded-full bg-secondary text-secondary-foreground shadow-2xl transition-all duration-300 hover:bg-primary hover:text-primary-foreground ${
        show ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-6 opacity-0"
      }`}
    >
      <ArrowUp size={18} />
    </button>
  );
}