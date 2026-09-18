// src/components/announcement/AnnouncementList.jsx
import React, { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import DataTable from "react-data-table-component";
import { fetchAnnouncements } from "../../utils/AnnouncementHelper";
import AnnouncementButtons from "../../utils/AnnouncementButtons";
import { motion } from "framer-motion";
import { formatISTDate } from "../../utils/dateTimeUtils";
import useMeta from "../../utils/useMeta";

const columns = [
  { name: "S.No", selector: (row) => row.sno, width: "65px" },
  {
    name: "Type",
    cell: (row) => {
      const catMap = {
        quote: { label: "Today's Quote", emoji: "✨", bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" },
        festival: { label: "Festival", emoji: "🎉", bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
        event: { label: "Event", emoji: "📅", bg: "bg-cyan-50", text: "text-cyan-700", border: "border-cyan-200" },
        achievement: { label: "Achievement", emoji: "🏆", bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
        general: { label: "Notice", emoji: "📌", bg: "bg-slate-50", text: "text-slate-700", border: "border-slate-200" },
        important: { label: "Important", emoji: "📢", bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200" },
      };
      const info = catMap[row.category] || catMap.important;
      return (
        <span className={`px-2 py-0.5 text-xs font-semibold rounded-full border ${info.bg} ${info.text} ${info.border} inline-flex items-center gap-1 whitespace-nowrap`}>
          <span>{info.emoji}</span>
          <span>{info.label}</span>
        </span>
      );
    },
    width: "145px",
  },
  { name: "Title", selector: (row) => row.title, sortable: true },
  {
    name: "Audience",
    cell: (row) => {
      let label = "All Employees";
      if (row.scope === 'team_leads') label = "Team Leads";
      else if (row.scope === 'team_members') label = "Team Members";
      else if (row.scope === 'team') label = `Team: ${row.targetTeam?.name || 'Team'}`;
      else if (row.scope === 'specific') label = "Specific";
      return (
        <span className="px-2.5 py-1 bg-surface-muted text-ink-muted text-xs font-medium rounded-full border border-surface-subtle whitespace-nowrap">
          {label}
        </span>
      );
    },
    width: "140px",
  },
  { name: "Date", selector: (row) => row.date, sortable: true, width: "130px" },
  {
    name: "Image",
    cell: (row) =>
      row.imageUrl ? (
        <img
          src={row.imageUrl}
          alt={row.title}
          width={40}
          style={{ borderRadius: 6 }}
        />
      ) : (
        "No Image"
      ),
    width: "110px",
  },
  {
    name: "Action",
    cell: (row) => <div className="w-full"><AnnouncementButtons Id={row._id} /></div>,
    width: "200px",
  },
];

const AnnouncementList = () => {
  const [rawAnnouncements, setRawAnnouncements] = useState([]);
  const [formatted, setFormatted] = useState([]);
  const [loading, setLoading] = useState(false);

  const canonical = useMemo(() => `${window.location.origin}/admin-dashboard/announcements`, []);
  useMeta({
    title: "Announcements — Speshway HRMS",
    description: "Browse and manage company announcements.",
    keywords: "announcements, HRMS",
    url: canonical,
    image: "/images/Logo.jpg",
  });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const data = await fetchAnnouncements();
      setRawAnnouncements(data);
      setFormatted(formatData(data));
      setLoading(false);
    };
    fetchData();
  }, []);

  const formatData = (data) => {
    let sno = 1;
    return data.map((ann) => ({
      ...ann,
      sno: sno++,
      date: formatISTDate(new Date(ann.createdAt)),
    }));
  };

  const handleFilter = (e) => {
    const keyword = e.target.value.toLowerCase();
    const filtered = rawAnnouncements.filter((ann) =>
      ann.title.toLowerCase().includes(keyword)
    );
    setFormatted(formatData(filtered));
  };

  return (
    <motion.div
      className="p-3 sm:p-6 bg-surface-muted min-h-screen"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <motion.h3
        className="text-xl sm:text-2xl md:text-3xl font-semibold text-center mb-4 sm:mb-6 md:mb-8 text-brand-800 px-2"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        Announcements Management
      </motion.h3>

      {/* Search + Add */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center my-4 sm:my-6 gap-3 sm:gap-4">
        <motion.input
          type="text"
          placeholder="Search by title"
          className="px-3 sm:px-4 py-2 border border-surface-subtle rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 transition-colors w-full sm:w-1/3 text-sm sm:text-base text-ink"
          onChange={handleFilter}
        />
        <Link
          to="/admin-dashboard/announcements/add"
          className="px-4 sm:px-5 py-2 bg-accent-600 hover:bg-accent-700 rounded-lg text-white font-medium text-sm sm:text-base whitespace-nowrap text-center transition-colors"
        >
          + Add New
        </Link>
      </div>

      {/* Mobile Card View */}
      <div className="block md:hidden">
        {formatted.map((announcement, index) => (
          <motion.div
            key={announcement._id}
            className="bg-white rounded-xl shadow-card p-4 mb-4 border border-surface-subtle"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-2">
                <span className="bg-brand-100 text-brand-700 text-xs font-semibold px-2 py-1 rounded-full">
                  #{announcement.sno}
                </span>
                {(() => {
                  const catMap = {
                    quote: { label: "Quote", emoji: "✨", cls: "bg-purple-50 text-purple-700 border-purple-200" },
                    festival: { label: "Festival", emoji: "🎉", cls: "bg-amber-50 text-amber-700 border-amber-200" },
                    event: { label: "Event", emoji: "📅", cls: "bg-cyan-50 text-cyan-700 border-cyan-200" },
                    achievement: { label: "Win", emoji: "🏆", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
                    general: { label: "Notice", emoji: "📌", cls: "bg-slate-50 text-slate-700 border-slate-200" },
                    important: { label: "Important", emoji: "📢", cls: "bg-rose-50 text-rose-700 border-rose-200" },
                  };
                  const info = catMap[announcement.category] || catMap.important;
                  return (
                    <span className={`px-2 py-0.5 text-xs font-semibold rounded-full border ${info.cls} inline-flex items-center gap-1`}>
                      <span>{info.emoji}</span>
                      <span>{info.label}</span>
                    </span>
                  );
                })()}
                <span className="bg-surface-muted text-ink-muted text-xs font-medium px-2 py-0.5 rounded-full border border-surface-subtle">
                  {announcement.scope === 'team_leads' ? 'Team Leads' : announcement.scope === 'team_members' ? 'Team Members' : announcement.scope === 'team' ? `Team: ${announcement.targetTeam?.name || 'Team'}` : announcement.scope === 'specific' ? 'Specific' : 'All'}
                </span>
                <span className="text-xs text-ink-muted">{announcement.date}</span>
              </div>
              <div className="flex gap-2">
                <AnnouncementButtons Id={announcement._id} />
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                {announcement.imageUrl ? (
                  <img
                    src={announcement.imageUrl}
                    alt={announcement.title}
                    className="w-12 h-12 rounded object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 bg-surface-muted rounded flex items-center justify-center text-xs text-ink-faint">
                    No Image
                  </div>
                )}
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-ink text-sm mb-1">{announcement.title}</h4>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Desktop Table View */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="hidden md:block overflow-x-auto"
      >
        <DataTable
          columns={columns}
          data={formatted}
          pagination
          highlightOnHover
          striped
          responsive
          customStyles={{
            headCells: {
              style: {
                backgroundColor: "#f6f7fb",
                fontWeight: "600",
                fontSize: "12px",
                color: "#1c2333",
                padding: "8px",
                '@media (min-width: 640px)': {
                  fontSize: "14px",
                  padding: "12px",
                },
              },
            },
            cells: {
              style: {
                fontSize: "11px",
                padding: "8px",
                '@media (min-width: 640px)': {
                  fontSize: "13px",
                  padding: "12px",
                },
              },
            },
          }}
        />
      </motion.div>
    </motion.div>
  );
};

export default AnnouncementList;
