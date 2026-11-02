import assert from 'node:assert';
import { test } from 'node:test';
import {
  normalizeStatus,
  tabs,
  dateAppliedOptions,
  tabSortOptions,
  isWithinDateAppliedRange,
  sortApplications,
  filterApplications,
} from '../web/src/lib/applicationFilters.js';

// ─────────────────────────────────────────────────────────────
// STU-021: Status Normalization & Tab Filtering Logic
// ─────────────────────────────────────────────────────────────

test('STU-021: Normalize backend statuses to required UI filter labels (including Interview tab)', () => {
  // Backend application schema enum statuses:
  assert.strictEqual(normalizeStatus('applied'), 'Applied');
  assert.strictEqual(normalizeStatus('reviewing'), 'Reviewing');
  assert.strictEqual(normalizeStatus('shortlisted'), 'Shortlisted');
  assert.strictEqual(normalizeStatus('interview_scheduled'), 'Interview');
  assert.strictEqual(normalizeStatus('interviewing'), 'Interview');
  assert.strictEqual(normalizeStatus('interview'), 'Interview');
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

  // Verify status tabs include "Interview" and do not include "Interviewing"
  assert.ok(tabs.includes('Interview'));
  assert.ok(!tabs.includes('Interviewing'));
});

test('STU-021: Filter applications by status tab and search combined', () => {
  const sampleApps = [
    { id: '1', role: 'Frontend Engineer', companyName: 'Acme Corp', status: 'Applied', skillsMatched: ['React', 'CSS'], appliedAt: 1000 },
    { id: '2', role: 'Backend Engineer', companyName: 'Beta Labs', status: 'Reviewing', skillsMatched: ['Node.js'], appliedAt: 2000 },
    { id: '3', role: 'Fullstack Dev', companyName: 'Gamma Systems', status: 'Shortlisted', skillsMatched: ['React', 'Node.js'], appliedAt: 3000 },
    { id: '4', role: 'ML Intern', companyName: 'DataCorp', status: 'Interview', skillsMatched: ['Python'], appliedAt: 4000 },
    { id: '5', role: 'Product Designer', companyName: 'DesignStudio', status: 'Offered', skillsMatched: ['Figma'], appliedAt: 5000 },
    { id: '6', role: 'DevOps Intern', companyName: 'CloudWorks', status: 'Rejected', skillsMatched: ['Docker'], appliedAt: 6000 },
  ];

  // 'All' returns everything
  assert.strictEqual(filterApplications(sampleApps, { activeTab: 'All' }).length, 6);

  // Status tabs return exact matches
  assert.strictEqual(filterApplications(sampleApps, { activeTab: 'Applied' }).length, 1);
  assert.strictEqual(filterApplications(sampleApps, { activeTab: 'Applied' })[0].companyName, 'Acme Corp');

  assert.strictEqual(filterApplications(sampleApps, { activeTab: 'Reviewing' }).length, 1);
  assert.strictEqual(filterApplications(sampleApps, { activeTab: 'Reviewing' })[0].companyName, 'Beta Labs');

  assert.strictEqual(filterApplications(sampleApps, { activeTab: 'Shortlisted' }).length, 1);
  assert.strictEqual(filterApplications(sampleApps, { activeTab: 'Shortlisted' })[0].companyName, 'Gamma Systems');

  assert.strictEqual(filterApplications(sampleApps, { activeTab: 'Interview' }).length, 1);
  assert.strictEqual(filterApplications(sampleApps, { activeTab: 'Interview' })[0].companyName, 'DataCorp');

  assert.strictEqual(filterApplications(sampleApps, { activeTab: 'Offered' }).length, 1);
  assert.strictEqual(filterApplications(sampleApps, { activeTab: 'Offered' })[0].companyName, 'DesignStudio');

  assert.strictEqual(filterApplications(sampleApps, { activeTab: 'Rejected' }).length, 1);
  assert.strictEqual(filterApplications(sampleApps, { activeTab: 'Rejected' })[0].companyName, 'CloudWorks');

  // Search by company
  assert.strictEqual(filterApplications(sampleApps, { activeTab: 'All', searchQuery: 'beta' }).length, 1);
  assert.strictEqual(filterApplications(sampleApps, { activeTab: 'All', searchQuery: 'beta' })[0].id, '2');

  // Search by role
  assert.strictEqual(filterApplications(sampleApps, { activeTab: 'All', searchQuery: 'engineer' }).length, 2);

  // Search by skill
  assert.strictEqual(filterApplications(sampleApps, { activeTab: 'All', searchQuery: 'react' }).length, 2);

  // Combined tab + search
  assert.strictEqual(filterApplications(sampleApps, { activeTab: 'Reviewing', searchQuery: 'react' }).length, 0);
  assert.strictEqual(filterApplications(sampleApps, { activeTab: 'Shortlisted', searchQuery: 'react' }).length, 1);
});

