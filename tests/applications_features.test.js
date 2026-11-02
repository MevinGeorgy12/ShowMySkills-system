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
// STU-022: Date Applied Filter Logic (Rolling Periods)
// ─────────────────────────────────────────────────────────────

test('STU-022: Date applied filter options and rolling duration calculations', () => {
  const refDate = new Date('2026-11-01T12:00:00Z');
  const DAY_MS = 24 * 60 * 60 * 1000;

  // 10 days ago (within 30 days, 90 days, 12 months)
  const app10Days = refDate.getTime() - 10 * DAY_MS;
  // 50 days ago (outside 30 days, within 90 days, 12 months)
  const app50Days = refDate.getTime() - 50 * DAY_MS;
  // 150 days ago (outside 90 days, within 12 months)
  const app150Days = refDate.getTime() - 150 * DAY_MS;
  // 400 days ago (outside 12 months)
  const app400Days = refDate.getTime() - 400 * DAY_MS;

  assert.strictEqual(isWithinDateAppliedRange(app10Days, 'any', refDate), true);
  assert.strictEqual(isWithinDateAppliedRange(app10Days, 'last_30_days', refDate), true);
  assert.strictEqual(isWithinDateAppliedRange(app10Days, 'last_90_days', refDate), true);
  assert.strictEqual(isWithinDateAppliedRange(app10Days, 'last_12_months', refDate), true);

  assert.strictEqual(isWithinDateAppliedRange(app50Days, 'last_30_days', refDate), false);
  assert.strictEqual(isWithinDateAppliedRange(app50Days, 'last_90_days', refDate), true);
  assert.strictEqual(isWithinDateAppliedRange(app50Days, 'last_12_months', refDate), true);

  assert.strictEqual(isWithinDateAppliedRange(app150Days, 'last_30_days', refDate), false);
  assert.strictEqual(isWithinDateAppliedRange(app150Days, 'last_90_days', refDate), false);
  assert.strictEqual(isWithinDateAppliedRange(app150Days, 'last_12_months', refDate), true);

  assert.strictEqual(isWithinDateAppliedRange(app400Days, 'last_12_months', refDate), false);
  assert.strictEqual(isWithinDateAppliedRange(app400Days, 'any', refDate), true);

  // Missing or invalid appliedAt
  assert.strictEqual(isWithinDateAppliedRange(0, 'last_30_days', refDate), false);
  assert.strictEqual(isWithinDateAppliedRange(null, 'last_30_days', refDate), false);
  assert.strictEqual(isWithinDateAppliedRange(undefined, 'last_30_days', refDate), false);
  assert.strictEqual(isWithinDateAppliedRange('not-a-date', 'last_30_days', refDate), false);
  assert.strictEqual(isWithinDateAppliedRange(0, 'any', refDate), true);

  // Verify dropdown options have exact required labels and values
  assert.deepStrictEqual(dateAppliedOptions, [
    { value: 'any', label: 'Any time' },
    { value: 'last_30_days', label: 'Last 30 days' },
    { value: 'last_90_days', label: 'Last 90 days' },
    { value: 'last_12_months', label: 'Last 12 months' },
  ]);
});

