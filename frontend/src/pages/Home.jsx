import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { API_BASE } from "../utils/apiConfig";
import useMeta from "../utils/useMeta";
import { io } from "socket.io-client";

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
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

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

    // Connect to backend Socket.IO server to get real-time quote updates
    const socket = io(API_BASE, {
      transports: ["websocket", "polling"],
    });

    socket.on("connect", () => {
      console.log("🔗 Connected to Socket.IO for daily quote real-time sync");
    });

    socket.on("daily-quote-updated", () => {
      console.log("📣 Daily quote change detected via socket, auto-updating...");
      fetchQuote();
    });

    // Fallback: poll every 30 seconds to automatically update scheduled quote banners
    const intervalId = setInterval(() => {
      fetchQuote();
    }, 30000);

    return () => {
      socket.disconnect();
      clearInterval(intervalId);
    };
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
             <img src="/images/Logo.jpg" alt="Logo" width="48" height="48" className="h-12 w-auto mr-3 rounded" />
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
              className="fixed inset-0 z-50 md:hidden flex flex-col items-center justify-center gap-6 text-white text-lg font-semibold"
              style={{
                backgroundImage: "linear-gradient(rgba(2,6,23,0.6), rgba(2,6,23,0.6)), url('/images/download.jpeg')",
                backgroundSize: "cover",
                backgroundPosition: "center",
                backdropFilter: "blur(16px)",
                animation: "mobileMenuSlideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1)"
              }}
              onClick={() => setMenuOpen(false)}
            >
              <style>
                {`
                  @keyframes mobileMenuSlideIn {
                    0% { opacity: 0; transform: scale(0.95) translateY(-10px); }
                    100% { opacity: 1; transform: scale(1) translateY(0); }
                  }
                `}
              </style>

              <Link 
                to="/login" 
                className="px-8 py-4 rounded-xl w-4/5 text-center bg-blue-600 hover:bg-blue-500 active:bg-blue-700 shadow-lg shadow-blue-900/50 transition-all duration-300 transform hover:scale-105 border border-blue-500/30"
              >
                Login
              </Link>
              <Link 
                to="/contact" 
                className="px-8 py-4 rounded-xl w-4/5 text-center bg-white/10 hover:bg-white/20 active:bg-white/5 border border-white/10 backdrop-blur-md transition-all duration-300 transform hover:scale-105"
              >
                Contact
              </Link>
              <Link 
                to="/terms-and-conditions" 
                className="px-8 py-4 rounded-xl w-4/5 text-center bg-white/10 hover:bg-white/20 active:bg-white/5 border border-white/10 backdrop-blur-md transition-all duration-300 transform hover:scale-105"
              >
                T&C
              </Link>
              <Link 
                to="/privacy-policy" 
                className="px-8 py-4 rounded-xl w-4/5 text-center bg-white/10 hover:bg-white/20 active:bg-white/5 border border-white/10 backdrop-blur-md transition-all duration-300 transform hover:scale-105"
              >
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
              {quote && !imageError ? (
                <img 
                  src={`${API_BASE}${quote.imageUrl}`} 
                  alt="Daily HR Quote" 
                  className="w-full h-auto block"
                  onError={() => setImageError(true)}
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
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-8 shadow-xl flex flex-col items-center md:items-start space-y-6 max-w-md mx-auto text-center md:text-left">
  <h1 className="text-3xl md:text-5xl font-extrabold text-white mb-2 whitespace-nowrap">
    Welcome to <span className="text-blue-400">HRMS</span>
  </h1>
  <p className="text-white/80 max-w-full text-lg">
    Your all‑in‑one HR solution – manage attendance, payroll, leaves, and more.
  </p>
      <Link to="/login" className="px-8 py-4 rounded-xl mx-auto bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold shadow-lg transition-all duration-300 transform hover:scale-105">
    Log In
  </Link>
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
