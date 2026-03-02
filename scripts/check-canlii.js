#!/usr/bin/env node
/**
 * CanLII legislation monitor.
 *
 * Reads data/canlii-state.json and checks for amendments to probate and
 * intestacy acts across all supported provinces.
 *
 * Usage:
 *   node scripts/check-canlii.js            # print acts + last-seen dates
 *   node scripts/check-canlii.js --fetch    # fetch pages, detect date changes
 *
 * When --fetch finds a change:
 *   1. Review the CanLII amendment to understand what changed
 *   2. Update the relevant province JSON file (data/provinces/*.json)
 *   3. Run: npm test && npm run generate:golden && npm test
 *   4. Commit both the data file and golden files
 */
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT      = join(__dirname, '..');
const STATE_FILE = join(ROOT, 'data', 'canlii-state.json');

const state   = JSON.parse(readFileSync(STATE_FILE, 'utf8'));
const doFetch = process.argv.includes('--fetch');

// ---------------------------------------------------------------------------
// Print-only mode (default)
// ---------------------------------------------------------------------------
if (!doFetch) {
  console.log('\n=== CanLII Legislation Monitor ===\n');
  console.log(`Last fetch: ${state.lastRun ?? 'never'}\n`);
  console.log('Acts on watch (run with --fetch to check online):\n');
  for (const entry of state.acts) {
    console.log(`  [${entry.province}] ${entry.type.toUpperCase()}  —  ${entry.act}`);
    console.log(`    Last amendment: ${entry.lastAmendment ?? 'unknown'}`);
    console.log(`    URL: ${entry.url}`);
    console.log('');
  }
  console.log('Tip: node scripts/check-canlii.js --fetch');
  process.exit(0);
}

// ---------------------------------------------------------------------------
// Fetch mode: hit each URL and look for amendment date changes
// ---------------------------------------------------------------------------
console.log('\n=== CanLII Legislation Monitor (--fetch) ===\n');

let changed = false;

for (const entry of state.acts) {
  process.stdout.write(`Checking [${entry.province}] ${entry.act} ... `);
  try {
    const res  = await fetch(entry.url, {
      headers: { 'User-Agent': 'retirement-planner/1.0 (tax-data verification)' },
      signal: AbortSignal.timeout(10_000),
    });
    const html = await res.text();

    // CanLII pages include patterns like:
    //   "Last amended: 2024-03-14"  or  "in force 2023"
    const patterns = [
      /last\s+amended[^<]*?(\d{4}-\d{2}-\d{2})/i,
      /last\s+amended[^<]*?(\d{4})/i,
      /in\s+force[^<]*?(\d{4}-\d{2}-\d{2})/i,
      /amended[^<]*?(\d{4}-\d{2}-\d{2})/i,
    ];

    let found = null;
    for (const pat of patterns) {
      const m = html.match(pat);
      if (m) { found = m[1]; break; }
    }

    if (!found) {
      console.log('⚠  could not parse amendment date');
    } else if (found !== entry.lastAmendment) {
      console.log(`CHANGED  (was: ${entry.lastAmendment ?? 'unknown'}, now: ${found})`);
      console.log(`  → Review: ${entry.url}`);
      console.log(`  → Update data/provinces/${entry.province}.json if rules changed`);
      entry.lastAmendment = found;
      changed = true;
    } else {
      console.log(`✓  no change (${found})`);
    }
  } catch (err) {
    console.log(`✗  fetch failed: ${err.message}`);
  }
}

state.lastRun = new Date().toISOString().slice(0, 10);
writeFileSync(STATE_FILE, JSON.stringify(state, null, 2) + '\n');
console.log('\nUpdated data/canlii-state.json');

if (changed) {
  console.log('\n⚠  One or more acts were amended. Review the changes above,');
  console.log('   update the relevant data/provinces/*.json if needed, then:');
  console.log('   npm test && npm run generate:golden && npm test\n');
} else {
  console.log('✓  No amendments detected.\n');
}
