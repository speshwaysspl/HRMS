const manualHolidays = [
  // 2025
  { title: "New Year's Day", date: "2025-01-01", type: "holiday", description: "First day of the year" },
  { title: "Republic Day", date: "2025-01-26", type: "holiday", description: "National Holiday" },
  { title: "Maha Shivaratri", date: "2025-02-26", type: "holiday", description: "Hindu festival" },
  { title: "Holi", date: "2025-03-14", type: "holiday", description: "Festival of Colors" },
  { title: "Eid al-Fitr", date: "2025-03-31", type: "holiday", description: "End of Ramadan (Tentative)" },
  { title: "Good Friday", date: "2025-04-18", type: "holiday", description: "Christian Holiday" },
  { title: "Labor Day", date: "2025-05-01", type: "holiday", description: "International Workers' Day" },
  { title: "Bakrid / Eid al-Adha", date: "2025-06-07", type: "holiday", description: "Festival of Sacrifice (Tentative)" },
  { title: "Independence Day", date: "2025-08-15", type: "holiday", description: "National Holiday" },
  { title: "Ganesh Chaturthi", date: "2025-08-27", type: "holiday", description: "Hindu festival" },
  { title: "Gandhi Jayanti", date: "2025-10-02", type: "holiday", description: "Birthday of Mahatma Gandhi" },
  { title: "Dussehra", date: "2025-10-02", type: "holiday", description: "Vijayadashami" },
  { title: "Diwali", date: "2025-10-20", type: "holiday", description: "Festival of Lights" },
  { title: "Christmas", date: "2025-12-25", type: "holiday", description: "Christian Holiday" },

  // 2026 — Government of India gazetted (central) holidays, plus Sankranti
  // and Ganesh Chaturthi (state holidays in Telangana / Andhra Pradesh).
  // Dates of lunar festivals follow the official 2026 list; Id/Muharram/
  // Milad-un-Nabi can shift by a day with the moon sighting.
  { title: "New Year's Day", date: "2026-01-01", type: "holiday", description: "First day of the year" },
  { title: "Makar Sankranti / Pongal", date: "2026-01-14", type: "holiday", description: "Harvest festival (state holiday)" },
  { title: "Republic Day", date: "2026-01-26", type: "holiday", description: "National Holiday" },
  { title: "Holi", date: "2026-03-04", type: "holiday", description: "Festival of Colors" },
  { title: "Id-ul-Fitr", date: "2026-03-21", type: "holiday", description: "End of Ramadan (subject to moon sighting)" },
  { title: "Ram Navami", date: "2026-03-26", type: "holiday", description: "Birth of Lord Rama" },
  { title: "Mahavir Jayanti", date: "2026-03-31", type: "holiday", description: "Birth of Lord Mahavira" },
  { title: "Good Friday", date: "2026-04-03", type: "holiday", description: "Christian Holiday" },
  { title: "Buddha Purnima", date: "2026-05-01", type: "holiday", description: "Birth of Gautama Buddha" },
  { title: "Labor Day", date: "2026-05-01", type: "holiday", description: "International Workers' Day" },
  { title: "Id-ul-Zuha (Bakrid)", date: "2026-05-27", type: "holiday", description: "Festival of Sacrifice (subject to moon sighting)" },
  { title: "Muharram", date: "2026-06-26", type: "holiday", description: "Islamic New Year (subject to moon sighting)" },
  { title: "Independence Day", date: "2026-08-15", type: "holiday", description: "National Holiday" },
  { title: "Milad-un-Nabi", date: "2026-08-26", type: "holiday", description: "Birth of Prophet Muhammad (subject to moon sighting)" },
  { title: "Janmashtami", date: "2026-09-04", type: "holiday", description: "Birth of Lord Krishna" },
  { title: "Ganesh Chaturthi", date: "2026-09-14", type: "holiday", description: "Hindu festival (state holiday)" },
  { title: "Gandhi Jayanti", date: "2026-10-02", type: "holiday", description: "Birthday of Mahatma Gandhi" },
  { title: "Dussehra", date: "2026-10-20", type: "holiday", description: "Vijayadashami" },
  { title: "Diwali", date: "2026-11-08", type: "holiday", description: "Festival of Lights" },
  { title: "Guru Nanak Jayanti", date: "2026-11-24", type: "holiday", description: "Birth of Guru Nanak Dev" },
  { title: "Christmas", date: "2026-12-25", type: "holiday", description: "Christian Holiday" }
];

const fixedHolidaysConfig = [
  { title: "New Year's Day", month: 1, day: 1, description: "First day of the year" },
  { title: "Republic Day", month: 1, day: 26, description: "National Holiday" },
  { title: "Labor Day", month: 5, day: 1, description: "International Workers' Day" },
  { title: "Independence Day", month: 8, day: 15, description: "National Holiday" },
  { title: "Gandhi Jayanti", month: 10, day: 2, description: "Birthday of Mahatma Gandhi" },
  { title: "Christmas", month: 12, day: 25, description: "Christian Holiday" }
];

const generateFutureHolidays = (startYear, endYear) => {
  const generated = [];
  for (let year = startYear; year <= endYear; year++) {
    fixedHolidaysConfig.forEach(h => {
      // Create date string in YYYY-MM-DD format
      const date = `${year}-${String(h.month).padStart(2, '0')}-${String(h.day).padStart(2, '0')}`;
      generated.push({
        title: h.title,
        date: date,
        type: "holiday",
        description: h.description
      });
    });
  }
  return generated;
};

export const holidays = [
  ...manualHolidays,
  ...generateFutureHolidays(2027, 2050)
];
