import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  shuffleInternships,
  deduplicateInternships,
  extractStudentStatusSets,
  filterCycleInternships,
  buildInternshipQueryParams,
  determineEmptyReason,
  mapInternship,
  formatStipend,
} from '../web/src/lib/internshipDeck.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─────────────────────────────────────────────────────────────
// TEST 1: Reload returns previously Interested/Accepted, Saved, and Rejected/Skipped active internships
// ─────────────────────────────────────────────────────────────

test('Test 1: Reload returns all active internships regardless of past action history', () => {
  const mockActions = [
    { internship: 'card_acc', decision: 'accepted', saved: false },
    { internship: 'card_sav', decision: null, saved: true },
    { internship: 'card_rej', decision: 'rejected', saved: false },
  ];
  const mockApplications = [
    { internship: 'card_app', status: 'applied' },
  ];

  const statusSets = extractStudentStatusSets(mockActions, mockApplications);

  const activeFromFeed = [
    { _id: 'card_acc', role: 'Accepted Role', company: 'Co A' },
    { _id: 'card_sav', role: 'Saved Role', company: 'Co B' },
    { _id: 'card_rej', role: 'Rejected/Skipped Role', company: 'Co C' },
    { _id: 'card_app', role: 'Applied Role', company: 'Co D' },
    { _id: 'card_new', role: 'Fresh Role', company: 'Co E' },
  ];

  // In a new browsing cycle, all active internships are mapped and loaded into the deck
  const mapped = activeFromFeed.map((item) => mapInternship(item, statusSets));
  const newCycleCards = filterCycleInternships(mapped, new Set());

  // Confirm that ALL active internships are included in the new browsing cycle
  assert.strictEqual(newCycleCards.length, 5, 'All 5 active internships must be loaded in the new cycle');
  const ids = newCycleCards.map((c) => c.id);
  assert.ok(ids.includes('card_acc'), 'Previously Interested/Accepted role must be included');
  assert.ok(ids.includes('card_sav'), 'Previously Saved role must be included');
  assert.ok(ids.includes('card_rej'), 'Previously Rejected/Skipped role must be included');
  assert.ok(ids.includes('card_app'), 'Previously Applied role must be included');
  assert.ok(ids.includes('card_new'), 'Fresh role must be included');
});

// ─────────────────────────────────────────────────────────────
// TEST 2: Previously saved cards show a Saved marker
// ─────────────────────────────────────────────────────────────

test('Test 2: Previously saved cards show a Saved marker (isSaved flag and badge rendering)', () => {
  const mockActions = [
    { internship: 'card_sav', saved: true, decision: null },
    { internship: 'card_not_sav', saved: false, decision: null },
  ];

  const statusSets = extractStudentStatusSets(mockActions, []);

  const cardSaved = mapInternship({ _id: 'card_sav', role: 'Saved Intern' }, statusSets);
  const cardNotSaved = mapInternship({ _id: 'card_not_sav', role: 'Regular Intern' }, statusSets);

  assert.strictEqual(cardSaved.isSaved, true, 'Saved card must have isSaved = true');
  assert.strictEqual(cardNotSaved.isSaved, false, 'Unsaved card must have isSaved = false');

  // Verify that InternshipCard component renders the Saved badge with Bookmark icon
  const cardComponentPath = path.resolve(__dirname, '../web/src/features/internships/InternshipCard.jsx');
  const cardSource = fs.readFileSync(cardComponentPath, 'utf8');

  assert.ok(cardSource.includes('isSaved'), 'InternshipCard must check isSaved');
  assert.ok(cardSource.includes('Bookmark'), 'InternshipCard must render Bookmark icon');
  assert.ok(cardSource.includes('Saved'), 'InternshipCard must display Saved text badge');
});

// ─────────────────────────────────────────────────────────────
// TEST 3: Reload and pagination together return the full set without duplicates or early empty state
// ─────────────────────────────────────────────────────────────

