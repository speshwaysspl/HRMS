// src/components/announcement/AnnouncementList.jsx
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import DataTable from "react-data-table-component";
import { fetchAnnouncements } from "../../utils/AnnouncementHelper";
import AnnouncementButtons from "../../utils/AnnouncementButtons";
import { motion } from "framer-motion";
import { formatISTDate } from "../../utils/dateTimeUtils";

const columns = [
  { name: "S.No", selector: (row) => row.sno, width: "80px" },
  { name: "Title", selector: (row) => row.title, sortable: true },
  { name: "Date", selector: (row) => row.date, sortable: true, width: "150px" },
  {
    name: "Image",
    cell: (row) =>
      row.imageUrl ? (
        <motion.img
          src={row.imageUrl}
          alt={row.title}
          width={40}
          style={{ borderRadius: 6 }}
          whileHover={{ scale: 1.3, rotate: 2 }}
          transition={{ type: "spring", stiffness: 200 }}
        />
      ) : (
        "No Image"
      ),
    width: "120px",
  },
  {
    name: "Action",
    cell: (row) => <AnnouncementButtons Id={row._id} />,
    width: "180px",
  },
];

const AnnouncementList = () => {
  const [rawAnnouncements, setRawAnnouncements] = useState([]);
  const [formatted, setFormatted] = useState([]);
  const [loading, setLoading] = useState(false);

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
      className="p-3 sm:p-6 bg-gradient-to-br from-blue-50 to-indigo-100 min-h-screen"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <motion.h3
        className="text-xl sm:text-2xl md:text-3xl font-bold text-center mb-4 sm:mb-6 md:mb-8 text-gray-800 px-2"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        📢 Announcements Management
      </motion.h3>

      {/* Search + Add */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center my-4 sm:my-6 gap-3 sm:gap-4">
        <motion.input
          type="text"
          placeholder="🔍 Search By Title"
          className="px-3 sm:px-4 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all w-full sm:w-1/3 text-sm sm:text-base"
          onChange={handleFilter}
          whileFocus={{ scale: 1.03 }}
        />
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Link
            to="/admin-dashboard/announcements/add"
            className="px-4 sm:px-5 py-2 bg-gradient-to-r from-teal-600 to-blue-600 rounded-lg text-white shadow-md hover:shadow-lg font-medium text-sm sm:text-base whitespace-nowrap"
          >
            + Add New
          </Link>
        </motion.div>
      </div>

      {/* Mobile Card View */}
      <div className="block md:hidden">
        {formatted.map((announcement, index) => (
          <motion.div
            key={announcement._id}
            className="bg-white rounded-lg shadow-md p-4 mb-4 border border-gray-200"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-2">
                <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2 py-1 rounded">
                  #{announcement.sno}
                </span>
                <span className="text-xs text-gray-500">{announcement.date}</span>
              </div>
              <div className="flex gap-2">
                <AnnouncementButtons Id={announcement._id} />
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                {announcement.imageUrl ? (
                  <motion.img
                    src={announcement.imageUrl}
                    alt={announcement.title}
                    className="w-12 h-12 rounded object-cover"
                    whileHover={{ scale: 1.1 }}
                  />
                ) : (
                  <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center text-xs text-gray-500">
                    No Image
                  </div>
                )}
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900 text-sm mb-1">{announcement.title}</h4>
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
                backgroundColor: "#f8fafc",
                fontWeight: "bold",
                fontSize: "12px",
                color: "#374151",
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
