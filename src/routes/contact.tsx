import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Mail, Phone, MapPin, MessageSquare, Send } from "lucide-react";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import supportImg from "@/assets/contact-support.png";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact UMOBIPAY — We're here to help" },
      { name: "description", content: "Reach the UMOBIPAY team for support, partnerships or agent onboarding. Live chat, phone and email." },
      { property: "og:title", content: "Contact UMOBIPAY" },
      { property: "og:description", content: "Support, sales and agent onboarding — we're here to help." },
    ],
  }),
  component: Contact,
});

function Contact() {
  const [sent, setSent] = useState(false);
  return (
    <div className="min-h-screen bg-background">
      <SiteNav />

      <section className="bg-mint">
        <div className="mx-auto max-w-7xl px-6 py-20 text-center">
          <span className="text-xs font-bold uppercase tracking-widest text-primary">Contact Us</span>
          <h1 className="mx-auto mt-3 max-w-3xl font-display text-5xl font-extrabold text-secondary sm:text-6xl">
            Real people, <span className="text-primary">real fast.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-foreground/70">
            Whether you're a retailer, an agent partner, or a customer with a question — we'll get back within one business hour.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="grid gap-10 lg:grid-cols-5">
          {/* LEFT — info cards */}
          <div className="space-y-5 lg:col-span-2">
            {[
              { icon: Phone, title: "Call us", value: "+91 98765 43210", note: "Mon–Sat · 9am–8pm IST" },
              { icon: Mail, title: "Email", value: "support@umobipay.com", note: "Reply within 1 hour" },
              { icon: MessageSquare, title: "Live chat", value: "Start conversation", note: "Available 24/7 in-app" },
              { icon: MapPin, title: "Head office", value: "Mumbai, India", note: "Andheri East · 400069" },
            ].map((c) => (
              <div key={c.title} className="flex items-start gap-4 rounded-3xl border border-border bg-card p-6">
                <span className="grid h-12 w-12 flex-shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground">
                  <c.icon size={22} />
                </span>
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-primary">{c.title}</p>
                  <p className="mt-1 font-display text-lg font-bold text-secondary">{c.value}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{c.note}</p>
                </div>
              </div>
            ))}
          </div>

          {/* RIGHT — form */}
          <div className="relative overflow-hidden rounded-[2.5rem] bg-secondary p-8 text-secondary-foreground sm:p-12 lg:col-span-3">
            <img
              src={supportImg}
              alt="Support agent"
              width={220}
              height={220}
              loading="lazy"
              className="pointer-events-none absolute -right-8 -top-8 h-56 w-56 opacity-30 sm:opacity-60"
            />
            <h2 className="relative font-display text-3xl font-extrabold sm:text-4xl">Send us a message</h2>
            <p className="relative mt-2 text-sm text-secondary-foreground/70">
              We usually respond within an hour during business hours.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                setSent(true);
              }}
              className="relative mt-8 space-y-5"
            >
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Full name" placeholder="Priya Sharma" />
                <Field label="Email" type="email" placeholder="you@company.com" />
              </div>
              <Field label="Phone" placeholder="+91 …" />
              <div>
                <label className="text-xs font-semibold uppercase tracking-widest text-secondary-foreground/70">
                  Message
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Tell us how we can help…"
                  className="mt-2 w-full rounded-2xl border border-secondary-foreground/15 bg-secondary-foreground/5 px-4 py-3 text-sm text-secondary-foreground placeholder:text-secondary-foreground/40 focus:border-primary focus:outline-none"
                />
              </div>
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/30 transition-transform hover:-translate-y-0.5"
              >
                {sent ? "Message sent!" : "Send message"} <Send size={14} />
              </button>
            </form>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

function Field({ label, ...rest }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label className="text-xs font-semibold uppercase tracking-widest text-secondary-foreground/70">
        {label}
      </label>
      <input
        {...rest}
        required
        className="mt-2 w-full rounded-2xl border border-secondary-foreground/15 bg-secondary-foreground/5 px-4 py-3 text-sm text-secondary-foreground placeholder:text-secondary-foreground/40 focus:border-primary focus:outline-none"
      />
    </div>
  );
}