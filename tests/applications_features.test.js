import assert from 'node:assert';
import { test } from 'node:test';

// ─────────────────────────────────────────────────────────────
// STU-021: Status Normalization & Filtering Logic
// ─────────────────────────────────────────────────────────────

const normalizeStatus = (status = "applied") => {
  const normalized = String(status).toLowerCase().replace(/[\s-]+/g, "_");
  const statusMap = {
    applied: "Applied",
    pending: "Applied",
    reviewing: "Reviewing",
    under_review: "Reviewing",
    shortlisted: "Shortlisted",
    interviewing: "Interviewing",
    interview_scheduled: "Interviewing",
    offered: "Offered",
    offer: "Offered",
    accepted: "Offered",
    hired: "Offered",
    rejected: "Rejected",
  };
  return statusMap[normalized] || "Applied";
};

test('STU-021: Normalize backend statuses to required UI filter labels', () => {
  // Backend application schema enum statuses:
  assert.strictEqual(normalizeStatus('applied'), 'Applied');
  assert.strictEqual(normalizeStatus('reviewing'), 'Reviewing');
  assert.strictEqual(normalizeStatus('shortlisted'), 'Shortlisted');
  assert.strictEqual(normalizeStatus('interview_scheduled'), 'Interviewing');
  assert.strictEqual(normalizeStatus('interviewing'), 'Interviewing');
  assert.strictEqual(normalizeStatus('rejected'), 'Rejected');
  assert.strictEqual(normalizeStatus('hired'), 'Offered');
  assert.strictEqual(normalizeStatus('accepted'), 'Offered');

  // Variations and edge cases:
  assert.strictEqual(normalizeStatus('under_review'), 'Reviewing');
  assert.strictEqual(normalizeStatus('pending'), 'Applied');
  assert.strictEqual(normalizeStatus('offer'), 'Offered');
  assert.strictEqual(normalizeStatus('unknown_status'), 'Applied');
  assert.strictEqual(normalizeStatus(''), 'Applied');
  assert.strictEqual(normalizeStatus(null), 'Applied');
});

test('STU-021: Filter applications by status tab and search combined', () => {
  const sampleApps = [
    { id: '1', role: 'Frontend Engineer', companyName: 'Acme Corp', status: 'Applied', skillsMatched: ['React', 'CSS'] },
    { id: '2', role: 'Backend Engineer', companyName: 'Beta Labs', status: 'Reviewing', skillsMatched: ['Node.js'] },
    { id: '3', role: 'Fullstack Dev', companyName: 'Gamma Systems', status: 'Shortlisted', skillsMatched: ['React', 'Node.js'] },
    { id: '4', role: 'ML Intern', companyName: 'DataCorp', status: 'Interviewing', skillsMatched: ['Python'] },
    { id: '5', role: 'Product Designer', companyName: 'DesignStudio', status: 'Offered', skillsMatched: ['Figma'] },
    { id: '6', role: 'DevOps Intern', companyName: 'CloudWorks', status: 'Rejected', skillsMatched: ['Docker'] },
  ];

  const filterApps = (apps, activeTab, searchQuery) => {
    return apps.filter((app) => {
      const matchesTab = activeTab === "All" || app.status === activeTab;
      const query = searchQuery.trim().toLowerCase();
      if (!query) return matchesTab;

      const matchesSearch =
        (app.companyName || "").toLowerCase().includes(query) ||
        (app.role || "").toLowerCase().includes(query) ||
        (app.skillsMatched || []).some((skill) =>
          String(skill).toLowerCase().includes(query)
        );

      return matchesTab && matchesSearch;
    });
  };

  // 'All' returns everything
  assert.strictEqual(filterApps(sampleApps, 'All', '').length, 6);

  // Status tabs return exact matches
  assert.strictEqual(filterApps(sampleApps, 'Applied', '').length, 1);
  assert.strictEqual(filterApps(sampleApps, 'Applied', '')[0].companyName, 'Acme Corp');

  assert.strictEqual(filterApps(sampleApps, 'Reviewing', '').length, 1);
  assert.strictEqual(filterApps(sampleApps, 'Reviewing', '')[0].companyName, 'Beta Labs');

  assert.strictEqual(filterApps(sampleApps, 'Shortlisted', '').length, 1);
  assert.strictEqual(filterApps(sampleApps, 'Shortlisted', '')[0].companyName, 'Gamma Systems');

  assert.strictEqual(filterApps(sampleApps, 'Interviewing', '').length, 1);
  assert.strictEqual(filterApps(sampleApps, 'Interviewing', '')[0].companyName, 'DataCorp');

  assert.strictEqual(filterApps(sampleApps, 'Offered', '').length, 1);
  assert.strictEqual(filterApps(sampleApps, 'Offered', '')[0].companyName, 'DesignStudio');

  assert.strictEqual(filterApps(sampleApps, 'Rejected', '').length, 1);
  assert.strictEqual(filterApps(sampleApps, 'Rejected', '')[0].companyName, 'CloudWorks');

  // Search by company
  assert.strictEqual(filterApps(sampleApps, 'All', 'beta').length, 1);
  assert.strictEqual(filterApps(sampleApps, 'All', 'beta')[0].id, '2');

  // Search by role
  assert.strictEqual(filterApps(sampleApps, 'All', 'engineer').length, 2);

  // Search by skill
  assert.strictEqual(filterApps(sampleApps, 'All', 'react').length, 2);

  // Combined tab + search
  assert.strictEqual(filterApps(sampleApps, 'Reviewing', 'react').length, 0); // Beta Labs has Node.js, not React
  assert.strictEqual(filterApps(sampleApps, 'Shortlisted', 'react').length, 1); // Gamma Systems matches both
});

