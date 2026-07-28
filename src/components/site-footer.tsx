import { Link } from "@tanstack/react-router";
import { Facebook, Twitter, Instagram, Linkedin, Mail, Phone, MapPin } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="mt-24 bg-secondary text-secondary-foreground">
      <div className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary font-display text-xl font-black">
                U
              </span>
              <span className="font-display text-lg font-extrabold">UMOBIPAY</span>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-secondary-foreground/70">
              Simple. Seamless. Secure. Powering everyday payments across India with BBPS-backed reliability.
            </p>
            <div className="mt-6 flex gap-3">
              {[Facebook, Twitter, Instagram, Linkedin].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  className="grid h-9 w-9 place-items-center rounded-full bg-secondary-foreground/10 transition-colors hover:bg-primary"
                  aria-label="social"
                >
                  <Icon size={16} />
                </a>
              ))}
            </div>
          </div>
          <div>
            <h4 className="font-display text-sm font-bold uppercase tracking-widest text-primary">
              Company
            </h4>
            <ul className="mt-4 space-y-3 text-sm text-secondary-foreground/80">
              <li><Link to="/about" className="hover:text-primary">About Us</Link></li>
              <li><Link to="/services" className="hover:text-primary">Our Services</Link></li>
              <li><Link to="/contact" className="hover:text-primary">Contact</Link></li>
              <li><a href="#" className="hover:text-primary">Careers</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-display text-sm font-bold uppercase tracking-widest text-primary">
              Services
            </h4>
            <ul className="mt-4 space-y-3 text-sm text-secondary-foreground/80">
              <li>Mobile & DTH Recharge</li>
              <li>DMT Services</li>
              <li>Utility Bill Collection</li>
              <li>BBPS Services</li>
            </ul>
          </div>
          <div>
            <h4 className="font-display text-sm font-bold uppercase tracking-widest text-primary">
              Get in touch
            </h4>
            <ul className="mt-4 space-y-3 text-sm text-secondary-foreground/80">
              <li className="flex items-start gap-2"><Mail size={16} className="mt-0.5 text-primary" /> support@umobipay.com</li>
              <li className="flex items-start gap-2"><Phone size={16} className="mt-0.5 text-primary" /> +91 98765 43210</li>
              <li className="flex items-start gap-2"><MapPin size={16} className="mt-0.5 text-primary" /> Mumbai, India</li>
            </ul>
          </div>
        </div>
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-secondary-foreground/10 pt-6 text-xs text-secondary-foreground/60 md:flex-row">
          <p>© {new Date().getFullYear()} UMOBIPAY. All rights reserved.</p>
          <div className="flex gap-6">
            <a href="#" className="hover:text-primary">Privacy</a>
            <a href="#" className="hover:text-primary">Terms</a>
            <a href="#" className="hover:text-primary">Refund Policy</a>
          </div>
        </div>
      </div>
    </footer>
  );
}