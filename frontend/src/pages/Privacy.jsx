import { Link } from "react-router-dom";
import useMeta from "../utils/useMeta";

const Privacy = () => {
  useMeta({
    title: "Privacy Policy — Speshway HRMS Data Protection",
    description: "Learn how Speshway HRMS collects, uses, and protects your personal information. We are committed to data privacy and security.",
    keywords: "Speshway privacy policy, data protection, HRMS security, personal information",
    url: "https://speshwayhrms.com/privacy-policy",
    image: "/images/Logo.jpg",
  });
  return (
    <div
      className="min-h-screen flex flex-col font-sans"
      style={{
        backgroundImage:
          "linear-gradient(rgba(2,6,23,0.6), rgba(2,6,23,0.6)), url('/images/download.jpeg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
      }}
    >
      <header className="bg-transparent absolute top-0 left-0 right-0 z-10">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center">
            <img src="/images/Logo.jpg" alt="Logo" className="h-12 w-auto mr-3 rounded" />
            <span className="text-xl font-bold text-white hidden md:block">SPESHWAY HRMS</span>
          </div>
          <nav className="flex space-x-6 text-white font-medium text-sm md:text-base">
            <Link to="/" className="hover:text-blue-400 transition">Home</Link>
            <Link to="/login" className="hover:text-blue-400 transition">Login</Link>
            <Link to="/contact" className="hover:text-blue-400 transition">Contact</Link>
            <Link to="/terms-and-conditions" className="hover:text-blue-400 transition">T&C</Link>
            <Link to="/privacy-policy" className="hover:text-blue-400 transition">Privacy Policy</Link>
          </nav>
        </div>
      </header>

      <main className="flex-grow container mx-auto px-4 pt-24 pb-12">
        <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-4">Privacy Policy</h1>
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-white/40 shadow-xl p-6 text-gray-800">
          <div className="space-y-4">
            <p>
              Speshway HRMS respects your privacy.
            </p>
            <p>
              We collect user information such as name, email address, and login activity
              only for providing HRMS-related services including authentication, notifications,
              and system alerts.
            </p>
            <h2 className="text-xl font-bold mt-4 mb-2">Email Communication:</h2>
            <p>
              We send transactional emails such as account creation, password reset,
              login alerts, and HR-related notifications. We do not send marketing emails.
            </p>
            <h2 className="text-xl font-bold mt-4 mb-2">Data Protection:</h2>
            <p>
              User data is stored securely and is never sold or shared with third parties.
            </p>
            <h2 className="text-xl font-bold mt-4 mb-2">Contact:</h2>
            <p>
              If you have any questions, contact us at <a href="mailto:support@speshwayhrms.com" className="text-blue-600 hover:underline">support@speshwayhrms.com</a>
            </p>
          </div>
        </div>
      </main>

      <footer className="bg-transparent border-t border-white/20 py-4 text-center text-white text-sm">
        &copy; {new Date().getFullYear()} Speshway Solutions. All rights reserved.
      </footer>
    </div>
  );
};

export default Privacy;
