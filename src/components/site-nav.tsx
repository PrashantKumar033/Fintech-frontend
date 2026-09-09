import { Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";
import logo from "../assets/logo.png";
import { getSession, logout } from "@/lib/auth-api";

const links = [
  { to: "/", label: "Home" },
  { to: "/about", label: "About Us" },
  { to: "/services", label: "Our Services" },
  { to: "/contact", label: "Contact Us" },
];

export function SiteNav() {
  const [open, setOpen] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    setLoggedIn(!!getSession());
  }, []);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-secondary/10 bg-background/90 backdrop-blur-xl">
      <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-6 py-4">
        <Link to="/" className="flex items-center">
          <img src={logo} alt="UMOBIPAY logo" className="h-10 w-auto object-contain" />
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="rounded-full px-4 py-2 text-sm font-semibold text-primary transition-colors hover:bg-mint hover:text-secondary [&.active]:bg-mint [&.active]:text-secondary"
              activeOptions={{ exact: true }}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          {loggedIn ? (
            <>
              <Link
            to="/retailer/dashboard"
                className="rounded-full border border-secondary/20 px-5 py-2 text-sm font-semibold text-secondary transition-colors hover:bg-secondary hover:text-secondary-foreground"
              >
                Dashboard
              </Link>
              <button
                onClick={async () => {
                  await logout();
                  window.location.assign("/login");
                }}
                className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-elegant transition-transform hover:-translate-y-0.5"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="rounded-full border border-secondary/20 px-5 py-2 text-sm font-semibold text-secondary transition-colors hover:bg-secondary hover:text-secondary-foreground"
              >
                Login
              </Link>
              <Link
                to="/register"
                className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-elegant transition-transform hover:-translate-y-0.5"
              >
                Register
              </Link>
            </>
          )}
        </div>

        <button
          onClick={() => setOpen(!open)}
          className="grid h-10 w-10 place-items-center rounded-xl bg-mint text-secondary md:hidden"
          aria-label="Toggle menu"
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {open && (
        <div className="border-t border-border/50 bg-background md:hidden">
          <div className="flex flex-col gap-1 p-4">
            {links.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                onClick={() => setOpen(false)}
                className="rounded-lg px-4 py-3 text-sm font-medium text-foreground hover:bg-mint"
              >
                {l.label}
              </Link>
            ))}
            {loggedIn ? (
              <>
                <Link
              to="/retailer/dashboard"
                  onClick={() => setOpen(false)}
                  className="mt-2 rounded-lg px-4 py-3 text-sm font-medium text-foreground hover:bg-mint"
                >
                  Dashboard
                </Link>
                <button
                  onClick={async () => {
                    await logout();
                    setOpen(false);
                    window.location.assign("/login");
                  }}
                  className="mt-1 rounded-full bg-primary px-5 py-3 text-center text-sm font-semibold text-primary-foreground"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  onClick={() => setOpen(false)}
                  className="mt-2 rounded-lg px-4 py-3 text-sm font-medium text-foreground hover:bg-mint"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  onClick={() => setOpen(false)}
                  className="mt-1 rounded-full bg-primary px-5 py-3 text-center text-sm font-semibold text-primary-foreground"
                >
                  Register
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
