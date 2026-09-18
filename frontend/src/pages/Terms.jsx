import useMeta from "../utils/useMeta";
import PublicHeader from "../components/common/PublicHeader";
import PublicFooter from "../components/common/PublicFooter";

const LAST_UPDATED = "17 September 2026";

const SECTIONS = [
  {
    title: "1. Acceptance of Terms",
    body: [
      "These Terms & Conditions (“Terms”) govern access to and use of Speshway HRMS (the “Service”), provided by Speshway Solutions Pvt. Ltd. (“Speshway,” “we,” “us”). By logging in or otherwise using the Service, you agree to be bound by these Terms. If you do not agree, do not use the Service.",
      "If you are using the Service on behalf of an organisation (an “Employer”), you represent that you are authorised to accept these Terms on that organisation’s behalf.",
    ],
  },
  {
    title: "2. Description of Service",
    body: [
      "Speshway HRMS is a human resource management platform that helps organisations manage attendance, leave, payroll, recruitment, performance reviews and related workplace operations through a web portal and mobile app.",
      "Features and modules available to you depend on the role assigned to your account (e.g. Admin, HR, Manager, Employee or Candidate) by your Employer.",
    ],
  },
  {
    title: "3. Accounts & Access",
    body: [
      "Accounts are typically created and managed by your Employer’s HR/Admin team. You are responsible for maintaining the confidentiality of your login credentials and for all activity that occurs under your account.",
      "You must notify your Employer or Speshway immediately if you suspect unauthorised access to your account.",
      "Access to specific data and actions is governed by role-based permissions; attempting to access data or functionality outside your assigned role is prohibited.",
    ],
  },
  {
    title: "4. Acceptable Use",
    body: [
      "You agree to use the Service only for its intended purpose — managing legitimate workplace HR activities — and not to:",
      "• upload false, misleading or unlawful information (e.g. falsified attendance, leave or payroll records);",
      "• attempt to gain unauthorised access to accounts, data or systems, or interfere with the Service’s security or availability;",
      "• reverse engineer, scrape or resell the Service, or use it to build a competing product;",
      "• upload malicious code or content that infringes another party’s rights.",
    ],
  },
  {
    title: "5. Employer & Employee Data",
    body: [
      "Where your organisation is the customer, the Employer determines what employee and workplace data is entered into the Service and is responsible for having the appropriate legal basis to process that data.",
      "Speshway processes this data to provide the Service, in line with our Privacy Policy, and does not use it for purposes unrelated to operating and improving the Service.",
    ],
  },
  {
    title: "6. Intellectual Property",
    body: [
      "The Service, including its software, design, branding and documentation, is owned by Speshway Solutions Pvt. Ltd. and protected by applicable intellectual property laws. These Terms do not grant you any ownership rights in the Service.",
      "You retain ownership of the data your organisation submits to the Service. You grant Speshway a limited licence to host, process and display that data solely to provide the Service.",
    ],
  },
  {
    title: "7. Service Availability",
    body: [
      "We aim to keep the Service reliable and available, but do not guarantee uninterrupted or error-free operation. Planned maintenance, updates or circumstances beyond our reasonable control may occasionally affect availability.",
    ],
  },
  {
    title: "8. Disclaimers & Limitation of Liability",
    body: [
      "The Service is provided “as is” and “as available.” To the fullest extent permitted by law, Speshway disclaims warranties of any kind, express or implied, regarding the Service.",
      "To the fullest extent permitted by law, Speshway shall not be liable for indirect, incidental, or consequential damages arising from your use of the Service. Our aggregate liability for any claim relating to the Service is limited as set out in the applicable agreement between Speshway and your Employer.",
    ],
  },
  {
    title: "9. Termination",
    body: [
      "Access to the Service may be suspended or terminated by your Employer (e.g. upon end of employment) or by Speshway for breach of these Terms, non-payment by the Employer, or to protect the security or integrity of the Service.",
      "Provisions that by their nature should survive termination (including intellectual property, disclaimers and limitation of liability) will continue to apply.",
    ],
  },
  {
    title: "10. Changes to These Terms",
    body: [
      "We may update these Terms from time to time to reflect changes to the Service or for legal and operational reasons. Continued use of the Service after an update constitutes acceptance of the revised Terms. The “Last updated” date below reflects the most recent revision.",
    ],
  },
  {
    title: "11. Governing Law",
    body: [
      "These Terms are governed by the laws of India, without regard to conflict-of-law principles, and any disputes will be subject to the exclusive jurisdiction of the competent courts in India.",
    ],
  },
  {
    title: "12. Contact Us",
    body: [
      "Questions about these Terms can be directed to",
    ],
    contact: true,
  },
];

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

      <main className="flex-grow container mx-auto px-4 py-14">
        <div className="max-w-3xl mx-auto">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-faint">Legal</p>
          <h1 className="text-3xl md:text-4xl font-semibold text-ink mt-2 tracking-tight">Terms &amp; Conditions</h1>
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

export default Terms;
