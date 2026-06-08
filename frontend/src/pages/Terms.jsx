import { Link } from "react-router-dom";
import useMeta from "../utils/useMeta";

const Terms = () => {
  useMeta({
    title: "Terms & Conditions — Speshway HRMS Usage Policy | Speshway",
    description: "Read the Terms and Conditions for using Speshway HRMS by Speshway Solutions. Understand our usage policies, user responsibilities, and service agreements.",
    keywords: "Speshway terms and conditions, Speshway Solutions terms, HRMS usage policy, service agreement, legal terms, Speshway HRMS",
    url: `${window.location.origin}/terms-and-conditions`,
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
            <img src="/images/Logo.jpg" alt="Logo" width="48" height="48" className="h-12 w-auto mr-3 rounded" />
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
        <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-4">Terms & Conditions</h1>
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-white/40 shadow-xl p-6 text-gray-800">
          <div className="space-y-6 text-gray-800">
  <section>
    <h2 className="text-xl font-semibold mb-2 text-gray-900">Overview</h2>
    <p>
      Speshway HRMS is a human‑resource management system used by organisations to manage employees,
      payroll, attendance and internal operations.
    </p>
  </section>
  <section>
    <h2 className="text-xl font-semibold mb-2 text-gray-900">Communications</h2>
    <p>
      Users receive system‑generated transactional emails (account creation, password reset,
      login alerts, HR notifications). These communications are essential for the service and
      are not marketing messages.
    </p>
  </section>
  <section>
    <h2 className="text-xl font-semibold mb-2 text-gray-900">Data Protection</h2>
    <p>
      Personal data (name, email, login activity) is stored securely and is never sold or shared
      with third parties. We employ industry‑standard encryption and access controls.
    </p>
  </section>
  <section>
    <h2 className="text-xl font-semibold mb-2 text-gray-900">Contact</h2>
    <p>
      For any questions, please contact{' '}
      <a href="mailto:support@speshwayhrms.com" className="text-blue-600 hover:underline">
        support@speshwayhrms.com
      </a>.
    </p>
  </section>
</div>
        </div>
      </main>

      <footer className="bg-transparent border-t border-white/20 py-4 text-center text-white text-sm">
        &copy; {new Date().getFullYear()} Speshway Solutions. All rights reserved.
      </footer>
    </div>
  );
};

export default Terms;
