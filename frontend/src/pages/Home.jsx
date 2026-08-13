import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { io } from "socket.io-client";
import {
  FiClock,
  FiCalendar,
  FiDollarSign,
  FiUserPlus,
  FiAward,
  FiBarChart2,
} from "react-icons/fi";
import { API_BASE } from "../utils/apiConfig";
import useMeta from "../utils/useMeta";
import PublicHeader from "../components/common/PublicHeader";
import PublicFooter from "../components/common/PublicFooter";

const FEATURES = [
  { icon: FiClock, title: "Attendance", description: "Geo-verified check-in/out, shift tracking and real-time attendance reports." },
  { icon: FiCalendar, title: "Leave Management", description: "Configurable leave types, live balances and a shared team leave calendar." },
  { icon: FiDollarSign, title: "Payroll", description: "Template-driven payroll runs with automated payslip generation and history." },
  { icon: FiUserPlus, title: "Recruitment", description: "End-to-end candidate pipeline from application through onboarding." },
  { icon: FiAward, title: "Performance", description: "Structured manager reviews alongside continuous employee feedback." },
  { icon: FiBarChart2, title: "Analytics", description: "Live dashboards for headcount, attendance trends and recruitment funnels." },
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
    <div className="min-h-screen flex flex-col font-sans bg-surface-muted">
      <PublicHeader />

      {/* Hero */}
      <section className="bg-brand-900">
        <div className="container mx-auto px-4 py-16 md:py-24 text-center">
          <h1 className="text-3xl md:text-5xl font-semibold text-white leading-tight max-w-3xl mx-auto">
            The complete HR platform for <span className="text-accent-500">growing teams</span>
          </h1>
          <p className="text-white/70 text-base md:text-lg mt-5 max-w-xl mx-auto">
            Attendance, leave, payroll, recruitment and performance — unified in one secure portal.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <Link
              to="/login"
              className="px-6 py-3 rounded-lg bg-accent-600 hover:bg-accent-700 text-white font-semibold transition-colors"
            >
              Sign In
            </Link>
            <Link
              to="/contact"
              className="px-6 py-3 rounded-lg border border-white/20 text-white font-semibold hover:bg-white/10 transition-colors"
            >
              Contact Sales
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-16">
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-semibold text-ink">Everything HR needs, in one place</h2>
          <p className="text-ink-muted mt-2">Built for accuracy, speed and a professional employee experience.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-5xl mx-auto">
          {FEATURES.map(({ icon: Icon, title, description }) => (
            <div key={title} className="bg-white border border-surface-subtle rounded-xl p-6">
              <div className="w-11 h-11 rounded-lg bg-brand-50 text-brand-700 flex items-center justify-center mb-4">
                <Icon size={20} />
              </div>
              <h3 className="text-base font-semibold text-ink">{title}</h3>
              <p className="text-ink-muted text-sm mt-1.5 leading-relaxed">{description}</p>
            </div>
          ))}
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
