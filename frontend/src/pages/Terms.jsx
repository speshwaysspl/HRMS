import useMeta from "../utils/useMeta";
import PublicHeader from "../components/common/PublicHeader";
import PublicFooter from "../components/common/PublicFooter";

const Terms = () => {
  useMeta({
    title: "Terms & Conditions — Speshway HRMS Usage Policy | Speshway",
    description: "Read the Terms and Conditions for using Speshway HRMS by Speshway Solutions. Understand our usage policies, user responsibilities, and service agreements.",
    keywords: "Speshway terms and conditions, Speshway Solutions terms, HRMS usage policy, service agreement, legal terms, Speshway HRMS",
    url: `${window.location.origin}/terms-and-conditions`,
    image: "/images/Logo.jpg",
  });
  return (
    <div className="min-h-screen flex flex-col font-sans bg-surface-muted">
      <PublicHeader />

      <main className="flex-grow container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl md:text-4xl font-semibold text-ink mb-6">Terms & Conditions</h1>
          <div className="bg-white rounded-xl border border-surface-subtle shadow-card p-8 text-ink-muted leading-relaxed">
            <div className="space-y-6">
  <section>
    <h2 className="text-lg font-semibold mb-2 text-ink">Overview</h2>
    <p>
      Speshway HRMS is a human‑resource management system used by organisations to manage employees,
      payroll, attendance and internal operations.
    </p>
  </section>
  <section>
    <h2 className="text-lg font-semibold mb-2 text-ink">Communications</h2>
    <p>
      Users receive system‑generated transactional emails (account creation, password reset,
      login alerts, HR notifications). These communications are essential for the service and
      are not marketing messages.
    </p>
  </section>
  <section>
    <h2 className="text-lg font-semibold mb-2 text-ink">Data Protection</h2>
    <p>
      Personal data (name, email, login activity) is stored securely and is never sold or shared
      with third parties. We employ industry‑standard encryption and access controls.
    </p>
  </section>
  <section>
    <h2 className="text-lg font-semibold mb-2 text-ink">Contact</h2>
    <p>
      For any questions, please contact{' '}
      <a href="mailto:support@speshwayhrms.com" className="text-brand-600 hover:underline">
        support@speshwayhrms.com
      </a>.
    </p>
  </section>
</div>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
};

export default Terms;