test('STU-022: Date ranges strictly filter by student appliedAt (not updatedAt, interviewDate, or postingDate)', () => {
  const refDate = new Date('2026-04-15T12:00:00Z');
  const DAY_MS = 24 * 60 * 60 * 1000;

  // Application submitted in February (60 days ago), but updated yesterday and has interview tomorrow
  const appSubmittedInFeb = {
    id: 'app-feb',
    role: 'Fullstack Intern',
    companyName: 'Acme Corp',
    status: 'Interview',
    appliedAt: refDate.getTime() - 60 * DAY_MS, // ~Feb 14
    updatedAt: refDate.getTime() - 1 * DAY_MS,  // ~Apr 14 (yesterday)
    interviewDate: new Date(refDate.getTime() + 2 * DAY_MS).toISOString(),
    interviewTimestamp: refDate.getTime() + 2 * DAY_MS,
  };

  // Application submitted in April (5 days ago)
  const appSubmittedInApr = {
    id: 'app-apr',
    role: 'Frontend Intern',
    companyName: 'Beta Labs',
    status: 'Shortlisted',
    appliedAt: refDate.getTime() - 5 * DAY_MS,
    updatedAt: refDate.getTime() - 5 * DAY_MS,
  };

  const apps = [appSubmittedInFeb, appSubmittedInApr];

  // Under "Last 30 days", the Feb application MUST be excluded even though it has recent status update & interview date
  const last30 = filterApplications(apps, {
    activeTab: 'All',
    dateFilter: 'last_30_days',
    referenceDate: refDate,
  });
  assert.strictEqual(last30.length, 1);
  assert.strictEqual(last30[0].id, 'app-apr');

  // Under "Last 90 days", both are included
  const last90 = filterApplications(apps, {
    activeTab: 'All',
    dateFilter: 'last_90_days',
    referenceDate: refDate,
  });
  assert.strictEqual(last90.length, 2);

  // Under "Any time", older applications are never removed just because they advanced to another stage
  const anyTime = filterApplications(apps, {
    activeTab: 'All',
    dateFilter: 'any',
    referenceDate: refDate,
  });
  assert.strictEqual(anyTime.length, 2);
});

test('STU-022: February application excluded from Last 30 days in April across Shortlisted and Interview tabs', () => {
  // Reference date: April 20, 2026
  const refDate = new Date('2026-04-20T12:00:00Z');

  const apps = [
    {
      id: 'shortlisted-feb',
      role: 'Backend Dev',
      companyName: 'CloudWorks',
      status: 'Shortlisted',
      appliedAt: new Date('2026-02-10T10:00:00Z').getTime(), // February (69 days ago)
      updatedAt: new Date('2026-04-18T10:00:00Z').getTime(), // Advanced recently
    },
    {
      id: 'shortlisted-apr',
      role: 'Backend Dev',
      companyName: 'DataCorp',
      status: 'Shortlisted',
      appliedAt: new Date('2026-04-05T10:00:00Z').getTime(), // April (15 days ago)
      updatedAt: new Date('2026-04-10T10:00:00Z').getTime(),
    },
    {
      id: 'interview-feb',
      role: 'ML Engineer',
      companyName: 'AI Labs',
      status: 'Interview',
      appliedAt: new Date('2026-02-15T10:00:00Z').getTime(), // February (64 days ago)
      updatedAt: new Date('2026-04-19T10:00:00Z').getTime(), // Scheduled recently
      interviewDate: '2026-04-25T10:00:00Z',
      interviewTimestamp: new Date('2026-04-25T10:00:00Z').getTime(),
    },
    {
      id: 'interview-apr',
      role: 'ML Engineer',
      companyName: 'Neural Works',
      status: 'Interview',
      appliedAt: new Date('2026-04-10T10:00:00Z').getTime(), // April (10 days ago)
      updatedAt: new Date('2026-04-12T10:00:00Z').getTime(),
      interviewDate: '2026-04-22T10:00:00Z',
      interviewTimestamp: new Date('2026-04-22T10:00:00Z').getTime(),
    },
  ];

  // 1. Shortlisted tab + Last 30 days: only shortlisted-apr appears
  const shortlisted30 = filterApplications(apps, {
    activeTab: 'Shortlisted',
    dateFilter: 'last_30_days',
    referenceDate: refDate,
  });
  assert.strictEqual(shortlisted30.length, 1);
  assert.strictEqual(shortlisted30[0].id, 'shortlisted-apr');

  // 2. Shortlisted tab + Any time: both appear
  const shortlistedAny = filterApplications(apps, {
    activeTab: 'Shortlisted',
    dateFilter: 'any',
    referenceDate: refDate,
  });
  assert.strictEqual(shortlistedAny.length, 2);

  // 3. Interview tab + Last 30 days: only interview-apr appears
  const interview30 = filterApplications(apps, {
    activeTab: 'Interview',
    dateFilter: 'last_30_days',
    referenceDate: refDate,
  });
  assert.strictEqual(interview30.length, 1);
  assert.strictEqual(interview30[0].id, 'interview-apr');

  // 4. Interview tab + Any time: both appear
  const interviewAny = filterApplications(apps, {
    activeTab: 'Interview',
    dateFilter: 'any',
    referenceDate: refDate,
  });
  assert.strictEqual(interviewAny.length, 2);
});

