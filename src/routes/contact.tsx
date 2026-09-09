import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useFormik } from "formik";
import { Clock3, Mail, MapPin, Phone, Send } from "lucide-react";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import supportImg from "@/assets/contact-support.png";

export const Route = createFileRoute("/contact")({
  head: () => ({ meta: [
    { title: "Contact UMOBIPAY — We're here to help" },
    { name: "description", content: "Contact UMOBIPAY for service support, partnerships and retailer onboarding in Cheeka, Haryana." },
  ] }),
  component: Contact,
});

const contactCards = [
  { icon: Mail, title: "Email", value: "support@umobipay.com", href: "mailto:support@umobipay.com", note: "Write to our support desk" },
  { icon: MapPin, title: "Office address", value: "7, Residence Colony, near Axis Bank, Cheeka, Haryana 136034", href: "https://maps.google.com/?q=Cheeka,Haryana", note: "Get directions" },
  { icon: Phone, title: "Phone", value: "+91 96103 31378", href: "tel:+919610331378", note: "Call our team" },
];

function Contact() {
  const [sent, setSent] = useState(false);
  const formik = useFormik({
    initialValues: { name: "", email: "", phone: "", message: "" },
    validate: (values) => {
      const errors: Record<string, string> = {};
      if (!values.name.trim()) errors.name = "Full name is required";
      if (!values.email.trim()) errors.email = "Email is required";
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) errors.email = "Enter a valid email";
      if (!/^\+?[0-9\s-]{10,15}$/.test(values.phone.trim())) errors.phone = "Enter a valid phone number";
      if (values.message.trim().length < 10) errors.message = "Please provide at least 10 characters";
      return errors;
    },
    onSubmit: (_, { resetForm }) => { setSent(true); resetForm(); },
  });
  const fieldClass = "mt-2 w-full rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/40 focus:border-primary focus:outline-none";
  const error = (name: keyof typeof formik.errors) => formik.touched[name] && formik.errors[name] ? <p className="mt-1 text-xs text-red-200">{formik.errors[name]}</p> : null;

  return <div className="min-h-screen bg-background">
    <SiteNav />
    <section className="relative overflow-hidden bg-mint">
      <div className="absolute inset-0 bg-grid opacity-40" />
      <div className="relative mx-auto grid max-w-7xl items-center gap-8 px-6 py-14 lg:grid-cols-[1.05fr_.95fr] lg:py-20">
        <div>
          <span className="text-xs font-bold uppercase tracking-[.22em] text-primary">Support & partnerships</span>
          <h1 className="mt-4 text-4xl font-extrabold text-secondary sm:text-6xl">Connect with <span className="text-primary">UMOBIPAY</span></h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-foreground/70 sm:text-lg">Have a question, need service assistance, or want to grow as a retail partner? Our dedicated team is ready to help.</p>
        </div>
        <img src={supportImg} alt="UMOBIPAY customer support representative" className="mx-auto max-h-72 w-full object-contain" />
      </div>
    </section>
    <main className="mx-auto max-w-7xl px-6 py-16 sm:py-20">
      <div className="mb-12 grid gap-5 md:grid-cols-3">
        {contactCards.map((item) => <a key={item.title} href={item.href} className="group rounded-3xl border border-border bg-card p-7 text-center shadow-soft transition hover:-translate-y-1 hover:border-primary/40">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-mint text-secondary transition group-hover:bg-primary group-hover:text-white"><item.icon size={24} /></span>
          <h2 className="mt-5 text-xl font-bold text-secondary">{item.title}</h2>
          <p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-foreground/70">{item.value}</p>
          <p className="mt-3 text-xs font-bold uppercase tracking-widest text-primary">{item.note}</p>
        </a>)}
      </div>
      <div className="grid gap-8 lg:grid-cols-5">
        <div className="overflow-hidden rounded-[2.5rem] border border-border bg-card shadow-soft lg:col-span-3">
          <iframe title="UMOBIPAY office location in Cheeka, Haryana" src="https://www.google.com/maps/embed?pb=!1m14!1m8!1m3!1d55251.18668576599!2d76.384229!3d30.059825!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3911d128898b0beb%3A0x822c5d286aae2dcb!2sCheeka%2C%20Haryana!5e0!3m2!1sen!2sin!4v1788430420557!5m2!1sen!2sin" className="h-[420px] w-full border-0 lg:h-full" loading="lazy" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen />
        </div>
        <div className="rounded-[2.5rem] bg-secondary p-8 text-white sm:p-10 lg:col-span-2">
          <h2 className="text-3xl font-extrabold">Send us a message</h2>
          <p className="mt-2 text-sm text-white/70">Share your requirement and our team will contact you during business hours.</p>
          <form onSubmit={formik.handleSubmit} className="mt-8 space-y-5">
            <div><label className="text-xs font-bold uppercase tracking-widest text-white/70">Full name</label><input name="name" value={formik.values.name} onChange={formik.handleChange} onBlur={formik.handleBlur} placeholder="Your full name" className={fieldClass} />{error("name")}</div>
            <div><label className="text-xs font-bold uppercase tracking-widest text-white/70">Email</label><input name="email" type="email" value={formik.values.email} onChange={formik.handleChange} onBlur={formik.handleBlur} placeholder="you@company.com" className={fieldClass} />{error("email")}</div>
            <div><label className="text-xs font-bold uppercase tracking-widest text-white/70">Phone</label><input name="phone" value={formik.values.phone} onChange={formik.handleChange} onBlur={formik.handleBlur} placeholder="+91 98765 43210" className={fieldClass} />{error("phone")}</div>
            <div><label className="text-xs font-bold uppercase tracking-widest text-white/70">Message</label><textarea name="message" rows={4} value={formik.values.message} onChange={formik.handleChange} onBlur={formik.handleBlur} placeholder="Tell us how we can help..." className={fieldClass} />{error("message")}</div>
            {sent && <p role="status" className="rounded-xl bg-emerald-400/15 p-3 text-sm text-emerald-100">Thank you. Your enquiry has been recorded.</p>}
            <button type="submit" className="inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3.5 text-sm font-semibold text-white shadow-elegant">Send enquiry <Send size={15} /></button>
            <p className="flex items-center gap-2 text-xs text-white/60"><Clock3 size={14} /> Monday–Saturday, 9:00 AM–8:00 PM IST</p>
          </form>
        </div>
      </div>
    </main>
    <SiteFooter />
  </div>;
}
