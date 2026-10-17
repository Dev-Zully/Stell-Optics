/**
 * Task #458 — i18n Spanish locale key coverage
 *
 * Confirms that the Spanish (`es`) locale has exactly the same key set as the
 * English (`en`) locale for every translation namespace.  The test fails if:
 *
 *   • A key present in English is missing in Spanish (silent English fallback
 *     risk in production).
 *   • A key is present in Spanish but not in English (orphan key that can never
 *     be reached via the default language).
 *
 * The comparison is recursive — it descends into nested objects so that a
 * missing leaf key at any depth is caught individually rather than only
 * reporting the top-level namespace mismatch.
 */

import resources from "./resources";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Recursively collect all dot-notation key paths for the leaves of an object.
 *
 * @param {Record<string, unknown>} obj
 * @param {string} prefix
 * @returns {string[]}
 */
function collectLeafKeys(obj: Record<string, unknown>, prefix = ""): string[] {
  const keys: string[] = [];
  for (const [k, v] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (v !== null && typeof v === "object" && !Array.isArray(v)) {
      keys.push(...collectLeafKeys(v as Record<string, unknown>, path));
    } else {
      keys.push(path);
    }
  }
  return keys;
}

// ---------------------------------------------------------------------------
// Test
// ---------------------------------------------------------------------------

describe("i18n locale key coverage", () => {
  const enTranslations = resources.en.translations as Record<string, unknown>;
  const esTranslations = resources.es.translations as Record<string, unknown>;

  const enKeys = new Set(collectLeafKeys(enTranslations));
  const esKeys = new Set(collectLeafKeys(esTranslations));

  it("Spanish locale has no keys missing that English has (no silent fallbacks)", () => {
    const missingInEs = [...enKeys].filter((k) => !esKeys.has(k));

    if (missingInEs.length > 0) {
      // Print every missing key to make it easy to fix.
      console.error(
        `Spanish locale is missing ${missingInEs.length} key(s) present in English:\n` +
          missingInEs.map((k) => `  - ${k}`).join("\n")
      );
    }

    expect(missingInEs).toHaveLength(0);
  });

  it("Spanish locale has no extra keys absent from English (no orphan keys)", () => {
    const orphansInEs = [...esKeys].filter((k) => !enKeys.has(k));

    if (orphansInEs.length > 0) {
      console.error(
        `Spanish locale has ${orphansInEs.length} key(s) not present in English:\n` +
          orphansInEs.map((k) => `  - ${k}`).join("\n")
      );
    }

    expect(orphansInEs).toHaveLength(0);
  });

  it("both locales cover the same total number of leaf keys", () => {
    // Belt-and-suspenders count check — catches structural asymmetry even if
    // the individual set-diff tests somehow both pass.
    expect(esKeys.size).toBe(enKeys.size);
  });
});
