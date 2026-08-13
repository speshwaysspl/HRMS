import useMeta from "../utils/useMeta";
import PublicHeader from "../components/common/PublicHeader";
import PublicFooter from "../components/common/PublicFooter";

const Privacy = () => {
  useMeta({
    title: "Privacy Policy — Speshway HRMS Data Protection | Speshway",
    description: "Learn how Speshway Solutions collects, uses, and protects your personal information on Speshway HRMS. We are committed to data privacy and security.",
    keywords: "Speshway privacy policy, Speshway Solutions privacy, data protection, HRMS security, personal information, Speshway HRMS",
    url: `${window.location.origin}/privacy-policy`,
    image: "/images/Logo.jpg",
  });
  return (
    <div className="min-h-screen flex flex-col font-sans bg-surface-muted">
      <PublicHeader />

      <main className="flex-grow container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl md:text-4xl font-semibold text-ink mb-6">Privacy Policy</h1>
          <div className="bg-white rounded-xl border border-surface-subtle shadow-card p-8 text-ink-muted leading-relaxed">
            <div className="space-y-4">
              <p>
                Speshway HRMS respects your privacy.
              </p>
              <p>
                We collect user information such as name, email address, and login activity
                only for providing HRMS-related services including authentication, notifications,
                and system alerts.
              </p>
              <h2 className="text-lg font-semibold text-ink mt-6 mb-2">Email Communication</h2>
              <p>
                We send transactional emails such as account creation, password reset,
                login alerts, and HR-related notifications. We do not send marketing emails.
              </p>
              <h2 className="text-lg font-semibold text-ink mt-6 mb-2">Data Protection</h2>
              <p>
                User data is stored securely and is never sold or shared with third parties.
              </p>
              <h2 className="text-lg font-semibold text-ink mt-6 mb-2">Contact</h2>
              <p>
                If you have any questions, contact us at <a href="mailto:support@speshwayhrms.com" className="text-brand-600 hover:underline">support@speshwayhrms.com</a>
              </p>
            </div>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
};

export default Privacy;
