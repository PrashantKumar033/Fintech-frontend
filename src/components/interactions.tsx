import { useEffect, useRef, useState, type ReactNode } from "react";

/* ── Custom mouse cursor (dot + magnetic ring) ───────────────── */
export function CustomCursor() {
  const dot = useRef<HTMLDivElement>(null);
  const ring = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    document.body.classList.add("cursor-host");

    let mx = window.innerWidth / 2;
    let my = window.innerHeight / 2;
    let rx = mx;
    let ry = my;
    let raf = 0;

    const move = (e: MouseEvent) => {
      mx = e.clientX;
      my = e.clientY;
      if (dot.current) dot.current.style.transform = `translate3d(${mx - 3.5}px, ${my - 3.5}px, 0)`;

      const el = e.target as HTMLElement | null;
      const interactive = !!el?.closest("a, button, input, textarea, select, [data-cursor]");
      if (ring.current) {
        ring.current.style.width = interactive ? "68px" : "40px";
        ring.current.style.height = interactive ? "68px" : "40px";
        ring.current.style.backgroundColor = interactive
          ? "color-mix(in oklab, var(--primary) 18%, transparent)"
          : "color-mix(in oklab, var(--primary) 8%, transparent)";
      }
    };

    const loop = () => {
      rx += (mx - rx) * 0.16;
      ry += (my - ry) * 0.16;
      if (ring.current) {
        const size = ring.current.offsetWidth / 2;
        ring.current.style.transform = `translate3d(${rx - size}px, ${ry - size}px, 0)`;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    window.addEventListener("mousemove", move);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", move);
      document.body.classList.remove("cursor-host");
    };
  }, []);

  return (
    <>
      <div ref={ring} aria-hidden className="cursor-ring hidden md:block" />
      <div ref={dot} aria-hidden className="cursor-dot hidden md:block" />
    </>
  );
}

/* ── Scroll reveal ───────────────────────────────────────────── */
export function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.12 },
    );
    io.observe(node);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={`${shown ? "reveal-shown" : "reveal-hidden"} ${className}`}
    >
      {children}
    </div>
  );
}

/* ── Count-up number ─────────────────────────────────────────── */
export function Counter({
  to,
  decimals = 0,
  duration = 1600,
}: {
  to: number;
  decimals?: number;
  duration?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [value, setValue] = useState(0);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    let raf = 0;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        const start = performance.now();
        const tick = (now: number) => {
          const p = Math.min((now - start) / duration, 1);
          const eased = 1 - Math.pow(1 - p, 3);
          setValue(to * eased);
          if (p < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      },
      { threshold: 0.4 },
    );
    io.observe(node);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [to, duration]);

  return (
    <span ref={ref}>
      {value.toLocaleString("en-IN", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}
    </span>
  );
}

/* ── Spotlight card (cursor-tracking glow) ───────────────────── */
export function SpotlightCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const node = ref.current;
    if (!node) return;
    const r = node.getBoundingClientRect();
    node.style.setProperty("--mx", `${e.clientX - r.left}px`);
    node.style.setProperty("--my", `${e.clientY - r.top}px`);
  };

  return (
    <div ref={ref} onMouseMove={onMove} className={`spotlight ${className}`}>
      {children}
    </div>
  );
}

/* ── Magnetic wrapper ────────────────────────────────────────── */
export function Magnetic({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const node = ref.current;
    if (!node) return;
    const r = node.getBoundingClientRect();
    const x = e.clientX - r.left - r.width / 2;
    const y = e.clientY - r.top - r.height / 2;
    node.style.transform = `translate3d(${x * 0.2}px, ${y * 0.3}px, 0)`;
  };

  const reset = () => {
    if (ref.current) ref.current.style.transform = "translate3d(0,0,0)";
  };

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={reset}
      className={`inline-block transition-transform duration-300 ease-out ${className}`}
    >
      {children}
    </div>
  );
}
