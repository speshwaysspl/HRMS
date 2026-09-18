/// Utility helpers to generate daily greetings and motivational messages,
/// ported 1:1 from frontend/src/utils/greetingUtils.js to match the web HRMS portal.
library;

class GreetingUtils {
  GreetingUtils._();

  /// Returns "Good Morning", "Good Afternoon", or "Good Evening" based on IST (UTC+5:30)
  static String getISTGreeting() {
    final now = DateTime.now().toUtc().add(const Duration(hours: 5, minutes: 30));
    final hour = now.hour;
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  }

  /// Employee daily message that varies by designation, department, and day of year
  static String getEmployeeDailyMessage({
    String? department,
    String? employeeId,
    String? userId,
  }) {
    final dept = (department ?? 'general').toLowerCase().trim();
    final now = DateTime.now();
    final startOfYear = DateTime(now.year, 1, 1);
    final dayOfYear = now.difference(startOfYear).inDays;

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

    const Map<String, List<String>> departmentMessages = {
      'sales': [
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
      'hr': [
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
      'marketing': [
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
      'engineering': [
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
      'operations': [
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
      'finance': [
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
      'support': [
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
      'general': [
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

    final pool = departmentMessages[dept] ?? departmentMessages['general']!;
    final n = prefixes.length * pool.length;
    const a = 11;
    final seedStr = employeeId ?? userId ?? '';
    int s = 0;
    for (int i = 0; i < seedStr.length; i++) {
      s = (s * 31 + seedStr.codeUnitAt(i)) % n;
    }
    final idx = (a * dayOfYear + s) % n;
    final i1 = idx ~/ pool.length;
    final i2 = idx % pool.length;

    return '${prefixes[i1]} ${pool[i2]}';
  }
}
