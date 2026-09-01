import type { LucideIcon } from "lucide-react";
import { ArrowLeft, CheckCircle2, MessageCircleMore } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";

type PolicySection = {
  heading: string;
  body: string;
  bullets?: string[];
};

type PolicyPageProps = {
  badge: string;
  title: string;
  intro: string;
  icon: LucideIcon;
  sections: PolicySection[];
  highlights: string[];
  lastUpdated: string;
};

export function PolicyPage({
  badge,
  title,
  intro,
  icon: Icon,
  sections,
  highlights,
  lastUpdated,
}: PolicyPageProps) {
  return (
    <div className="min-h-screen bg-background">
      <SiteNav />

      <section className="bg-mint/70">
        <div className="mx-auto max-w-7xl px-6 py-20 lg:py-24">
          <Link to="/" className="inline-flex items-center gap-2 text-sm font-semibold text-secondary transition-colors hover:text-primary">
            <ArrowLeft size={16} />
            Back to home
          </Link>

          <div className="mt-10 grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div>
              <span className="inline-flex items-center rounded-full border border-primary/20 bg-background/80 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.32em] text-primary">
                {badge}
              </span>
              <h1 className="mt-5 font-display text-4xl font-extrabold tracking-tight text-secondary sm:text-5xl">
                {title}
              </h1>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-foreground/75">
                {intro}
              </p>
              <p className="mt-6 text-sm font-medium text-secondary/70">
                Last updated: {lastUpdated}
              </p>
            </div>

            <div className="rounded-[2rem] border border-border/70 bg-background p-7 shadow-[0_20px_70px_-30px_rgba(15,23,42,0.35)]">
              <div className="flex items-center gap-3">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary text-primary-foreground">
                  <Icon size={22} />
                </span>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">Why it matters</p>
                  <p className="font-display text-xl font-bold text-secondary">Built for trust</p>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                {highlights.map((item) => (
                  <div key={item} className="flex items-start gap-3 rounded-2xl bg-card/80 p-3">
                    <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-primary" />
                    <p className="text-sm text-foreground/75">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16 lg:py-20">
        <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">

          <aside className="rounded-[2rem] border border-primary/15 bg-gradient-to-br from-primary/12 via-background to-mint/70 p-7 shadow-[0_20px_70px_-30px_rgba(15,23,42,0.25)] lg:sticky lg:top-24 lg:self-start">
            <div className="flex items-center gap-3">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-secondary text-secondary-foreground">
                <MessageCircleMore size={20} />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">Need help?</p>
                <p className="font-display text-xl font-bold text-secondary">We’re here for you</p>
              </div>
            </div>

            <div className="mt-6 rounded-[1.4rem] border border-border/70 bg-background/80 p-4">
              <p className="text-sm font-semibold text-secondary">Quick support options</p>
              <ul className="mt-3 space-y-2 text-sm text-foreground/75">
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
                  <span>Response within 1 business hour for most concerns.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
                  <span>Support for refunds, account issues, and payment disputes.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
                  <span>Reliable help for retailers, agents, and everyday customers.</span>
                </li>
              </ul>
            </div>

            <p className="mt-6 text-sm leading-7 text-foreground/75">
              If you have questions about this policy or need help with a payment, our support team is ready to assist you promptly and clearly.
            </p>

            <Link to="/contact" className="mt-6 inline-flex rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-transform hover:-translate-y-0.5">
              Contact support
            </Link>
          </aside>

          <div className="space-y-5">
            {sections.map((section) => (
              <article key={section.heading} className="rounded-[1.75rem] border border-border/70 bg-card p-7 shadow-sm">
                <h2 className="font-display text-2xl font-bold text-secondary">{section.heading}</h2>
                <p className="mt-3 text-base leading-8 text-foreground/75">{section.body}</p>
                {section.bullets && (
                  <ul className="mt-5 space-y-2">
                    {section.bullets.map((bullet) => (
                      <li key={bullet} className="flex items-start gap-2 text-sm text-foreground/75">
                        <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-primary" />
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </article>
            ))}
          </div>

          
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