// ─────────────────────────────────────────────────────────────
// STU-022: Date Applied Filter Logic
// ─────────────────────────────────────────────────────────────

test('STU-022: Date applied filter (Any time, Past month, Past 3 months, Past year)', () => {
  const refDate = new Date('2026-11-01T12:00:00Z');

  // 10 days ago (within past month, 3 months, year)
  const app10Days = new Date('2026-10-22T12:00:00Z').getTime();
  // 50 days ago (outside past month, within 3 months, year)
  const app50Days = new Date('2026-09-12T12:00:00Z').getTime();
  // 150 days ago (outside past 3 months, within year)
  const app150Days = new Date('2026-06-04T12:00:00Z').getTime();
  // 400 days ago (outside past year)
  const app400Days = new Date('2025-09-27T12:00:00Z').getTime();

  assert.strictEqual(isWithinDateAppliedRange(app10Days, 'any', refDate), true);
  assert.strictEqual(isWithinDateAppliedRange(app10Days, 'past_month', refDate), true);
  assert.strictEqual(isWithinDateAppliedRange(app10Days, 'past_3_months', refDate), true);
  assert.strictEqual(isWithinDateAppliedRange(app10Days, 'past_year', refDate), true);

  assert.strictEqual(isWithinDateAppliedRange(app50Days, 'past_month', refDate), false);
  assert.strictEqual(isWithinDateAppliedRange(app50Days, 'past_3_months', refDate), true);
  assert.strictEqual(isWithinDateAppliedRange(app50Days, 'past_year', refDate), true);

  assert.strictEqual(isWithinDateAppliedRange(app150Days, 'past_month', refDate), false);
  assert.strictEqual(isWithinDateAppliedRange(app150Days, 'past_3_months', refDate), false);
  assert.strictEqual(isWithinDateAppliedRange(app150Days, 'past_year', refDate), true);

  assert.strictEqual(isWithinDateAppliedRange(app400Days, 'past_year', refDate), false);
  assert.strictEqual(isWithinDateAppliedRange(app400Days, 'any', refDate), true);

  // Missing or 0 appliedAt
  assert.strictEqual(isWithinDateAppliedRange(0, 'past_month', refDate), false);
  assert.strictEqual(isWithinDateAppliedRange(null, 'past_month', refDate), false);
  assert.strictEqual(isWithinDateAppliedRange(0, 'any', refDate), true);

  // Verify dropdown options
  const optionValues = dateAppliedOptions.map((o) => o.value);
  assert.deepStrictEqual(optionValues, ['any', 'past_month', 'past_3_months', 'past_year']);
});

test('STU-022: Date applied filter combined with status tabs and text search', () => {
  const refDate = new Date('2026-11-01T12:00:00Z');

  const sampleApps = [
    { id: '1', role: 'Frontend Engineer', companyName: 'Acme Corp', status: 'Interview', skillsMatched: ['React'], appliedAt: new Date('2026-10-25T12:00:00Z').getTime() },
    { id: '2', role: 'Backend Engineer', companyName: 'Beta Labs', status: 'Interview', skillsMatched: ['Node.js'], appliedAt: new Date('2026-09-15T12:00:00Z').getTime() },
    { id: '3', role: 'Fullstack Dev', companyName: 'Gamma Systems', status: 'Interview', skillsMatched: ['React'], appliedAt: new Date('2026-06-01T12:00:00Z').getTime() },
    { id: '4', role: 'React Intern', companyName: 'Delta Labs', status: 'Applied', skillsMatched: ['React'], appliedAt: new Date('2026-10-28T12:00:00Z').getTime() },
  ];

  // Filter Interview tab within past month
  const interviewPastMonth = filterApplications(sampleApps, {
    activeTab: 'Interview',
    dateFilter: 'past_month',
    referenceDate: refDate,
  });
  assert.strictEqual(interviewPastMonth.length, 1);
  assert.strictEqual(interviewPastMonth[0].id, '1');

  // Filter Interview tab within past 3 months
  const interviewPast3Months = filterApplications(sampleApps, {
    activeTab: 'Interview',
    dateFilter: 'past_3_months',
    referenceDate: refDate,
  });
  assert.strictEqual(interviewPast3Months.length, 2);
  assert.deepStrictEqual(interviewPast3Months.map((a) => a.id), ['1', '2']);

  // Filter Interview tab within past 3 months + search query 'React'
  const interviewReact3Months = filterApplications(sampleApps, {
    activeTab: 'Interview',
    searchQuery: 'React',
    dateFilter: 'past_3_months',
    referenceDate: refDate,
  });
  assert.strictEqual(interviewReact3Months.length, 1);
  assert.strictEqual(interviewReact3Months[0].id, '1');
});

