import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { API_BASE } from "../utils/apiConfig";
import useMeta from "../utils/useMeta";

const Home = () => {
  useMeta({
    title: "Speshway HRMS — Best HR Management Software | Payroll, Attendance & Leaves",
    description: "Speshway HRMS is the best HR software for managing employee attendance, payroll, leaves, and announcements. Streamline your HR operations today.",
    keywords: "Speshway HRMS, HR software, payroll management, attendance tracking, leave management, employee self service, HRMS India, best HRMS",
    url: "https://speshwayhrms.com/",
    image: "/images/Logo.jpg",
  });
  const [quote, setQuote] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchQuote = async () => {
      try {
        const response = await axios.get(`${API_BASE}/api/daily-quote`);
        if (response.data.success && response.data.quote) {
          setQuote(response.data.quote);
        }
      } catch (error) {
        console.error("Error fetching daily quote:", error);
      }
    };

    fetchQuote();
  }, []);

  return (
    <div 
      className="min-h-screen flex flex-col font-sans"
      style={{
        backgroundImage: "linear-gradient(rgba(2,6,23,0.6), rgba(2,6,23,0.6)), url('/images/download.jpeg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed"
      }}
    >
      {/* Header */}
      <header className="bg-transparent absolute top-0 left-0 right-0 z-10">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center relative">
          <div
            className="flex items-center cursor-pointer md:cursor-default"
            onClick={() => setMenuOpen((prev) => !prev)}
          >
             {/* Logo */}
             <img src="/images/Logo.jpg" alt="Logo" className="h-12 w-auto mr-3 rounded" />
             <span className="text-xl font-bold text-white hidden md:block">SPESHWAY HRMS</span>
          </div>
          <nav className="hidden md:flex text-white font-medium text-sm md:text-base md:space-x-6">
            <Link to="/login" className="hover:text-blue-400 transition">Login</Link>
            <Link to="/contact" className="hover:text-blue-400 transition">Contact</Link>
            <Link to="/terms-and-conditions" className="hover:text-blue-400 transition">T&C</Link>
            <Link to="/privacy-policy" className="hover:text-blue-400 transition">Privacy Policy</Link>
          </nav>
          {menuOpen && (
            <div
              className="fixed inset-0 z-20 bg-white md:hidden flex flex-col items-center justify-center gap-6 text-gray-900 text-lg font-semibold"
              onClick={() => setMenuOpen(false)}
            >
              <Link to="/login" className="px-6 py-3 rounded-md w-4/5 text-center bg-gray-100 hover:bg-gray-200 active:bg-gray-300 transition">
                Login
              </Link>
              <Link to="/contact" className="px-6 py-3 rounded-md w-4/5 text-center bg-gray-100 hover:bg-gray-200 active:bg-gray-300 transition">
                Contact
              </Link>
              <Link to="/terms-and-conditions" className="px-6 py-3 rounded-md w-4/5 text-center bg-gray-100 hover:bg-gray-200 active:bg-gray-300 transition">
                T&C
              </Link>
              <Link to="/privacy-policy" className="px-6 py-3 rounded-md w-4/5 text-center bg-gray-100 hover:bg-gray-200 active:bg-gray-300 transition">
                Privacy Policy
              </Link>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow flex flex-col md:flex-row container mx-auto px-4 py-8 gap-8 items-center justify-center pt-20">
        
        {/* Left Side: Daily HR Quote Image */}
        <div className="w-full md:w-1/2 flex justify-center items-center p-4">
          <div className="bg-transparent max-w-md w-full">
            <div className="w-full flex items-center justify-center border-4 border-white rounded-xl shadow-2xl overflow-hidden backdrop-blur-sm min-h-[300px]">
              {quote ? (
                <img 
                  src={`${API_BASE}${quote.imageUrl}`} 
                  alt="Daily HR Quote" 
                  className="w-full h-auto block"
                />
              ) : (
                <div className="text-white/80 flex flex-col items-center">
                  <span className="text-4xl mb-2">💡</span>
                  <p>Stay inspired!</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Welcome & Login */}
        <div className="w-full md:w-1/2 flex flex-col items-center md:items-start text-center md:text-left space-y-6 p-4">
          <div>
            <h1 className="text-3xl md:text-5xl font-extrabold text-white mb-2 whitespace-nowrap">
              Welcome to <span className="text-blue-400">HRMS</span>
            </h1>
           
          </div>


        </div>
      </main>

      {/* Footer (Optional, for completeness) */}
      <footer className="bg-transparent border-t border-white/20 py-4 text-center text-white text-sm">
        &copy; {new Date().getFullYear()} Speshway Solutions. All rights reserved.
      </footer>
    </div>
  );
};

export default Home;
