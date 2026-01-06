import { Link } from "react-router-dom";
import { FaEnvelope, FaPhone, FaMapMarkerAlt } from "react-icons/fa";
import useMeta from "../utils/useMeta";

const Contact = () => {
  useMeta({
    title: "Contact Speshway Solutions — HRMS Support & Sales",
    description: "Contact Speshway Solutions for HRMS inquiries, support, and sales. Reach us via email, phone, or visit our office in Hyderabad.",
    keywords: "contact Speshway, HRMS support, Speshway Solutions address, HR software inquiry, Hyderabad",
    url: "https://speshwayhrms.com/contact",
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
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-extrabold text-white">Contact Us</h1>
          <p className="mt-2 text-white/90">We’d love to hear from you</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-white/40 shadow-xl p-6">
            <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center mb-4">
              <FaEnvelope />
            </div>
            <h3 className="text-base font-semibold text-gray-800">Email Us</h3>
            <p className="text-gray-600 mt-1">support@speshwayhrms.com</p>
          </div>

          <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-white/40 shadow-xl p-6">
            <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center mb-4">
              <FaPhone />
            </div>
            <h3 className="text-base font-semibold text-gray-800">Call Us</h3>
            <p className="text-gray-600 mt-1">+91 9154986733 || +91 9154986732</p>
          </div>

          <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-white/40 shadow-xl p-6">
            <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center mb-4">
              <FaMapMarkerAlt />
            </div>
            <h3 className="text-base font-semibold text-gray-800">India Office</h3>
            <p className="text-gray-600 mt-1">
              Plot No 1/C, Sy No 83/1, Raidurgam Knowledge City Rd, panmaktha Hyderabad, Serilingampalle (M), Rai Durg, Telangana 500032
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

export default Contact;
