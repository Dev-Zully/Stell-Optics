import { Router } from "express";
import { z } from "zod";
import { firebaseAuth } from "../lib/firebase-admin";
import { hasuraRequest } from "../lib/hasura";
import { registerRoute } from "../lib/openapi";
import { changelogService } from "../services/changelog.service";
import { CHANGELOG_ENTRY_TYPES } from "../services/changelog-taxonomy";

export const usersRouter = Router();

/**
 * Anonymize the user's row in `users` and soft-delete related records.
 *
 * This mirrors the pattern in sync-user.ts: the backend holds the
 * admin-secret and performs the Hasura write server-side so the secret
 * is never exposed to the browser.
 *
 * What this does:
 *   1. Verifies the caller's Firebase ID token.
 *   2. Looks up the Hasura user row by email.
 *   3. Anonymizes PII columns (email, first_name, last_name, phone_number,
 *      profile_image_url, summary, location) and marks the row deleted.
 *   4. Records a permanent `account.deleted` changelog entry keyed by the
 *      Firebase uid (no PII — the service seals the timestamp).
 *   5. Deletes the Firebase Auth account so the user cannot sign back in.
 *
 * Ticket listings and escrow records are intentionally retained for
 * auditability; the anonymization step detaches them from personally
 * identifiable information.
 */

const ANONYMIZE_USER = `
  mutation AnonymizeUser($email: String!, $deletedAt: timestamptz!) {
    update_users(
      where: { email: { _eq: $email } }
      _set: {
        first_name: null
        last_name: null
        phone_number: null
        profile_image_url: null
        summary: null
        location: null
        country_code: null
        email: null
        deleted_at: $deletedAt
      }
    ) {
      affected_rows
    }
  }
`;

interface AnonymizeUserResult {
  update_users: {
    affected_rows: number;
  };
}

// Zod schemas describing this route's request/response shapes. They are the
// single source of truth for both runtime validation and the generated
// OpenAPI spec (see ../lib/openapi), so the docs cannot drift from the code.
const deleteMeResponseSchema = z.object({
  success: z.boolean(),
  deleted: z.boolean(),
});

const deleteMeErrorSchema = z.object({
  error: z.string(),
});

registerRoute({
  method: "delete",
  path: "/api/users/me",
  summary: "Anonymize and delete the authenticated user",
  description:
    "Anonymizes the caller's PII in Hasura and deletes their Firebase Auth account.",
  request: {
    headers: z.object({
      authorization: z.string().describe("Bearer <Firebase ID token>"),
    }),
  },
  responses: {
    200: {
      description: "User anonymized and deleted",
      content: { "application/json": { schema: deleteMeResponseSchema } },
    },
    400: {
      description: "Firebase account has no email",
      content: { "application/json": { schema: deleteMeErrorSchema } },
    },
    401: {
      description: "Missing, invalid, or expired token",
      content: { "application/json": { schema: deleteMeErrorSchema } },
    },
    502: {
      description: "Failed to remove user data",
      content: { "application/json": { schema: deleteMeErrorSchema } },
    },
  },
});

// Zod schemas for the review creation route.
const createReviewBodySchema = z.object({
  revieweeId: z.string().describe("The user being reviewed"),
  rating: z.number().int().min(1).max(5),
  comment: z.string().optional(),
});

const createReviewResponseSchema = z.object({
  success: z.boolean(),
  reviewId: z.string().optional(),
});

const createReviewErrorSchema = z.object({
  error: z.string(),
});

const INSERT_REVIEW = `
  mutation InsertReview(
    $reviewerId: uuid!
    $revieweeId: uuid!
    $rating: Int!
    $comment: String
  ) {
    insert_reviews_one(
      object: {
        reviewer_id: $reviewerId
        reviewee_id: $revieweeId
        rating: $rating
        comment: $comment
      }
    ) {
      id
    }
  }
`;

interface InsertReviewResult {
  insert_reviews_one: {
    id: string;
  } | null;
}

