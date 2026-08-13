import { FaEnvelope, FaPhone, FaMapMarkerAlt } from "react-icons/fa";
import useMeta from "../utils/useMeta";
import PublicHeader from "../components/common/PublicHeader";
import PublicFooter from "../components/common/PublicFooter";

const Contact = () => {
  useMeta({
    title: "Contact Speshway Solutions — HRMS Support & Sales",
    description: "Contact Speshway Solutions for Speshway HRMS inquiries, support, and sales. Reach us via email, phone, or visit our office in Hyderabad.",
    keywords: "contact Speshway, Speshway Solutions contact, Speshway HRMS support, HR software inquiry, Hyderabad, Speshway address",
    url: `${window.location.origin}/contact`,
    image: "/images/Logo.jpg",
  });
  return (
    <div className="min-h-screen flex flex-col font-sans bg-surface-muted">
      <PublicHeader />

      <main className="flex-grow container mx-auto px-4 py-12">
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-semibold text-ink">Contact Us</h1>
          <p className="mt-2 text-ink-muted">We’d love to hear from you</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          <div className="bg-white rounded-xl border border-surface-subtle shadow-card p-6">
            <div className="w-12 h-12 rounded-lg bg-brand-50 text-brand-700 flex items-center justify-center mb-4">
              <FaEnvelope />
            </div>
            <h3 className="text-base font-semibold text-ink">Email Us</h3>
            <p className="text-ink-muted mt-1">support@speshwayhrms.com</p>
          </div>

          <div className="bg-white rounded-xl border border-surface-subtle shadow-card p-6">
            <div className="w-12 h-12 rounded-lg bg-brand-50 text-brand-700 flex items-center justify-center mb-4">
              <FaPhone />
            </div>
            <h3 className="text-base font-semibold text-ink">Call Us</h3>
            <p className="text-ink-muted mt-1">+91 9154986733 || +91 9154986732</p>
          </div>

          <div className="bg-white rounded-xl border border-surface-subtle shadow-card p-6">
            <div className="w-12 h-12 rounded-lg bg-brand-50 text-brand-700 flex items-center justify-center mb-4">
              <FaMapMarkerAlt />
            </div>
            <h3 className="text-base font-semibold text-ink">India Office</h3>
            <p className="text-ink-muted mt-1">
              Plot No 1/C, Sy No 83/1, Raidurgam Knowledge City Rd, panmaktha Hyderabad, Serilingampalle (M), Rai Durg, Telangana 500032
            </p>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
};

export default Contact;
