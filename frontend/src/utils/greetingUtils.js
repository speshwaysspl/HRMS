// frontend/src/utils/greetingUtils.js
// Utility helpers to generate daily greeting messages and IST-based greetings

// Returns Good Morning/Afternoon/Evening based on IST
export const getISTGreeting = () => {
  const now = new Date();
  const ist = new Date(
    now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
  );
  const hour = ist.getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
};

// Admin daily message that rotates each day of the year
export const getAdminDailyMessage = () => {
  const quotes = [
    "Leadership is action, not position.",
    "Excellence is doing ordinary things extraordinarily well.",
    "Small improvements daily lead to big results.",
    "Focus on progress, not perfection.",
    "Teamwork makes the dream work.",
    "Quality is not an act, it is a habit.",
    "Discipline turns vision into achievement.",
    "Data drives decisions; humility drives learning.",
    "Plan, execute, iterate, improve.",
    "Consistency compounds into success.",
  ];
  const today = new Date();
  const startOfYear = new Date(today.getFullYear(), 0, 1);
  const dayOfYear = Math.floor((today - startOfYear) / (1000 * 60 * 60 * 24));
  return quotes[dayOfYear % quotes.length];
};

// Employee daily message that varies by designation and department
export const getEmployeeDailyMessage = (user, dashboardData) => {
  if (!user && !dashboardData) return "Welcome to your dashboard! 🌟";

  const designation = (
    user?.designation || dashboardData?.employee?.designation || "general"
  )
    .toLowerCase()
    .trim();
  const department = (
    user?.department || dashboardData?.employee?.department || "general"
  )
    .toLowerCase()
    .trim();

  const today = new Date();
  const startOfYear = new Date(today.getFullYear(), 0, 1);
  const dayOfYear = Math.floor((today - startOfYear) / (1000 * 60 * 60 * 24));

  const prefixes = [
    "Ready for",
    "Time for",
    "Let's achieve",
    "Today brings",
    "Focus on",
  ];

  const designationMessages = {
    "java developer": [
      "Code with passion! ☕",
      "Build robust solutions! 🏗️",
      "Java expertise shines! ⚡",
    ],
    "python developer": [
      "Pythonic solutions! 🐍",
      "Clean code, clear logic! 🚀",
      "Data science magic! 📊",
    ],
    "frontend developer": [
      "Beautiful user experiences! 🎨",
      "React to challenges! ⚛️",
      "CSS magic! 🪄",
    ],
    "backend developer": [
      "Solid foundations! 🏗️",
      "API excellence! 🌐",
      "Scalable solutions! 📈",
    ],
    "devops engineer": [
      "Automation success! 🤖",
      "CI/CD mastery! 🎯",
      "Cloud architecture! ☁️",
    ],
    "data scientist": [
      "Data insights! 📊",
      "Predictive modeling! 🔮",
      "Analytics excellence! 📈",
    ],
    "ui/ux designer": [
      "Delightful experiences! 😊",
      "Intuitive interfaces! 🎨",
      "User-centered design! 👥",
    ],
    "project manager": [
      "Team orchestration! 🎼",
      "Project success! 🚂",
      "Agile excellence! 🔄",
    ],
    "qa engineer": [
      "Quality assurance! ✅",
      "Bug hunting! 🐛",
      "Testing perfection! 🎯",
    ],
    general: ["Productive day ahead! 🚀", "Excellence in action! 🏆", "Team success! 🌟"],
  };

  const departmentMessages = {
    sales: ["Close big deals! 💼", "Lead conversions! 📈", "Build relationships! 🤝"],
    hr: ["Empower people! 👥", "Culture and care! 💙", "Smooth onboarding! 📝"],
    marketing: ["Brand growth! 📣", "Creative campaigns! 🎯", "Audience insights! 🔍"],
    engineering: ["Ship quality code! 🚢", "Solve complex problems! 🧠", "Improve performance! ⚙️"],
    operations: ["Streamline processes! 🔧", "Ensure uptime! ⏱️", "Optimize workflows! 📦"],
    finance: ["Balance the books! 💹", "Control costs! 💰", "Forecast accurately! 📊"],
    support: ["Delight customers! 😊", "Resolve tickets fast! 📨", "Empathy first! 💙"],
    general: ["Team collaboration! 🤝", "Continuous improvement! 🔁", "Deliver excellence! 🏅"],
  };

  const dMsgs = designationMessages[designation] || designationMessages.general;
  const deptMsgs = departmentMessages[department] || departmentMessages.general;

  // Alternate between designation-based and department-based messages for variety
  const useDept = dayOfYear % 2 === 0;
  const pool = useDept ? deptMsgs : dMsgs;

  return `${prefixes[dayOfYear % prefixes.length]} ${pool[dayOfYear % pool.length]}`;
};