// ─────────────────────────────────────────────────────────────
// STU-023: Sorting Choices Per Status Tab
// ─────────────────────────────────────────────────────────────

test('STU-023: Verify sorting choices match specifications for each status tab', () => {
  // Removed sorting: Company Name A-Z and Role Name A-Z must not be in any tab
  for (const [tab, options] of Object.entries(tabSortOptions)) {
    const values = options.map((o) => o.value);
    assert.ok(!values.includes('company_az'), `Tab ${tab} should not have company_az sort`);
    assert.ok(!values.includes('role_az'), `Tab ${tab} should not have role_az sort`);
  }

  // All: Recently applied, Oldest application first, Recently updated
  assert.deepStrictEqual(
    tabSortOptions.All.map((o) => o.value),
    ['recently_applied', 'oldest_applied', 'recently_updated']
  );

  // Applied: Recently applied, Oldest application first, Recently updated
  assert.deepStrictEqual(
    tabSortOptions.Applied.map((o) => o.value),
    ['recently_applied', 'oldest_applied', 'recently_updated']
  );

  // Reviewing: Recently updated, Oldest application first
  assert.deepStrictEqual(
    tabSortOptions.Reviewing.map((o) => o.value),
    ['recently_updated', 'oldest_applied']
  );

  // Shortlisted: Recently updated, Oldest application first
  assert.deepStrictEqual(
    tabSortOptions.Shortlisted.map((o) => o.value),
    ['recently_updated', 'oldest_applied']
  );

  // Interview: Upcoming interview first, Latest interview first, Recently updated
  assert.deepStrictEqual(
    tabSortOptions.Interview.map((o) => o.value),
    ['upcoming_interview', 'latest_interview', 'recently_updated']
  );

  // Offered: Recently updated
  assert.deepStrictEqual(
    tabSortOptions.Offered.map((o) => o.value),
    ['recently_updated']
  );

  // Rejected: Recently updated
  assert.deepStrictEqual(
    tabSortOptions.Rejected.map((o) => o.value),
    ['recently_updated']
  );
});

// ─────────────────────────────────────────────────────────────
// STU-024: Sorting Logic Implementation
// ─────────────────────────────────────────────────────────────

test('STU-024: Sort by Recently applied and Oldest application first with deterministic tie-breaking', () => {
  const sampleApps = [
    { id: 'app-1', appliedAt: 2000 },
    { id: 'app-2', appliedAt: 5000 },
    { id: 'app-3', appliedAt: 2000 }, // Equal date to app-1
    { id: 'app-4', appliedAt: 1000 },
  ];

  // Recently applied (newest first)
  const recent = sortApplications(sampleApps, 'recently_applied');
  assert.strictEqual(recent[0].id, 'app-2'); // 5000
  // Equal dates (2000): sorted deterministically by ID descending
  assert.strictEqual(recent[1].id, 'app-3');
  assert.strictEqual(recent[2].id, 'app-1');
  assert.strictEqual(recent[3].id, 'app-4'); // 1000

  // Oldest application first (oldest first)
  const oldest = sortApplications(sampleApps, 'oldest_applied');
  assert.strictEqual(oldest[0].id, 'app-4'); // 1000
  // Equal dates (2000): sorted deterministically by ID ascending
  assert.strictEqual(oldest[1].id, 'app-1');
  assert.strictEqual(oldest[2].id, 'app-3');
  assert.strictEqual(oldest[3].id, 'app-2'); // 5000
});

test('STU-024: Sort by Recently updated using latest real update date', () => {
  const sampleApps = [
    { id: 'app-1', appliedAt: 1000, updatedAt: 2000 },
    { id: 'app-2', appliedAt: 3000, updatedAt: 6000 },
    { id: 'app-3', appliedAt: 2000, updatedAt: 4000 },
    { id: 'app-4', appliedAt: 1500, updatedAt: 4000 }, // Equal updatedAt to app-3, tie-broken by appliedAt
  ];

  const updated = sortApplications(sampleApps, 'recently_updated');
  assert.strictEqual(updated[0].id, 'app-2'); // 6000
  assert.strictEqual(updated[1].id, 'app-3'); // 4000 (appliedAt 2000 > 1500)
  assert.strictEqual(updated[2].id, 'app-4'); // 4000 (appliedAt 1500)
  assert.strictEqual(updated[3].id, 'app-1'); // 2000
});

