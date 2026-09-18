import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { io } from "socket.io-client";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  FiClock,
  FiCalendar,
  FiDollarSign,
  FiUserPlus,
  FiAward,
  FiBarChart2,
  FiShield,
  FiSmartphone,
  FiZap,
  FiCheck,
  FiArrowRight,
} from "react-icons/fi";
import { API_BASE } from "../utils/apiConfig";
import useMeta from "../utils/useMeta";
import PublicHeader from "../components/common/PublicHeader";
import PublicFooter from "../components/common/PublicFooter";

gsap.registerPlugin(ScrollTrigger);

const FEATURES = [
  { icon: FiClock, title: "Attendance", description: "Geo-verified check-in/out, shift tracking and real-time attendance reports." },
  { icon: FiCalendar, title: "Leave Management", description: "Configurable leave types, live balances and a shared team leave calendar." },
  { icon: FiDollarSign, title: "Payroll", description: "Template-driven payroll runs with automated payslip generation and history." },
  { icon: FiUserPlus, title: "Recruitment", description: "End-to-end candidate pipeline from application through onboarding." },
  { icon: FiAward, title: "Performance", description: "Structured manager reviews alongside continuous employee feedback." },
  { icon: FiBarChart2, title: "Analytics", description: "Live dashboards for headcount, attendance trends and recruitment funnels." },
];

const BENEFITS = [
  "Cut manual payroll and attendance work with automated, template-driven runs",
  "Give every employee self-service access to payslips, leave and profile updates",
  "Keep HR, managers and admins aligned with live dashboards and reports",
  "Onboard candidates faster with a structured recruitment-to-hire pipeline",
];

const STEPS = [
  { icon: FiUserPlus, title: "Set up your team", description: "Add departments, roles and employees — or import them in minutes." },
  { icon: FiZap, title: "Automate the routine", description: "Attendance, leave and payroll run themselves with built-in workflows." },
  { icon: FiBarChart2, title: "Track and decide", description: "Real-time dashboards give HR and leadership a live view of the business." },
];

