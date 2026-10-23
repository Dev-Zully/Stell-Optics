#!/usr/bin/env node
/**
 * check-basename-collisions.mjs
 *
 * Task #457 CI gate — checks whether any of the files being added in the
 * current PR already have a basename collision with an existing file in the
 * same top-level directory tree (apps/frontend, apps/backend, scripts, …).
 *
 * Usage (in CI, after `git fetch origin main`):
 *
 *   node scripts/check-basename-collisions.mjs [--base <ref>]
 *
 *   --base <ref>   The base ref to diff against (default: origin/main).
 *
 * Exit codes:
 *   0  No collisions among newly-added files.
 *   1  One or more newly-added files collide with an existing basename.
 *      The caller (the workflow) decides whether to fail the build or only
 *      post a warning comment.
 *
 * Environment variables (all optional):
 *   GITHUB_OUTPUT   Path to the GitHub Actions output file.
 *                   When set, the script writes:
 *                     collision_count=<n>
 *                     collision_report=<multiline markdown>
 *
 * 
 * 
 * Intentionally excluded from the collision check:
 *   - Next.js reserved names: page.tsx, layout.tsx, route.ts, loading.tsx,
 *     error.tsx, not-found.tsx, template.tsx, default.tsx, opengraph-image.*,
 *     twitter-image.*, icon.*, apple-icon.*
 *   - Barrel / type files: index.ts, index.tsx, index.js, types.ts, types.tsx
 *   - README.md, .gitkeep, and other pure-doc files
 */

import { execSync } from "child_process";
import { readdirSync, existsSync, appendFileSync } from "fs";
import { join, basename, relative, dirname } from "path";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const ROOT = new URL("..", import.meta.url).pathname.replace(/\/$/, "");

const SKIP_BASENAMES = new Set([
  // Next.js App Router reserved filenames
  "page.tsx",
  "page.ts",
  "page.jsx",
  "page.js",
  "layout.tsx",
  "layout.ts",
  "layout.jsx",
  "layout.js",
  "route.ts",
  "route.js",
  "loading.tsx",
  "loading.ts",
  "error.tsx",
  "error.ts",
  "not-found.tsx",
  "not-found.ts",
  "template.tsx",
  "template.ts",
  "default.tsx",
  "default.ts",
  // Barrel / shared-type conventions
  "index.ts",
  "index.tsx",
  "index.js",
  "index.jsx",
  "types.ts",
  "types.tsx",
  // Documentation / config boilerplate
  "README.md",
  ".gitkeep",
  ".gitignore",
]);

const SKIP_BASENAMES_REGEX = /^(opengraph-image|twitter-image|icon|apple-icon)\./;

// File extensions we care about (skip images, lock files, etc.)
const INCLUDE_EXT = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".json",
  ".sql",
  ".css",
  ".scss",
]);

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
const baseIdx = args.indexOf("--base");
const BASE_REF = baseIdx !== -1 ? args[baseIdx + 1] : "origin/main";

// ---------------------------------------------------------------------------
// Step 1: Get list of newly ADDED files in this PR
// ---------------------------------------------------------------------------

let addedFiles;
try {
  const raw = execSync(
    `git diff --name-only --diff-filter=A ${BASE_REF}...HEAD`,
    { cwd: ROOT, encoding: "utf-8" }
  );
  addedFiles = raw
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
} catch (err) {
  console.error(
    `[basename-collision] Failed to get git diff against ${BASE_REF}:\n${err.message}`
  );
  process.exit(0); // Don't block CI if git diff fails (e.g., shallow clone)
}

if (addedFiles.length === 0) {
  console.log("[basename-collision] No newly added files in this diff.");
  process.exit(0);
}

// Filter to files we care about.
const candidateAdded = addedFiles.filter((f) => {
  const base = basename(f);
  const ext = base.slice(base.lastIndexOf("."));
  return (
    INCLUDE_EXT.has(ext) &&
    !SKIP_BASENAMES.has(base) &&
    !SKIP_BASENAMES_REGEX.test(base)
  );
});

