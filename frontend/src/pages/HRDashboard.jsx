import { Outlet } from "react-router-dom";
import useMeta from "../utils/useMeta";
import { useMemo, Suspense, lazy, useState } from "react";

const HRSidebar = lazy(() => import("../components/dashboard/HRSidebar"));
const Navbar = lazy(() => import("../components/dashboard/Navbar"));

const HRDashboard = () => {
  const canonical = useMemo(() => `${window.location.origin}/hr-dashboard`, []);
  useMeta({
    title: "HR Dashboard — Speshway HRMS",
    description: "Manage candidates, recruitment tracker, document verification, and offer letters.",
    keywords: "HRMS HR, recruitment, candidates, onboarding",
    url: canonical,
    image: "/images/Logo.jpg",
    robots: "noindex,nofollow"
  });

  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="hr-dashboard-layout flex min-h-screen bg-slate-950 text-white font-sans">
      <Suspense fallback={<div className="md:w-64 w-0" />}>
        <HRSidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
      </Suspense>
      <div className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'md:ml-64 ml-0' : 'ml-0'} bg-slate-950 min-h-screen text-white`}>
        <Suspense fallback={<div className="h-16" />}>
          <Navbar />
        </Suspense>
        <div className="p-2 sm:p-4 md:p-6 pt-16 sm:pt-14 md:pt-16 lg:pt-16">
          <Outlet />
        </div>
      </div>
      <style>
        {`
          /* Root layout */
          .hr-dashboard-layout {
            background-color: #020617 !important; /* bg-slate-950 */
            color: #ffffff !important;
          }

          /* Background overrides */
          .hr-dashboard-layout .bg-gray-50,
          .hr-dashboard-layout .bg-slate-50,
          .hr-dashboard-layout .bg-slate-100,
          .hr-dashboard-layout .bg-slate-200 {
            background-color: #020617 !important;
          }

          /* Cards & containers using bg-white */
          .hr-dashboard-layout .bg-white {
            background-color: rgba(15, 23, 42, 0.4) !important; /* bg-slate-900/40 */
            backdrop-filter: blur(24px) !important;
            border-color: rgba(255, 255, 255, 0.1) !important;
            color: #ffffff !important;
          }

          /* Borders */
          .hr-dashboard-layout .border-slate-200,
          .hr-dashboard-layout .border-gray-200,
          .hr-dashboard-layout .border-slate-100,
          .hr-dashboard-layout .border-gray-100 {
            border-color: rgba(255, 255, 255, 0.1) !important;
          }

          /* Text colors */
          .hr-dashboard-layout .text-slate-800,
          .hr-dashboard-layout .text-gray-800,
          .hr-dashboard-layout .text-slate-900,
          .hr-dashboard-layout .text-gray-900,
          .hr-dashboard-layout .text-slate-700,
          .hr-dashboard-layout .text-gray-700 {
            color: #ffffff !important;
          }

          .hr-dashboard-layout .text-slate-500,
          .hr-dashboard-layout .text-gray-500,
          .hr-dashboard-layout .text-slate-600,
          .hr-dashboard-layout .text-gray-600 {
            color: #94a3b8 !important; /* text-slate-400 */
          }

          /* Table overrides */
          .hr-dashboard-layout table,
          .hr-dashboard-layout thead,
          .hr-dashboard-layout tbody,
          .hr-dashboard-layout tr,
          .hr-dashboard-layout th,
          .hr-dashboard-layout td {
            background-color: transparent !important;
            border-color: rgba(255, 255, 255, 0.05) !important;
            color: #ffffff !important;
          }

          .hr-dashboard-layout th {
            color: #94a3b8 !important;
          }

          /* Forms & inputs */
          .hr-dashboard-layout input,
          .hr-dashboard-layout select,
          .hr-dashboard-layout textarea {
            background-color: rgba(15, 23, 42, 0.6) !important;
            border-color: rgba(255, 255, 255, 0.1) !important;
            color: #ffffff !important;
          }

          .hr-dashboard-layout input::placeholder,
          .hr-dashboard-layout textarea::placeholder {
            color: #64748b !important;
          }

          /* FullCalendar styling */
          .hr-dashboard-layout .fc {
            color: #ffffff !important;
          }
          .hr-dashboard-layout .fc-theme-standard td,
          .hr-dashboard-layout .fc-theme-standard th,
          .hr-dashboard-layout .fc-theme-standard .fc-scrollgrid {
            border-color: rgba(255, 255, 255, 0.1) !important;
          }
          .hr-dashboard-layout .fc-col-header-cell {
            background-color: rgba(15, 23, 42, 0.4) !important;
          }
          .hr-dashboard-layout .fc-daygrid-day:hover {
            background-color: rgba(255, 255, 255, 0.02) !important;
          }
          .hr-dashboard-layout .fc-button-primary {
            background-color: #4f46e5 !important; /* indigo-600 */
            border-color: #4f46e5 !important;
          }

          /* Hover effects */
          .hr-dashboard-layout .hover\:bg-slate-50:hover,
          .hr-dashboard-layout .hover\:bg-gray-50:hover,
          .hr-dashboard-layout .hover\:bg-slate-100:hover {
            background-color: rgba(255, 255, 255, 0.05) !important;
          }

          /* Charts / SVG */
          .hr-dashboard-layout text {
            fill: #94a3b8 !important;
          }
          .hr-dashboard-layout .recharts-cartesian-grid-horizontal line,
          .hr-dashboard-layout .recharts-cartesian-grid-vertical line {
            stroke: rgba(255, 255, 255, 0.05) !important;
          }
          .hr-dashboard-layout .recharts-legend-item-text {
            color: #94a3b8 !important;
          }
        `}
      </style>
    </div>
  );
};

export default HRDashboard;
