#!/usr/bin/env node
/**
 * find-duplicate-basenames.mjs
 *
 * Task #456 — List every basename that appears more than once across the
 * frontend component tree and backend routes/services/lib trees so that each
 * collision can be triaged (intentional, needs merging, or dead code).
 *
 * Usage:
 * 
 * 
 * 
 *   node scripts/find-duplicate-basenames.mjs
 *
 * Exit code: 0 always (informational only — see #457 for the hard-failure
 * CI gate on *newly added* files).
 */

import { readdirSync, statSync } from "fs";
import { join, basename, relative } from "path";

const ROOT = new URL("..", import.meta.url).pathname.replace(/\/$/, "");

/** Directories to scan (relative to repo root). */
const SCAN_ROOTS = [
  "apps/frontend/src/components",
  "apps/frontend/src",
  "apps/backend/src/routes",
  "apps/backend/src/services",
  "apps/backend/src/lib",
  "apps/backend/src/config",
  "apps/backend/src/middleware",
];

/** File extensions to consider (ignore lock files, images, etc.). */
const INCLUDE_EXT = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".json",
  ".sql",
]);

/** Basenames that are universally expected to be duplicated and are intentional. */
const KNOWN_INTENTIONAL = new Set([
  "index.ts",
  "index.tsx",
  "index.js",
  "types.ts",
  "types.tsx",
  "README.md",
]);

/**
 * Recursively collect all files under `dir`, returning an array of absolute
 * paths.
 */
function walk(dir) {
  const results = [];
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return results;
  }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walk(full));
    } else if (entry.isFile()) {
      results.push(full);
    }
  }
  return results;
}

// Collect all files across the specified scan roots.
/** @type {Map<string, string[]>} basename → list of relative paths */
const byBasename = new Map();

for (const scanRoot of SCAN_ROOTS) {
  const absRoot = join(ROOT, scanRoot);
  for (const absPath of walk(absRoot)) {
    const base = basename(absPath);
    const ext = base.slice(base.lastIndexOf("."));
    if (!INCLUDE_EXT.has(ext)) continue;
    const rel = relative(ROOT, absPath);
    if (!byBasename.has(base)) byBasename.set(base, []);
    // Avoid listing the exact same path twice when scan roots overlap.
    if (!byBasename.get(base).includes(rel)) {
      byBasename.get(base).push(rel);
    }
  }
}

// Filter to only entries with more than one path.
const duplicates = [...byBasename.entries()]
  .filter(([, paths]) => paths.length > 1)
  .sort(([a], [b]) => a.localeCompare(b));

if (duplicates.length === 0) {
  console.log("✅  No duplicate basenames found across the scanned trees.");
  process.exit(0);
}

console.log(
  `Found ${duplicates.length} basename(s) that appear in more than one location:\n`
);

let intentionalCount = 0;
let needsTriageCount = 0;

for (const [base, paths] of duplicates) {
  const isKnown = KNOWN_INTENTIONAL.has(base);
  const tag = isKnown ? "[intentional — barrel/index pattern]" : "[NEEDS TRIAGE]";
  if (isKnown) intentionalCount++;
  else needsTriageCount++;

  console.log(`  ${base}  ${tag}`);
  for (const p of paths) console.log(`    - ${p}`);
  console.log();
}

console.log("─".repeat(70));
console.log(`  Intentional (index/barrel): ${intentionalCount}`);
console.log(`  Needs triage:               ${needsTriageCount}`);
console.log("─".repeat(70));

if (needsTriageCount > 0) {
  console.log(
    "\nSee docs/DUPLICATE_BASENAMES.md for the triage record of each collision."
  );
}