if (candidateAdded.length === 0) {
  console.log(
    "[basename-collision] No candidate files after filtering reserved names."
  );
  process.exit(0);
}

// ---------------------------------------------------------------------------
// Step 2: Build an index of ALL existing basenames in the repo
// (excluding the files being added themselves)
// ---------------------------------------------------------------------------

/**
 * Recursively walk `dir` and collect { basename → [relPath, …] }.
 * @param {string} dir  absolute path
 * @param {Map<string, string[]>} map
 */
function walkInto(dir, map) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    // Skip common non-source trees
    if (
      [
        "node_modules",
        ".git",
        ".next",
        "dist",
        "build",
        "out",
        ".cache",
        "target",
        "coverage",
      ].includes(entry.name)
    )
      continue;

    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      walkInto(full, map);
    } else if (entry.isFile()) {
      const base = entry.name;
      const ext = base.slice(base.lastIndexOf("."));
      if (!INCLUDE_EXT.has(ext)) continue;
      if (SKIP_BASENAMES.has(base)) continue;
      if (SKIP_BASENAMES_REGEX.test(base)) continue;
      const rel = relative(ROOT, full);
      if (!map.has(base)) map.set(base, []);
      map.get(base).push(rel);
    }
  }
}

const existingByBasename = new Map();
walkInto(ROOT, existingByBasename);

// Remove the newly-added files themselves from the index so we only flag
// collisions against *pre-existing* files.
const addedSet = new Set(addedFiles.map((f) => f.replace(/^\//, "")));
for (const [base, paths] of existingByBasename) {
  const filtered = paths.filter((p) => !addedSet.has(p));
  if (filtered.length === 0) existingByBasename.delete(base);
  else existingByBasename.set(base, filtered);
}

// ---------------------------------------------------------------------------
// Step 3: Cross-reference
// ---------------------------------------------------------------------------

const collisions = [];

for (const addedRel of candidateAdded) {
  const base = basename(addedRel);
  const existing = existingByBasename.get(base);
  if (existing && existing.length > 0) {
    collisions.push({ added: addedRel, existing });
  }
}

// ---------------------------------------------------------------------------
// Step 4: Report
// ---------------------------------------------------------------------------

if (collisions.length === 0) {
  console.log(
    "[basename-collision] ✅  No newly-added file has a basename collision."
  );
  writeGithubOutput(0, "");
  process.exit(0);
}

let report =
  `## ⚠️ Basename collision detected\n\n` +
  `${collisions.length} newly-added file(s) share a basename with existing file(s) ` +
  `in the repository. This might be intentional (e.g. a second implementation of the ` +
  `same concept), but please confirm before merging.\n\n` +
  `| New file | Existing file(s) with same name |\n` +
  `|---|---|\n`;

for (const { added, existing } of collisions) {
  report += `| \`${added}\` | ${existing.map((p) => `\`${p}\``).join("<br>")}} |\n`;
}

report +=
  `\n> To suppress a collision, add the basename to the \`SKIP_BASENAMES\` set ` +
  `in \`scripts/check-basename-collisions.mjs\` with a comment explaining why.\n`;

console.log(report);

writeGithubOutput(collisions.length, report);

// Non-zero exit so the workflow can decide whether to fail or only warn.
process.exit(1);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function writeGithubOutput(count, markdownReport) {
  const outputFile = process.env.GITHUB_OUTPUT;
  if (!outputFile) return;
  // Encode newlines for multiline GitHub Actions output
  const encoded = markdownReport.replace(/\n/g, "%0A").replace(/\r/g, "%0D");
  appendFileSync(outputFile, `collision_count=${count}\n`);
  appendFileSync(outputFile, `collision_report=${encoded}\n`);
}