test('STU-022: Date filter combines with search and sorting correctly', () => {
  const refDate = new Date('2026-11-01T12:00:00Z');
  const DAY_MS = 24 * 60 * 60 * 1000;

  const apps = [
    {
      id: '1',
      role: 'Lead React Developer',
      companyName: 'Acme Corp',
      status: 'Interview',
      appliedAt: refDate.getTime() - 5 * DAY_MS,
      interviewDate: '2026-11-10T10:00:00Z',
      interviewTimestamp: refDate.getTime() + 9 * DAY_MS,
    },
    {
      id: '2',
      role: 'Junior React Developer',
      companyName: 'Beta Labs',
      status: 'Interview',
      appliedAt: refDate.getTime() - 20 * DAY_MS,
      interviewDate: '2026-11-05T10:00:00Z',
      interviewTimestamp: refDate.getTime() + 4 * DAY_MS,
    },
    {
      id: '3',
      role: 'React Native Engineer',
      companyName: 'Gamma Corp',
      status: 'Interview',
      appliedAt: refDate.getTime() - 50 * DAY_MS, // > 30 days ago
      interviewDate: '2026-11-03T10:00:00Z',
      interviewTimestamp: refDate.getTime() + 2 * DAY_MS,
    },
  ];

  // Filter: Interview tab, last_30_days, search "react", sorted by "upcoming_interview"
  const filtered = filterApplications(apps, {
    activeTab: 'Interview',
    dateFilter: 'last_30_days',
    searchQuery: 'react',
    referenceDate: refDate,
  });
  const sorted = sortApplications(filtered, 'upcoming_interview');

  // Gamma Corp is excluded because appliedAt was 50 days ago
  assert.strictEqual(sorted.length, 2);
  // Beta Labs has sooner interview (Nov 5) than Acme Corp (Nov 10)
  assert.strictEqual(sorted[0].id, '2');
  assert.strictEqual(sorted[1].id, '1');
});

test('STU-022: Boundary dates are handled consistently (inclusive cutoff)', () => {
  const refDate = new Date('2026-11-01T12:00:00.000Z');
  const DAY_MS = 24 * 60 * 60 * 1000;
  const cutoff30 = refDate.getTime() - 30 * DAY_MS;

  // Exactly at the 30-day cutoff boundary -> INCLUDED
  assert.strictEqual(isWithinDateAppliedRange(cutoff30, 'last_30_days', refDate), true);

  // 1 millisecond after cutoff (newer) -> INCLUDED
  assert.strictEqual(isWithinDateAppliedRange(cutoff30 + 1, 'last_30_days', refDate), true);

  // 1 millisecond before cutoff (older) -> EXCLUDED
  assert.strictEqual(isWithinDateAppliedRange(cutoff30 - 1, 'last_30_days', refDate), false);

  // 90-day cutoff boundary
  const cutoff90 = refDate.getTime() - 90 * DAY_MS;
  assert.strictEqual(isWithinDateAppliedRange(cutoff90, 'last_90_days', refDate), true);
  assert.strictEqual(isWithinDateAppliedRange(cutoff90 + 1, 'last_90_days', refDate), true);
  assert.strictEqual(isWithinDateAppliedRange(cutoff90 - 1, 'last_90_days', refDate), false);

  // 12-month (365 days) cutoff boundary
  const cutoff365 = refDate.getTime() - 365 * DAY_MS;
  assert.strictEqual(isWithinDateAppliedRange(cutoff365, 'last_12_months', refDate), true);
  assert.strictEqual(isWithinDateAppliedRange(cutoff365 + 1, 'last_12_months', refDate), true);
  assert.strictEqual(isWithinDateAppliedRange(cutoff365 - 1, 'last_12_months', refDate), false);
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
