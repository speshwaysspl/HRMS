import useMeta from "../utils/useMeta";
import PublicHeader from "../components/common/PublicHeader";
import PublicFooter from "../components/common/PublicFooter";

const LAST_UPDATED = "17 September 2026";

const SECTIONS = [
  {
    title: "1. Introduction",
    body: [
      "Speshway Solutions Pvt. Ltd. (“Speshway,” “we,” “us,” or “our”) provides Speshway HRMS, a human resource management platform used by organisations to manage attendance, leave, payroll, recruitment, performance and related workplace data (the “Service”).",
      "This Privacy Policy explains what information we collect through the Service, how we use and protect it, and the choices available to you. It applies to HR administrators, managers, employees and candidates who access the Service, whether through the web portal or the mobile app.",
      "If your organisation is the customer that has deployed Speshway HRMS (the “Employer”), the Employer controls how employee data within its account is used, and this policy describes how Speshway processes that data on the Employer’s behalf as well as data we collect directly.",
    ],
  },
  {
    title: "2. Information We Collect",
    body: [
      "Account & profile data: name, work email, phone number, employee ID, designation, department and profile photo.",
      "Employment data: attendance and check-in/out records, leave requests and balances, payroll and payslip records, performance reviews, feedback, and recruitment/candidate application details.",
      "Usage data: login activity, device and browser information, IP address, and system logs collected automatically to secure and operate the Service.",
      "Communications: messages, support requests, and notification preferences you share with us.",
    ],
  },
  {
    title: "3. How We Use Information",
    body: [
      "To provide core HRMS functionality — authentication, attendance tracking, leave management, payroll processing, recruitment workflows and performance reviews.",
      "To send transactional communications such as account creation, password resets, login alerts, approval notifications and payslip availability. We do not send marketing emails through the Service.",
      "To maintain the security, integrity and availability of the Service, including detecting and preventing fraud, abuse or unauthorised access.",
      "To generate aggregated, de-identified analytics (e.g. attendance trends, headcount) for the Employer’s internal reporting.",
    ],
  },
  {
    title: "4. How We Share Information",
    body: [
      "We do not sell personal information, and we do not share it with third parties for their own marketing purposes.",
      "Within your organisation, data is visible only to roles authorised to see it — for example, a manager may see their team’s attendance and leave, while payroll data is restricted to HR and admin roles.",
      "We may share data with trusted service providers who support the Service (such as cloud hosting, email delivery and analytics), bound by confidentiality and data-processing obligations, and only to the extent needed to provide that support.",
      "We may disclose information if required by law, regulation, legal process or governmental request, or to protect the rights, property or safety of Speshway, our customers or others.",
    ],
  },
  {
    title: "5. Data Security",
    body: [
      "We use industry-standard safeguards to protect data in transit and at rest, including encryption, role-based access control, and authenticated sessions.",
      "Access to production data is restricted to authorised personnel on a need-to-know basis, and administrative actions are logged.",
      "No method of transmission or storage is 100% secure; while we work to protect your information, we cannot guarantee absolute security.",
    ],
  },
  {
    title: "6. Data Retention",
    body: [
      "We retain employment and account data for as long as your organisation’s account is active, and for a reasonable period afterward as required for legal, tax, audit or legitimate business purposes.",
      "When data is no longer required, it is securely deleted or anonymised in accordance with our internal retention schedule and the Employer’s instructions.",
    ],
  },
  {
    title: "7. Your Rights & Choices",
    body: [
      "You can review and update your profile information directly within the Service. Requests to access, correct, export or delete personal data should be directed to your organisation’s HR administrator, or to us at the contact below.",
      "Employees may opt out of non-essential notifications from within account settings; transactional and security-related communications cannot be disabled as they are necessary for the Service to function.",
    ],
  },
  {
    title: "8. Cookies & Similar Technologies",
    body: [
      "The web portal uses essential cookies and browser storage to keep you signed in, remember preferences, and keep the application secure. We do not use third-party advertising cookies.",
    ],
  },
  {
    title: "9. Children’s Privacy",
    body: [
      "Speshway HRMS is a workplace product intended for use by employees, contractors and candidates of our business customers. It is not directed at children, and we do not knowingly collect information from individuals under the age of 18.",
    ],
  },
  {
    title: "10. Changes to This Policy",
    body: [
      "We may update this Privacy Policy from time to time to reflect changes in our practices or for legal, operational or regulatory reasons. Material changes will be communicated through the Service or by email, and the “Last updated” date below will be revised accordingly.",
    ],
  },
  {
    title: "11. Contact Us",
    body: [
      "If you have questions about this Privacy Policy or how your data is handled, contact us at",
    ],
    contact: true,
  },
];

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

      <main className="flex-grow container mx-auto px-4 py-14">
        <div className="max-w-3xl mx-auto">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-faint">Legal</p>
          <h1 className="text-3xl md:text-4xl font-semibold text-ink mt-2 tracking-tight">Privacy Policy</h1>
          <p className="text-ink-muted text-sm mt-3">Last updated: {LAST_UPDATED}</p>

          <div className="bg-white rounded-xl border border-surface-subtle shadow-card p-8 md:p-10 mt-8 text-ink-muted leading-relaxed">
            <div className="space-y-8">
              {SECTIONS.map((section) => (
                <section key={section.title}>
                  <h2 className="text-base md:text-lg font-semibold text-ink mb-2.5">{section.title}</h2>
                  <div className="space-y-3">
                    {section.body.map((para, i) => (
                      <p key={i}>
                        {para}
                        {section.contact && i === section.body.length - 1 && (
                          <>
                            {" "}
                            <a href="mailto:support@speshwayhrms.com" className="text-brand-600 hover:underline">
                              support@speshwayhrms.com
                            </a>
                            .
                          </>
                        )}
                      </p>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
};

export default Privacy;
