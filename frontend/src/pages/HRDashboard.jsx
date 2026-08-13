import { Outlet } from "react-router-dom";
import useMeta from "../utils/useMeta";
import { useMemo, useState, Suspense } from "react";
import Breadcrumbs from "../components/common/Breadcrumbs";
import HRSidebar from "../components/dashboard/HRSidebar";
import Navbar from "../components/dashboard/Navbar";
import LoadingState from "../components/common/LoadingState";

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

  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="hr-dashboard-layout flex min-h-screen bg-surface-muted text-ink">
      <HRSidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
      <div className={`flex-1 min-w-0 bg-surface-muted min-h-screen text-ink transition-all duration-200 ${sidebarOpen ? "md:ml-64" : "md:ml-0"}`}>
        <Navbar onMenuClick={() => setSidebarOpen((o) => !o)} />
        <div className="p-2 sm:p-4 md:p-6 max-w-[1800px] mx-auto w-full">
          <Breadcrumbs />
          <Suspense fallback={<LoadingState message="Loading…" />}>
            <Outlet />
          </Suspense>
        </div>
      </div>
    </div>
  );
};

export default HRDashboard;
