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
  { value: "past_month", label: "Past month" },
  { value: "past_3_months", label: "Past 3 months" },
  { value: "past_year", label: "Past year" },
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

export const isWithinDateAppliedRange = (
  appliedAt,
  range,
  referenceDate = new Date()
) => {
  if (!range || range === "any" || range === "all") return true;
  if (!appliedAt || appliedAt <= 0) return false;

  const now =
    referenceDate instanceof Date ? referenceDate : new Date(referenceDate);
  const cutoff = new Date(now.getTime());

  if (range === "past_month") {
    cutoff.setMonth(cutoff.getMonth() - 1);
    return appliedAt >= cutoff.getTime();
  }
  if (range === "past_3_months") {
    cutoff.setMonth(cutoff.getMonth() - 3);
    return appliedAt >= cutoff.getTime();
  }
  if (range === "past_year") {
    cutoff.setFullYear(cutoff.getFullYear() - 1);
    return appliedAt >= cutoff.getTime();
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