test('STU-024: Sort by Upcoming interview first (scheduled before unscheduled, ascending interview date)', () => {
  const sampleApps = [
    { id: 'no-interview-1', appliedAt: 5000, interviewDate: null, interviewTimestamp: 0 },
    { id: 'interview-later', appliedAt: 2000, interviewDate: '2026-11-20', interviewTimestamp: 30000 },
    { id: 'no-interview-2', appliedAt: 4000, interviewDate: null, interviewTimestamp: 0 },
    { id: 'interview-soon', appliedAt: 1000, interviewDate: '2026-11-10', interviewTimestamp: 10000 },
    { id: 'interview-mid', appliedAt: 3000, interviewDate: '2026-11-15', interviewTimestamp: 20000 },
  ];

  const sorted = sortApplications(sampleApps, 'upcoming_interview');

  // Scheduled interviews must appear before unscheduled
  assert.strictEqual(sorted[0].id, 'interview-soon');  // 10000
  assert.strictEqual(sorted[1].id, 'interview-mid');   // 20000
  assert.strictEqual(sorted[2].id, 'interview-later'); // 30000

  // Unscheduled interviews appear after, ordered predictably
  assert.strictEqual(sorted[3].id, 'no-interview-1');  // appliedAt 5000
  assert.strictEqual(sorted[4].id, 'no-interview-2');  // appliedAt 4000
});

test('STU-024: Sort by Latest interview first (scheduled before unscheduled, descending interview date)', () => {
  const sampleApps = [
    { id: 'no-interview-1', appliedAt: 5000, interviewDate: null, interviewTimestamp: 0 },
    { id: 'interview-later', appliedAt: 2000, interviewDate: '2026-11-20', interviewTimestamp: 30000 },
    { id: 'no-interview-2', appliedAt: 4000, interviewDate: null, interviewTimestamp: 0 },
    { id: 'interview-soon', appliedAt: 1000, interviewDate: '2026-11-10', interviewTimestamp: 10000 },
    { id: 'interview-mid', appliedAt: 3000, interviewDate: '2026-11-15', interviewTimestamp: 20000 },
  ];

  const sorted = sortApplications(sampleApps, 'latest_interview');

  // Scheduled interviews must appear before unscheduled, descending
  assert.strictEqual(sorted[0].id, 'interview-later'); // 30000
  assert.strictEqual(sorted[1].id, 'interview-mid');   // 20000
  assert.strictEqual(sorted[2].id, 'interview-soon');  // 10000

  // Unscheduled interviews appear after, ordered predictably
  assert.strictEqual(sorted[3].id, 'no-interview-1');
  assert.strictEqual(sorted[4].id, 'no-interview-2');
});

// ─────────────────────────────────────────────────────────────
// STU-025: Internship ID Extraction & Company Fallback Avatar
// ─────────────────────────────────────────────────────────────

const getInternshipId = (internship, fallbackId) => {
  if (!internship) return fallbackId || "";
  if (typeof internship === "string") return internship;
  return internship._id || internship.id || fallbackId || "";
};

test('STU-025: Safely extract internship ID from various API payload shapes', () => {
  assert.strictEqual(getInternshipId({ _id: '67bb8e7d206f4a38b9c1d010' }), '67bb8e7d206f4a38b9c1d010');
  assert.strictEqual(getInternshipId({ id: '67bb8e7d206f4a38b9c1d010' }), '67bb8e7d206f4a38b9c1d010');
  assert.strictEqual(getInternshipId('67bb8e7d206f4a38b9c1d010'), '67bb8e7d206f4a38b9c1d010');
  assert.strictEqual(getInternshipId(null, '67bb8e7d206f4a38b9c1d010'), '67bb8e7d206f4a38b9c1d010');
  assert.strictEqual(getInternshipId(null, null), '');
});

const getCompanyInitials = (name = "") => {
  const trimmed = String(name || "").trim();
  if (!trimmed) return "C";
  const words = trimmed.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return trimmed.slice(0, 2).toUpperCase();
};

test('STU-025: Compute company initials safely for fallback avatar', () => {
  assert.strictEqual(getCompanyInitials('Google'), 'GO');
  assert.strictEqual(getCompanyInitials('Tech Nova'), 'TN');
  assert.strictEqual(getCompanyInitials('Amazon Web Services'), 'AW');
  assert.strictEqual(getCompanyInitials('IBM'), 'IB');
  assert.strictEqual(getCompanyInitials('A'), 'A');
  assert.strictEqual(getCompanyInitials(''), 'C');
  assert.strictEqual(getCompanyInitials(null), 'C');
  assert.strictEqual(getCompanyInitials(undefined), 'C');
});
