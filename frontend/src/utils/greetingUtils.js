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
  const focus = [
    "Lead with clarity",
    "Drive outcomes",
    "Elevate standards",
    "Empower teams",
    "Plan intentionally",
    "Execute decisively",
    "Iterate fast",
    "Simplify processes",
    "Measure impact",
    "Celebrate wins",
    "Remove blockers",
    "Invest in people",
    "Align priorities",
    "Champion quality",
    "Foster innovation",
    "Model discipline",
    "Communicate clearly",
    "Enable ownership",
    "Mentor leaders",
    "Build trust",
    "Balance speed",
    "Set direction",
    "Raise the bar",
    "Focus on value",
  ];
  const themes = [
    "across the organization.",
    "in every project.",
    "with data and empathy.",
    "from planning to delivery.",
    "through consistent habits.",
    "with crisp execution.",
    "via small daily improvements.",
    "by enabling autonomy.",
    "through strong collaboration.",
    "with clear accountability.",
    "by removing complexity.",
    "with sustainable pace.",
    "through customer focus.",
    "by nurturing craftsmanship.",
    "with measurable progress.",
    "through resilient systems.",
    "with thoughtful tradeoffs.",
    "by sharpening priorities.",
    "with intentional design.",
    "through continuous learning.",
  ];
  const today = new Date();
  const startOfYear = new Date(today.getFullYear(), 0, 1);
  const dayOfYear = Math.floor((today - startOfYear) / (1000 * 60 * 60 * 24));
  const n = focus.length * themes.length;
  const a = 13;
  const c = today.getFullYear() % n;
  const idx = (a * dayOfYear + c) % n;
  const i = Math.floor(idx / themes.length);
  const j = idx % themes.length;
  return `${focus[i]} ${themes[j]}`;
};

// Employee daily message that varies by designation and department
export const getEmployeeDailyMessage = (user, dashboardData) => {
  if (!user && !dashboardData) return "Welcome to your dashboard! 🌟";
  const department = (
    user?.department || dashboardData?.employee?.department || "general"
  )
    .toLowerCase()
    .trim();
  const today = new Date();
  const startOfYear = new Date(today.getFullYear(), 0, 1);
  const dayOfYear = Math.floor((today - startOfYear) / (1000 * 60 * 60 * 24));
  const prefixes = [
    "Focus on",
    "Drive",
    "Deliver",
    "Achieve",
    "Build",
    "Create",
    "Ship",
    "Optimize",
    "Collaborate for",
    "Strengthen",
    "Elevate",
    "Refine",
    "Advance",
    "Improve",
    "Own",
    "Progress",
    "Accelerate",
    "Enable",
    "Grow",
    "Execute",
    "Unblock",
    "Simplify",
  ];
  const departmentMessages = {
    sales: [
      "high-quality pipeline.",
      "customer relationships.",
      "conversion momentum.",
      "deal velocity.",
      "strategic outreach.",
      "renewals and upsell.",
      "account health.",
      "lead nurturing.",
      "target attainment.",
      "forecast accuracy.",
      "proposal excellence.",
      "follow-up discipline.",
      "win rate.",
      "territory planning.",
      "collateral quality.",
      "partner alignment.",
      "demo impact.",
      "qualification rigor.",
      "negotiation strength.",
      "post-sale handoff.",
    ],
    hr: [
      "candidate experience.",
      "onboarding smoothness.",
      "learning pathways.",
      "performance cycles.",
      "employee engagement.",
      "policy clarity.",
      "culture building.",
      "wellness programs.",
      "feedback loops.",
      "talent pipeline.",
      "role clarity.",
      "succession planning.",
      "benefits awareness.",
      "compliance hygiene.",
      "recognition rituals.",
      "manager coaching.",
      "retention focus.",
      "conflict resolution.",
      "diversity initiatives.",
      "policy updates.",
    ],
    marketing: [
      "brand consistency.",
      "campaign performance.",
      "audience insights.",
      "creative excellence.",
      "content cadence.",
      "SEO health.",
      "social engagement.",
      "PR alignment.",
      "event impact.",
      "lead quality.",
      "messaging clarity.",
      "channel mix.",
      "design polish.",
      "landing pages.",
      "A/B testing.",
      "email nurtures.",
      "influencer reach.",
      "community building.",
      "thought leadership.",
      "analytics rigor.",
    ],
    engineering: [
      "reliable releases.",
      "bug backlog.",
      "performance baselines.",
      "API resilience.",
      "test coverage.",
      "code reviews.",
      "security hygiene.",
      "tech debt.",
      "CI stability.",
      "feature completeness.",
      "observability.",
      "incident response.",
      "documentation.",
      "modularity.",
      "scalability.",
      "architecture alignment.",
      "runtime efficiency.",
      "deployment quality.",
      "pair programming.",
      "refactoring.",
    ],
    operations: [
      "process simplification.",
      "SLA adherence.",
      "inventory accuracy.",
      "throughput.",
      "cost controls.",
      "vendor alignment.",
      "risk mitigation.",
      "maintenance windows.",
      "audit readiness.",
      "time-to-resolution.",
      "workflow clarity.",
      "system uptime.",
      "handoff quality.",
      "capacity planning.",
      "resource scheduling.",
      "service reliability.",
      "change control.",
      "continuous improvement.",
      "playbook updates.",
      "compliance posture.",
    ],
    finance: [
      "budget accuracy.",
      "cost optimization.",
      "forecast precision.",
      "cash flow health.",
      "variance analysis.",
      "controls and audits.",
      "ROI tracking.",
      "expense discipline.",
      "profitability.",
      "pricing models.",
      "margin protection.",
      "capex planning.",
      "risk analysis.",
      "vendor terms.",
      "policy compliance.",
      "billing accuracy.",
      "interlocks.",
      "automation.",
      "reporting cadence.",
      "stakeholder updates.",
    ],
    support: [
      "first-response time.",
      "resolution quality.",
      "CSAT.",
      "self-serve content.",
      "ticket routing.",
      "handoff clarity.",
      "bug escalations.",
      "release notes.",
      "knowledge base.",
      "community replies.",
      "NPS.",
      "call deflection.",
      "queue management.",
      "active listening.",
      "post-mortems.",
      "root-cause fixes.",
      "user empathy.",
      "service consistency.",
      "feedback loops.",
      "feature requests.",
    ],
    general: [
      "team collaboration.",
      "execution excellence.",
      "continuous learning.",
      "impactful outcomes.",
      "healthy velocity.",
      "clear priorities.",
      "quality craftsmanship.",
      "customer focus.",
      "accountability.",
      "process clarity.",
      "productive rituals.",
      "ownership.",
      "bold experiments.",
      "data-driven decisions.",
      "shared context.",
      "peer support.",
      "risk awareness.",
      "effective communication.",
      "feedback culture.",
      "celebrating progress.",
    ],
  };
  const pool = departmentMessages[department] || departmentMessages.general;
  const n = prefixes.length * pool.length;
  const a = 11;
  const seedStr = String(user?.employeeId || user?._id || "");
  let s = 0;
  for (let i = 0; i < seedStr.length; i++) s = (s * 31 + seedStr.charCodeAt(i)) % n;
  const idx = (a * dayOfYear + s) % n;
  const i1 = Math.floor(idx / pool.length);
  const i2 = idx % pool.length;
  return `${prefixes[i1]} ${pool[i2]}`;
};