const Home = () => {
  useMeta({
    title: "Speshway HRMS — Best HR Management Software | Speshway",
    description: "Speshway HRMS is the leading HR software by Speshway Solutions for managing employee attendance, payroll, leaves, and announcements. Streamline your HR operations with Speshway.",
    keywords: "Speshway, Speshway HRMS, Speshway Solutions, HR software, payroll management, attendance tracking, leave management, employee self service, HRMS India, best HRMS",
    url: window.location.origin,
    image: "/images/Logo.jpg",
  });

  const [quote, setQuote] = useState(null);
  const [imageError, setImageError] = useState(false);
  const heroRef = useRef(null);
  const pageRef = useRef(null);

  // Performant hero entrance: transform + opacity only, single staggered
  // tween, gsap.context for scoped cleanup, reduced-motion aware.
  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const items = gsap.utils.toArray("[data-hero]");
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        gsap.set(items, { autoAlpha: 1 });
        return;
      }
      gsap.set(items, { autoAlpha: 0, y: 24 });
      gsap.to(items, {
        autoAlpha: 1,
        y: 0,
        duration: 0.7,
        ease: "power3.out",
        stagger: 0.09,
        clearProps: "transform",
      });
    }, heroRef);
    return () => ctx.revert();
  }, []);

  // Scroll-triggered reveals for everything below the hero: transform +
  // opacity only, batched per section so each group staggers in together,
  // "once" so it never re-costs on re-scroll, reduced-motion aware.
  useLayoutEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const ctx = gsap.context(() => {
      const groups = gsap.utils.toArray("[data-reveal-group]");
      groups.forEach((group) => {
        const items = group.querySelectorAll("[data-reveal]");
        if (!items.length) return;

        if (reduced) {
          gsap.set(items, { autoAlpha: 1 });
          return;
        }

        gsap.set(items, { autoAlpha: 0, y: 28 });
        ScrollTrigger.batch(items, {
          start: "top 85%",
          once: true,
          onEnter: (batch) =>
            gsap.to(batch, {
              autoAlpha: 1,
              y: 0,
              duration: 0.7,
              ease: "power3.out",
              stagger: 0.08,
              overwrite: true,
            }),
        });
      });
    }, pageRef);
    return () => ctx.revert();
  }, []);

  useEffect(() => {
    const fetchQuote = async () => {
      try {
        const response = await axios.get(`${API_BASE}/api/daily-quote`);
        if (response.data.success) {
          setQuote(response.data.quote || null);
          setImageError(false);
        }
      } catch (error) {
        console.error("Error fetching daily quote:", error);
      }
    };

    fetchQuote();

    const socket = io(API_BASE, { transports: ["websocket", "polling"] });
    socket.on("daily-quote-updated", fetchQuote);

    const intervalId = setInterval(fetchQuote, 30000);

    return () => {
      socket.disconnect();
      clearInterval(intervalId);
    };
  }, []);

  return (
    <div ref={pageRef} className="min-h-screen flex flex-col font-sans bg-surface-muted">
      <PublicHeader />

      {/* Hero */}
      <section
        ref={heroRef}
        className="relative bg-brand-900 min-h-screen flex items-center overflow-hidden"
      >
        {/* soft ambient glows — static, no animation cost */}
        <div className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 h-[32rem] w-[32rem] rounded-full bg-accent-500/10 blur-3xl" aria-hidden="true" />
        <div className="pointer-events-none absolute -bottom-40 -right-24 h-96 w-96 rounded-full bg-brand-500/20 blur-3xl" aria-hidden="true" />

        <div className="container mx-auto px-4 py-20 md:py-28 relative">
          <div className="mx-auto max-w-3xl text-center [will-change:transform]">
            <span
              data-hero
              className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/80 ring-1 ring-white/15"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-accent-400" />
              Speshway HRMS
            </span>

            <h1
              data-hero
              className="mt-7 text-4xl md:text-6xl font-semibold text-white leading-[1.08] tracking-tight"
            >
              The complete HR platform for{" "}
              <span className="text-accent-500">growing teams</span>
            </h1>

            <p
              data-hero
              className="mt-6 text-white/70 text-base md:text-lg max-w-xl mx-auto"
            >
              Attendance, leave, payroll, recruitment and performance — unified in one
              secure portal your whole company can rely on.
            </p>

            <div
              data-hero
              className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3"
            >
              <Link
                to="/login"
                className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-accent-600 hover:bg-accent-700 active:bg-accent-800 text-white font-semibold transition-colors text-center"
              >
                Sign In
              </Link>
              <Link
                to="/contact"
                className="w-full sm:w-auto px-7 py-3.5 rounded-xl border border-white/20 text-white font-semibold hover:bg-white/10 transition-colors text-center"
              >
                Contact Sales
              </Link>
            </div>

            <div
              data-hero
              className="mt-12 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-white/45"
            >
              {["Attendance", "Leave", "Payroll", "Recruitment", "Performance"].map((item) => (
                <span key={item} className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-accent-500" />
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-24" data-reveal-group>
        <div data-reveal className="text-center mb-14 max-w-2xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-semibold text-ink tracking-tight">Everything HR needs, in one place</h2>
          <p className="text-ink-muted mt-3 leading-relaxed">Built for accuracy, speed and a professional employee experience.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {FEATURES.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              data-reveal
              className="bg-white border border-surface-subtle rounded-xl p-6 transition-shadow hover:shadow-panel"
            >
              <div className="w-11 h-11 rounded-lg bg-brand-50 text-brand-700 flex items-center justify-center mb-4">
                <Icon size={20} />
              </div>
              <h3 className="text-base font-semibold text-ink">{title}</h3>
              <p className="text-ink-muted text-sm mt-1.5 leading-relaxed">{description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="bg-white border-y border-surface-subtle">
        <div className="container mx-auto px-4 py-24" data-reveal-group>
          <div data-reveal className="text-center mb-16 max-w-2xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-semibold text-ink tracking-tight">Up and running in three steps</h2>
            <p className="text-ink-muted mt-3 leading-relaxed">No lengthy rollout — your team can be live the same week.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 max-w-5xl mx-auto">
            {STEPS.map(({ icon: Icon, title, description }, i) => (
              <div key={title} data-reveal className="relative text-center md:text-left">
                <div className="flex items-center justify-center md:justify-start gap-3 mb-4">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-900 text-white font-semibold text-sm">
                    {i + 1}
                  </span>
                  <Icon className="text-brand-700" size={20} />
                </div>
                <h3 className="text-base font-semibold text-ink">{title}</h3>
                <p className="text-ink-muted text-sm mt-1.5 leading-relaxed">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="container mx-auto px-4 py-24" data-reveal-group>
        <div className="grid lg:grid-cols-2 gap-14 items-center max-w-5xl mx-auto">
          <div data-reveal>
            <h2 className="text-2xl md:text-3xl font-semibold text-ink leading-tight tracking-tight">
              Why teams choose Speshway HRMS
            </h2>
            <p className="text-ink-muted mt-4 leading-relaxed">
              One platform for HR, managers and employees — replacing spreadsheets,
              scattered approvals and manual payroll work with a single source of truth.
            </p>
            <ul className="mt-9 space-y-5">
              {BENEFITS.map((point) => (
                <li key={point} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-50 text-accent-600">
                    <FiCheck size={12} />
                  </span>
                  <span className="text-ink text-sm leading-relaxed">{point}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="grid grid-cols-2 gap-5">
            {[
              { icon: FiShield, title: "Secure by design", description: "Role-based access keeps sensitive HR data visible only to the right people." },
              { icon: FiSmartphone, title: "Works everywhere", description: "Responsive web portal plus a dedicated mobile app for on-the-go access." },
              { icon: FiZap, title: "Real-time updates", description: "Live dashboards and notifications keep everyone on the same page." },
              { icon: FiAward, title: "Built for growth", description: "Scales from a single department to your entire organization." },
            ].map(({ icon: Icon, title, description }) => (
              <div key={title} data-reveal className="bg-brand-900 rounded-xl p-5">
                <Icon className="text-accent-400" size={20} />
                <h3 className="text-white text-sm font-semibold mt-3">{title}</h3>
                <p className="text-white/60 text-xs mt-1.5 leading-relaxed">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA banner */}
      <section className="relative bg-brand-900 overflow-hidden" data-reveal-group>
        <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 h-72 w-72 rounded-full bg-accent-500/15 blur-3xl" aria-hidden="true" />
        <div className="container mx-auto px-4 py-20 text-center relative">
          <h2 data-reveal className="text-2xl md:text-3xl font-semibold text-white max-w-xl mx-auto tracking-tight">
            Ready to simplify HR for your team?
          </h2>
          <p data-reveal className="text-white/60 mt-3 max-w-lg mx-auto leading-relaxed">
            Get your organization set up on Speshway HRMS and give every employee a
            single, secure home for HR.
          </p>
          <div data-reveal className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/login"
              className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-accent-600 hover:bg-accent-700 active:bg-accent-800 text-white font-semibold transition-colors text-center"
            >
              Sign In
            </Link>
            <Link
              to="/contact"
              className="group w-full sm:w-auto px-7 py-3.5 rounded-xl border border-white/20 text-white font-semibold hover:bg-white/10 transition-colors text-center inline-flex items-center justify-center gap-2"
            >
              Talk to Sales
              <FiArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Daily HR insight */}
      {quote && !imageError && (
        <section className="container mx-auto px-4 pb-16">
          <div className="max-w-2xl mx-auto bg-white border border-surface-subtle rounded-xl p-4 flex items-center gap-4">
            <img
              src={quote.imageUrl.startsWith("http") ? quote.imageUrl : `${API_BASE}${quote.imageUrl}`}
              alt="HR insight of the day"
              className="w-20 h-20 object-cover rounded-lg flex-shrink-0"
              onError={() => setImageError(true)}
            />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">HR Insight of the Day</p>
              <p className="text-sm text-ink-muted mt-1">Stay inspired — check the portal for today's update.</p>
            </div>
          </div>
        </section>
      )}

      <PublicFooter />
    </div>
  );
};

export default Home;