test('Test 3: Reload and pagination together return the full multi-page set without early empty state', () => {
  // Simulate 25 active internships across 3 pages (Page 1: 10, Page 2: 10, Page 3: 5)
  const fullDatabase = Array.from({ length: 25 }, (_, i) => ({
    _id: `intern_${i + 1}`,
    role: `Role ${i + 1}`,
    company: `Company ${i + 1}`,
  }));

  const seenInCycle = new Set();
  let deck = [];

  // 1. Reload starts at Page 1: full batch of 10 returned (not just 1 or 2)
  const page1Items = fullDatabase.slice(0, 10).map((item) => mapInternship(item));
  const page1Cards = deduplicateInternships(filterCycleInternships(page1Items, seenInCycle));
  for (const c of page1Cards) seenInCycle.add(c.id);
  deck = shuffleInternships(page1Cards);

  assert.strictEqual(deck.length, 10, 'Page 1 on reload must return a full batch of 10 cards');

  // 2. Pagination does not show empty state while more pages exist
  assert.strictEqual(
    determineEmptyReason({ totalAvailable: 25, deckCount: deck.length }),
    null,
    'Deck with cards must not show an empty state'
  );

  // 3. User swipes down to 2 cards remaining -> loadMore fetches Page 2
  const page2Items = fullDatabase.slice(10, 20).map((item) => mapInternship(item));
  const page2Cards = deduplicateInternships(filterCycleInternships(page2Items, seenInCycle), seenInCycle);
  for (const c of page2Cards) seenInCycle.add(c.id);
  deck = [...deck, ...page2Cards];

  assert.strictEqual(deck.length, 20, 'Deck now holds 20 unique cards after Page 2');

  // 4. Load Page 3 (remaining 5 cards)
  const page3Items = fullDatabase.slice(20, 25).map((item) => mapInternship(item));
  const page3Cards = deduplicateInternships(filterCycleInternships(page3Items, seenInCycle), seenInCycle);
  for (const c of page3Cards) seenInCycle.add(c.id);
  deck = [...deck, ...page3Cards];

  assert.strictEqual(deck.length, 25, 'Total deck contains all 25 cards');
  assert.strictEqual(new Set(deck.map((c) => c.id)).size, 25, 'Zero duplicates across all 3 pages');
});

// ─────────────────────────────────────────────────────────────
// TEST 4: Repeated reloads shuffle the order
// ─────────────────────────────────────────────────────────────

test('Test 4: Repeated reloads produce varying permutations while preserving unique cards', () => {
  const cards = [
    { id: '1', role: 'Role 1' },
    { id: '2', role: 'Role 2' },
    { id: '3', role: 'Role 3' },
    { id: '4', role: 'Role 4' },
    { id: '5', role: 'Role 5' },
    { id: '6', role: 'Role 6' },
  ];

  const orderSignatures = new Set();
  const iterations = 25;

  for (let i = 0; i < iterations; i++) {
    const shuffled = shuffleInternships(cards);

    // Uniqueness
    const ids = shuffled.map((c) => c.id);
    assert.strictEqual(new Set(ids).size, cards.length, 'Every card must remain unique');

    orderSignatures.add(ids.join(','));
  }

  // Across 25 reloads, there must be multiple different orderings
  assert.ok(orderSignatures.size > 1, 'Shuffling on reload must produce different orders');
});

// ─────────────────────────────────────────────────────────────
// TEST 5: Existing applications not duplicated and action history not erased
// ─────────────────────────────────────────────────────────────

test('Test 5: Existing applications are identified and action history is preserved without erasure', () => {
  const initialActions = [
    { internship: 'app_1', decision: 'accepted', saved: true },
    { internship: 'app_2', decision: 'rejected', saved: false },
  ];
  const initialApplications = [
    { internship: 'app_1', status: 'applied' },
  ];

  const statusSets = extractStudentStatusSets(initialActions, initialApplications);
  const card = mapInternship({ _id: 'app_1', role: 'Engineer' }, statusSets);

  // Card correctly recognizes that application was already submitted
  assert.strictEqual(card.isApplied, true, 'Card must have isApplied = true');
  assert.strictEqual(card.isSaved, true, 'Card must have isSaved = true');

  // Verify that student action history records are not mutated or erased
  assert.strictEqual(initialActions.length, 2);
  assert.strictEqual(initialApplications.length, 1);
  assert.strictEqual(initialActions[0].saved, true);
  assert.strictEqual(initialActions[1].decision, 'rejected');
});

// ─────────────────────────────────────────────────────────────
// TEST 6: The "View Saved" button remains removed
// ─────────────────────────────────────────────────────────────

test('Test 6: The "View Saved" button is completely removed from InternshipsPage', () => {
  const pagePath = path.resolve(__dirname, '../web/src/app/internships/page.jsx');
  const pageSource = fs.readFileSync(pagePath, 'utf8');

  // Confirm "View Saved" is not present
  assert.strictEqual(
    pageSource.includes('View Saved'),
    false,
    '"View Saved" button must remain removed from InternshipsPage'
  );

  // Confirm reload button is present
  assert.ok(pageSource.includes('id="reload-deck-btn"'), 'Reload button must be present');
  assert.ok(pageSource.includes('Reload Internships'), 'Button label must be Reload Internships');
});
