/**
 * Review content moderation filter (#429)
 *
 * Provides basic profanity/abuse filtering for free-text review submissions
 * before they are published on another user's public profile.
 *
 * Follows the existing moderation patterns in `lib/moderation`.
 */

/**
 * Result of running review content through the moderation filter.
 */
export type ModerationStatus = 'approved' | 'held' | 'rejected';

export interface ReviewContentFilterResult {
  /** Whether the content is safe to publish immediately. */
  approved: boolean;
  /** Moderation disposition for the content. */
  status: ModerationStatus;
  /** The normalized text that was evaluated. */
  normalizedText: string;
  /** The flagged terms that were detected (deduplicated). */
  flaggedTerms: string[];
  /** Human-readable reason suitable for surfacing to the user. */
  reason?: string;
}

/**
 * Profanity / abuse word list.
 *
 * Kept intentionally small and conservative: this is a first-line filter,
 * not a complete moderation solution. Matching is done on normalized,
 * word-boundary-delimited tokens to reduce false positives.
 */
const PROFANITY_LIST: readonly string[] = [
  'asshole',
  'bastard',
  'bitch',
  'bullshit',
  'cunt',
  'damn',
  'dick',
  'douchebag',
  'fuck',
  'fucker',
  'fucking',
  'goddamn',
  'idiot',
  'jackass',
  'moron',
  'motherfucker',
  'nigger',
  'piss',
  'prick',
  'retard',
  'shit',
  'slut',
  'stupid',
  'whore',
];

/**
 * Terms that indicate targeted abuse / harassment and should always be
 * held for human review rather than published.
 */
const ABUSE_LIST: readonly string[] = [
  'kill yourself',
  'kys',
  'you should die',
  'hate you',
  'worthless piece of',
];

const PROFANITY_SET = new Set(PROFANITY_LIST);
const ABUSE_PHRASES = ABUSE_LIST.map((phrase) => phrase.toLowerCase());

/**
 * Normalizes text for matching: lowercases, strips diacritics, and collapses
 * common leetspeak substitutions so obfuscated terms are still caught.
 */
export function normalizeReviewText(text: string): string {
  if (!text) {
    return '';
  }

  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[@]/g, 'a')
    .replace(/[3]/g, 'e')
    .replace(/[1!|]/g, 'i')
    .replace(/[0]/g, 'o')
    .replace(/[$5]/g, 's')
    .replace(/[7]/g, 't')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extracts normalized word tokens from text.
 */
function tokenize(normalizedText: string): string[] {
  if (!normalizedText) {
    return [];
  }
  return normalizedText.split(' ').filter(Boolean);
}

/**
 * Returns true if the given text contains profanity or abusive content.
 */
export function containsProfanity(text: string): boolean {
  const normalized = normalizeReviewText(text);

  if (!normalized) {
    return false;
  }

  const tokens = tokenize(normalized);

  for (const token of tokens) {
    if (PROFANITY_SET.has(token)) {
      return true;
    }
  }

  for (const phrase of ABUSE_PHRASES) {
    if (normalized.includes(phrase)) {
      return true;
    }
  }

  return false;
}

/**
 * Runs review content through the moderation filter and returns a
 * `ModerationStatus`-style result indicating whether the content should be
 * published, held for moderation, or rejected outright.
 *
 * - Abusive/harassing phrases => `rejected`
 * - Profanity => `held` (queued for human moderation)
 * - Otherwise => `approved`
 */
export function filterReviewContent(text: string): ReviewContentFilterResult {
  const normalizedText = normalizeReviewText(text);

  if (!normalizedText) {
    return {
      approved: false,
      status: 'rejected',
      normalizedText,
      flaggedTerms: [],
      reason: 'Review content cannot be empty.',
    };
  }

  const flaggedTerms: string[] = [];

  for (const phrase of ABUSE_PHRASES) {
    if (normalizedText.includes(phrase)) {
      flaggedTerms.push(phrase);
    }
  }

  if (flaggedTerms.length > 0) {
    return {
      approved: false,
      status: 'rejected',
      normalizedText,
      flaggedTerms,
      reason:
        'This review contains abusive or harassing language and cannot be submitted.',
    };
  }

  const tokens = tokenize(normalizedText);
  for (const token of tokens) {
    if (PROFANITY_SET.has(token) && !flaggedTerms.includes(token)) {
      flaggedTerms.push(token);
    }
  }

  if (flaggedTerms.length > 0) {
    return {
      approved: false,
      status: 'held',
      normalizedText,
      flaggedTerms,
      reason:
        'This review contains language that requires moderation before it can be published.',
    };
  }

  return {
    approved: true,
    status: 'approved',
    normalizedText,
    flaggedTerms: [],
  };
}

/**
 * Convenience helper: whether content should be held for moderation
 * (i.e. not published immediately).
 */
export function shouldHoldForModeration(text: string): boolean {
  return filterReviewContent(text).status !== 'approved';
}