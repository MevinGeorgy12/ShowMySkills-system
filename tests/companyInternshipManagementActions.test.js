import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Internship from '../api/src/models/Internship.js';
import Application from '../api/src/models/Application.js';
import InternshipAction from '../api/src/models/InternshipAction.js';
import { removeInternship } from '../api/src/controllers/internshipController.js';
import { deleteInternship } from '../api/src/services/internshipService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─────────────────────────────────────────────────────────────
// 1. Header alignment and single top-right Post Internship button
// ─────────────────────────────────────────────────────────────

test('Layout: company name header alignment respects fixed sidebar margin', () => {
  const pagePath = path.resolve(__dirname, '../web/src/app/company/internships/page.jsx');
  const pageContent = fs.readFileSync(pagePath, 'utf8');

  // Must have md:ml-[220px] on the content wrapper to clear the 220px fixed sidebar
  assert.ok(
    pageContent.includes('md:ml-[220px]'),
    'Main wrapper must include md:ml-[220px] to offset header and content past sidebar'
  );

  // Must render DashboardHeader within that correctly offset container
  const headerIdx = pageContent.indexOf('<DashboardHeader />');
  const wrapperIdx = pageContent.indexOf('md:ml-[220px]');
  assert.ok(headerIdx > wrapperIdx, 'DashboardHeader must sit inside the offset container');
});

test('Header & Navigation: duplicate Post Internship button removed, keeping shared header CTA', () => {
  const pagePath = path.resolve(__dirname, '../web/src/app/company/internships/page.jsx');
  const pageContent = fs.readFileSync(pagePath, 'utf8');

  const headerPath = path.resolve(__dirname, '../web/src/components/DashboardHeader.jsx');
  const headerContent = fs.readFileSync(headerPath, 'utf8');

  // Shared header button must exist
  assert.ok(
    headerContent.includes('id="header-post-internship-btn"'),
    'Shared header must contain the Post Internship button'
  );
  assert.ok(
    headerContent.includes('Post Internship'),
    'Shared header button must read "Post Internship"'
  );

  // Duplicate button beside the page heading in company/internships/page.jsx must be removed
  const headingBlock = pageContent.slice(
    pageContent.indexOf('Manage Internship Postings'),
    pageContent.indexOf('Quick Metrics')
  );
  assert.strictEqual(
    headingBlock.includes('Post New Internship') || headingBlock.includes('Post Internship'),
    false,
    'Duplicate Post Internship button beside page heading must be removed'
  );
});

// ─────────────────────────────────────────────────────────────
// 2. Open/Active vs Closed actions (Close, Reopen, Delete visibility)
// ─────────────────────────────────────────────────────────────

test('Action visibility: Open/Active postings show Close but hide Delete; Closed postings show Reopen and allow Delete', () => {
  const pagePath = path.resolve(__dirname, '../web/src/app/company/internships/page.jsx');
  const pageContent = fs.readFileSync(pagePath, 'utf8');

  // Check conditional action rendering structure
  assert.ok(
    pageContent.includes('{isOpen ? ('),
    'Must branch based on isOpen status'
  );

  // When isOpen is true: Close Posting button
  assert.ok(
    pageContent.includes('Close Posting</span>'),
    'Active posting must have Close Posting action'
  );

  // When isOpen is false (in else branch): Reopen Posting and Delete Posting
  assert.ok(
    pageContent.includes('Reopen Posting</span>'),
    'Closed posting must have Reopen Posting action'
  );
  assert.ok(
    pageContent.includes('title="Permanently Delete Posting"'),
    'Closed posting must allow Delete action'
  );

  // Verify Delete action is NOT rendered when isOpen is true
  // In the file, the delete button is inside the : ( <> ... </> ) false branch of isOpen
  const isOpenBlock = pageContent.slice(
    pageContent.indexOf('{isOpen ? ('),
    pageContent.indexOf('Reopen Posting</span>')
  );
  assert.strictEqual(
    isOpenBlock.includes('Permanently Delete Posting'),
    false,
    'Delete button must NOT be present in the active (isOpen = true) block'
  );
});

// ─────────────────────────────────────────────────────────────
// 3. Delete confirmation dialog warning, required checkbox, and button disabled state
// ─────────────────────────────────────────────────────────────