// ─────────────────────────────────────────────────────────────
// STU-022: Sorting Logic
// ─────────────────────────────────────────────────────────────

test('STU-022: Sort applications by Newest, Oldest, Company Name A-Z, Role Name A-Z', () => {
  const sampleApps = [
    { id: '1', role: 'Zeta Engineer', companyName: 'Beta Inc', appliedAt: 1000 },
    { id: '2', role: 'Alpha Intern', companyName: 'Alpha Corp', appliedAt: 3000 },
    { id: '3', role: 'Mid Developer', companyName: 'Delta Systems', appliedAt: 2000 },
    { id: '4', role: 'No Date Role', companyName: 'Omega Co', appliedAt: 0 },
  ];

  const sortApps = (apps, sortBy) => {
    return [...apps].sort((a, b) => {
      switch (sortBy) {
        case "oldest":
          return (a.appliedAt || 0) - (b.appliedAt || 0);
        case "company_az":
          return (a.companyName || "").localeCompare(b.companyName || "");
        case "role_az":
          return (a.role || "").localeCompare(b.role || "");
        case "newest":
        default:
          return (b.appliedAt || 0) - (a.appliedAt || 0);
      }
    });
  };

  // 1. Newest First
  const newest = sortApps(sampleApps, 'newest');
  assert.strictEqual(newest[0].id, '2'); // 3000
  assert.strictEqual(newest[1].id, '3'); // 2000
  assert.strictEqual(newest[2].id, '1'); // 1000
  assert.strictEqual(newest[3].id, '4'); // 0

  // 2. Oldest First
  const oldest = sortApps(sampleApps, 'oldest');
  assert.strictEqual(oldest[0].id, '4'); // 0
  assert.strictEqual(oldest[1].id, '1'); // 1000
  assert.strictEqual(oldest[2].id, '3'); // 2000
  assert.strictEqual(oldest[3].id, '2'); // 3000

  // 3. Company Name A-Z
  const companyAZ = sortApps(sampleApps, 'company_az');
  assert.strictEqual(companyAZ[0].companyName, 'Alpha Corp');
  assert.strictEqual(companyAZ[1].companyName, 'Beta Inc');
  assert.strictEqual(companyAZ[2].companyName, 'Delta Systems');
  assert.strictEqual(companyAZ[3].companyName, 'Omega Co');

  // 4. Role Name A-Z
  const roleAZ = sortApps(sampleApps, 'role_az');
  assert.strictEqual(roleAZ[0].role, 'Alpha Intern');
  assert.strictEqual(roleAZ[1].role, 'Mid Developer');
  assert.strictEqual(roleAZ[2].role, 'No Date Role');
  assert.strictEqual(roleAZ[3].role, 'Zeta Engineer');
});

// ─────────────────────────────────────────────────────────────
// STU-023: Internship ID Extraction & Route Target
// ─────────────────────────────────────────────────────────────

const getInternshipId = (internship, fallbackId) => {
  if (!internship) return fallbackId || "";
  if (typeof internship === "string") return internship;
  return internship._id || internship.id || fallbackId || "";
};

test('STU-023: Safely extract internship ID from various API payload shapes', () => {
  // Populated object with _id
  assert.strictEqual(getInternshipId({ _id: '67bb8e7d206f4a38b9c1d010' }), '67bb8e7d206f4a38b9c1d010');

  // Populated object with id
  assert.strictEqual(getInternshipId({ id: '67bb8e7d206f4a38b9c1d010' }), '67bb8e7d206f4a38b9c1d010');

  // Unpopulated string ID
  assert.strictEqual(getInternshipId('67bb8e7d206f4a38b9c1d010'), '67bb8e7d206f4a38b9c1d010');

  // Populated as null (deleted internship) with fallback
  assert.strictEqual(getInternshipId(null, '67bb8e7d206f4a38b9c1d010'), '67bb8e7d206f4a38b9c1d010');

  // Completely missing
  assert.strictEqual(getInternshipId(null, null), '');
});

// ─────────────────────────────────────────────────────────────
// STU-024: Company Logo Initials & Fallback Helper
// ─────────────────────────────────────────────────────────────

const getCompanyInitials = (name = "") => {
  const trimmed = String(name || "").trim();
  if (!trimmed) return "C";
  const words = trimmed.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return trimmed.slice(0, 2).toUpperCase();
};

test('STU-024: Compute company initials safely for fallback avatar', () => {
  assert.strictEqual(getCompanyInitials('Google'), 'GO');
  assert.strictEqual(getCompanyInitials('Tech Nova'), 'TN');
  assert.strictEqual(getCompanyInitials('Amazon Web Services'), 'AW');
  assert.strictEqual(getCompanyInitials('IBM'), 'IB');
  assert.strictEqual(getCompanyInitials('A'), 'A');
  assert.strictEqual(getCompanyInitials(''), 'C');
  assert.strictEqual(getCompanyInitials(null), 'C');
  assert.strictEqual(getCompanyInitials(undefined), 'C');
});