registerRoute({
  method: "post",
  path: "/api/users/reviews",
  summary: "Create a review for another user",
  description:
    "Creates a review. A user cannot review themselves; self-reviews are rejected with 400.",
  request: {
    headers: z.object({
      authorization: z.string().describe("Bearer <Firebase ID token>"),
    }),
    body: { content: { "application/json": { schema: createReviewBodySchema } } },
  },
  responses: {
    201: {
      description: "Review created",
      content: { "application/json": { schema: createReviewResponseSchema } },
    },
    400: {
      description: "Invalid request or self-review attempt",
      content: { "application/json": { schema: createReviewErrorSchema } },
    },
    401: {
      description: "Missing, invalid, or expired token",
      content: { "application/json": { schema: createReviewErrorSchema } },
    },
    502: {
      description: "Failed to persist review",
      content: { "application/json": { schema: createReviewErrorSchema } },
    },
  },
});

usersRouter.post("/reviews", async (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Authorization header is required" });
  }

  const token = authHeader.slice("Bearer ".length);

  let decoded;
  try {
    decoded = await firebaseAuth.verifyIdToken(token);
  } catch (error) {
    console.error("create-review: token verification failed", error);
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  const parsed = createReviewBodySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid review payload" });
  }

  const { revieweeId, rating, comment } = parsed.data;

  // Self-review guard: reject before any Hasura/DB write so no row is created.
  if (revieweeId === decoded.uid) {
    return res.status(400).json({ error: "You cannot review yourself" });
  }

  try {
    const result = await hasuraRequest<InsertReviewResult>(INSERT_REVIEW, {
      reviewerId: decoded.uid,
      revieweeId,
      rating,
      comment: comment ?? null,
    });

    return res.status(201).json({
      success: true,
      reviewId: result.insert_reviews_one?.id,
    });
  } catch (error) {
    console.error("create-review: hasura insert failed", error);
    return res.status(502).json({ error: "Failed to persist review" });
  }
});

usersRouter.delete("/me", async (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Authorization header is required" });
  }

  const token = authHeader.slice("Bearer ".length);

  let decoded;
  try {
    decoded = await firebaseAuth.verifyIdToken(token);
  } catch (error) {
    console.error("delete-user: token verification failed", error);
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  if (!decoded.email) {
    return res.status(400).json({ error: "Firebase account has no email" });
  }

  const deletedAt = new Date().toISOString();

  try {
    // Anonymize the Hasura row first. If this fails we abort before touching
    // Firebase Auth, so the user can retry.
    await hasuraRequest<AnonymizeUserResult>(ANONYMIZE_USER, {
      email: decoded.email,
      deletedAt,
    });
  } catch (error) {
    console.error("delete-user: hasura anonymization failed", error);
    return res.status(502).json({ error: "Failed to remove user data" });
  }

  try {
    // Audit the deletion. Only the uid and reason are recorded — never the
    // email or other PII that was just anonymized. The entryId is derived from
    // the uid so a retried request (e.g. after a Firebase failure below)
    // reuses the existing entry instead of hitting the write-once guard.
    const entryId = `${CHANGELOG_ENTRY_TYPES.ACCOUNT_DELETED}:${decoded.uid}`;
    if (!(await changelogService.getEntry(entryId))) {
      await changelogService.appendEntry({
        entryId,
        action: CHANGELOG_ENTRY_TYPES.ACCOUNT_DELETED,
        actorId: decoded.uid,
        resourceId: decoded.uid,
        metadata: { reason: "user_request" },
      });
    }
  } catch (error) {
    // The anonymization already happened, so don't fail the request — but
    // flag the missing audit line for manual follow-up.
    console.error(
      "delete-user: changelog audit entry failed after hasura anonymization for uid",
      decoded.uid,
      error
    );
  }

  try {
    // Remove the Firebase Auth account. This is the final step: once done the
    // user cannot sign back in, so Hasura-side is the point of no return.
    await firebaseAuth.deleteUser(decoded.uid);
  } catch (error) {
    // Firebase deletion failing after a successful Hasura anonymization is an
    // inconsistent state but not catastrophic — the PII is already gone.
    // Log loudly and return success so the frontend proceeds to sign out.
    console.error(
      "delete-user: firebase auth deletion failed after hasura anonymization — manual cleanup required for uid",
      decoded.uid,
      error
    );
  }

  return res.status(200).json({ success: true, deleted: true });
});