test('Delete Dialog: displays exact warning, required checkbox, disabled Delete button until checked, and Cancel preserves posting', () => {
  const pagePath = path.resolve(__dirname, '../web/src/app/company/internships/page.jsx');
  const pageContent = fs.readFileSync(pagePath, 'utf8');

  // Exact warning text
  const expectedWarning =
    'Deleting this post will permanently remove its details and the details of candidates who applied.';
  assert.ok(
    pageContent.includes(expectedWarning),
    `Confirmation dialog must display exact warning: "${expectedWarning}"`
  );

  // Unchecked required checkbox with clear confirmation text
  assert.ok(
    pageContent.includes('id="delete-confirm-checkbox"'),
    'Dialog must include checkbox with id "delete-confirm-checkbox"'
  );
  assert.ok(
    pageContent.includes('deleteConfirmed'),
    'Dialog must track deleteConfirmed state'
  );

  // Final delete button is disabled when not confirmed
  assert.ok(
    pageContent.includes('confirmModal.type === "delete" && !confirmModal.deleteConfirmed'),
    'Final Delete button must be disabled until checkbox is checked'
  );

  // Cancel action resets confirm modal without deleting
  assert.ok(
    pageContent.includes('id="confirm-modal-cancel-btn"'),
    'Cancel button must exist'
  );
});

// ─────────────────────────────────────────────────────────────
// 4. API restrictions: Do not delete active postings or applications via bypass
// ─────────────────────────────────────────────────────────────

test('API Security: removeInternship rejects deleting an Open/Active posting with 400', async () => {
  const originalFindById = Internship.findById;
  const validPostingId = '64f1a2b3c4d5e6f7a8b9c001';
  const ownerId = '64f1a2b3c4d5e6f7a8b9c111';

  Internship.findById = function() {
    return {
      lean: () => Promise.resolve({
        _id: validPostingId,
        postedBy: ownerId,
        status: 'active', // Open/Active posting
      })
    };
  };

  try {
    let statusCode = null;
    let jsonResponse = null;
    const res = {
      status: (code) => {
        statusCode = code;
        return res;
      },
      json: (data) => {
        jsonResponse = data;
        return res;
      }
    };

    const req = {
      params: { id: validPostingId },
      user: { id: ownerId, role: 'company' }
    };

    await removeInternship(req, res, () => {});

    assert.strictEqual(statusCode, 400, 'Must return 400 when attempting to delete an active posting');
    assert.strictEqual(jsonResponse.success, false);
    assert.match(jsonResponse.message, /Cannot delete an active internship posting/);
  } finally {
    Internship.findById = originalFindById;
  }
});

test('API Behavior: deleteInternship accurately deletes closed posting and cascades to candidate applications', async () => {
  const originalFindByIdAndDelete = Internship.findByIdAndDelete;
  const originalAppDeleteMany = Application.deleteMany;
  const originalActionDeleteMany = InternshipAction.deleteMany;

  const validPostingId = '64f1a2b3c4d5e6f7a8b9c001';
  let deletedInternshipId = null;
  let deletedAppFilter = null;
  let deletedActionFilter = null;

  Internship.findByIdAndDelete = function(id) {
    deletedInternshipId = id;
    return Promise.resolve({ _id: id });
  };

  Application.deleteMany = function(filter) {
    deletedAppFilter = filter;
    return Promise.resolve({ deletedCount: 3 });
  };

  InternshipAction.deleteMany = function(filter) {
    deletedActionFilter = filter;
    return Promise.resolve({ deletedCount: 5 });
  };

  try {
    const result = await deleteInternship(validPostingId);

    assert.strictEqual(deletedInternshipId, validPostingId, 'Internship posting must be deleted');
    assert.deepStrictEqual(deletedAppFilter, { internship: validPostingId }, 'Candidate applications must be deleted');
    assert.deepStrictEqual(deletedActionFilter, { internship: validPostingId }, 'Candidate actions must be deleted');
    assert.ok(result);
  } finally {
    Internship.findByIdAndDelete = originalFindByIdAndDelete;
    Application.deleteMany = originalAppDeleteMany;
    InternshipAction.deleteMany = originalActionDeleteMany;
  }
});
