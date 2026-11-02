/**
 * Application filtering and sorting utilities for student applications.
 */

export const normalizeStatus = (status = "applied") => {
  const normalized = String(status).toLowerCase().replace(/[\s-]+/g, "_");
  const statusMap = {
    applied: "Applied",
    pending: "Applied",
    reviewing: "Reviewing",
    under_review: "Reviewing",
    shortlisted: "Shortlisted",
    interview: "Interview",
    interviewing: "Interview",
    interview_scheduled: "Interview",
    offered: "Offered",
    offer: "Offered",
    accepted: "Offered",
    hired: "Offered",
    rejected: "Rejected",
  };
  return statusMap[normalized] || "Applied";
};

export const tabs = [
  "All",
  "Applied",
  "Reviewing",
  "Shortlisted",
  "Interview",
  "Offered",
  "Rejected",
];

export const dateAppliedOptions = [
  { value: "any", label: "Any time" },
  { value: "last_30_days", label: "Last 30 days" },
  { value: "last_90_days", label: "Last 90 days" },
  { value: "last_12_months", label: "Last 12 months" },
];

export const tabSortOptions = {
  All: [
    { value: "recently_applied", label: "Recently applied" },
    { value: "oldest_applied", label: "Oldest application first" },
    { value: "recently_updated", label: "Recently updated" },
  ],
  Applied: [
    { value: "recently_applied", label: "Recently applied" },
    { value: "oldest_applied", label: "Oldest application first" },
    { value: "recently_updated", label: "Recently updated" },
  ],
  Reviewing: [
    { value: "recently_updated", label: "Recently updated" },
    { value: "oldest_applied", label: "Oldest application first" },
  ],
  Shortlisted: [
    { value: "recently_updated", label: "Recently updated" },
    { value: "oldest_applied", label: "Oldest application first" },
  ],
  Interview: [
    { value: "upcoming_interview", label: "Upcoming interview first" },
    { value: "latest_interview", label: "Latest interview first" },
    { value: "recently_updated", label: "Recently updated" },
  ],
  Offered: [
    { value: "recently_updated", label: "Recently updated" },
  ],
  Rejected: [
    { value: "recently_updated", label: "Recently updated" },
  ],
};

const DAY_IN_MS = 24 * 60 * 60 * 1000;

export const isWithinDateAppliedRange = (
  appliedAt,
  range,
  referenceDate = new Date()
) => {
  if (!range || range === "any" || range === "all") return true;
  if (typeof appliedAt !== "number" || isNaN(appliedAt) || appliedAt <= 0) return false;

  const nowMs =
    referenceDate instanceof Date
      ? referenceDate.getTime()
      : typeof referenceDate === "number"
      ? referenceDate
      : new Date(referenceDate).getTime();

  if (isNaN(nowMs)) return true;

  if (
    range === "last_30_days" ||
    range === "past_month" ||
    range === "30_days"
  ) {
    const cutoff = nowMs - 30 * DAY_IN_MS;
    return appliedAt >= cutoff;
  }
  if (
    range === "last_90_days" ||
    range === "past_3_months" ||
    range === "90_days"
  ) {
    const cutoff = nowMs - 90 * DAY_IN_MS;
    return appliedAt >= cutoff;
  }
  if (
    range === "last_12_months" ||
    range === "past_year" ||
    range === "12_months"
  ) {
    const cutoff = nowMs - 365 * DAY_IN_MS;
    return appliedAt >= cutoff;
  }

  return true;
};

export const sortApplications = (applications, sortBy = "recently_applied") => {
  return [...applications].sort((a, b) => {
    switch (sortBy) {
      case "oldest_applied": {
        const diff = (a.appliedAt || 0) - (b.appliedAt || 0);
        if (diff !== 0) return diff;
        return String(a.id || "").localeCompare(String(b.id || ""));
      }

      case "recently_updated": {
        const diff = (b.updatedAt || 0) - (a.updatedAt || 0);
        if (diff !== 0) return diff;
        const appliedDiff = (b.appliedAt || 0) - (a.appliedAt || 0);
        if (appliedDiff !== 0) return appliedDiff;
        return String(b.id || "").localeCompare(String(a.id || ""));
      }

      case "upcoming_interview": {
        const hasA = Boolean(a.interviewDate && a.interviewTimestamp > 0);
        const hasB = Boolean(b.interviewDate && b.interviewTimestamp > 0);

        // Applications with a real scheduled interview date appear before those without one
        if (hasA && !hasB) return -1;
        if (!hasA && hasB) return 1;

        if (hasA && hasB) {
          const diff = a.interviewTimestamp - b.interviewTimestamp;
          if (diff !== 0) return diff;
        }

        // Deterministic tie-breaker
        const appliedDiff = (b.appliedAt || 0) - (a.appliedAt || 0);
        if (appliedDiff !== 0) return appliedDiff;
        return String(b.id || "").localeCompare(String(a.id || ""));
      }

      case "latest_interview": {
        const hasA = Boolean(a.interviewDate && a.interviewTimestamp > 0);
        const hasB = Boolean(b.interviewDate && b.interviewTimestamp > 0);

        // Applications with a real scheduled interview date appear before those without one
        if (hasA && !hasB) return -1;
        if (!hasA && hasB) return 1;

        if (hasA && hasB) {
          const diff = b.interviewTimestamp - a.interviewTimestamp;
          if (diff !== 0) return diff;
        }

        // Deterministic tie-breaker
        const appliedDiff = (b.appliedAt || 0) - (a.appliedAt || 0);
        if (appliedDiff !== 0) return appliedDiff;
        return String(b.id || "").localeCompare(String(a.id || ""));
      }

      case "recently_applied":
      default: {
        const diff = (b.appliedAt || 0) - (a.appliedAt || 0);
        if (diff !== 0) return diff;
        return String(b.id || "").localeCompare(String(a.id || ""));
      }
    }
  });
};

export const filterApplications = (
  applications,
  {
    activeTab = "All",
    searchQuery = "",
    dateFilter = "any",
    referenceDate,
  } = {}
) => {
  return applications.filter((app) => {
    const matchesTab = activeTab === "All" || app.status === activeTab;
    if (!matchesTab) return false;

    if (!isWithinDateAppliedRange(app.appliedAt, dateFilter, referenceDate)) {
      return false;
    }

    const query = searchQuery.trim().toLowerCase();
    if (!query) return true;

    return (
      (app.companyName || "").toLowerCase().includes(query) ||
      (app.role || "").toLowerCase().includes(query) ||
      (app.skillsMatched || []).some((skill) =>
        String(skill).toLowerCase().includes(query)
      )
    );
  });
};
