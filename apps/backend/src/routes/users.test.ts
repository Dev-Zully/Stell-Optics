/**
 * Tests for DELETE /api/users/me — user anonymization and cascade policy
 * (closes #394)
 *
 * Verifies that:
 *  1. The route anonymizes the users row in Hasura with the correct PII fields.
 *  2. Related records (listings, escrows, reviews) are NOT deleted — they are
 *     retained per the documented cascade policy.
 *  3. The Firebase Auth account is deleted after a successful Hasura
 *     anonymization.
 *  4. If Hasura anonymization fails, Firebase Auth is left intact (abort-
 *     before-point-of-no-return).
 *  5. If Firebase Auth deletion fails after Hasura anonymization succeeds,
 *     the route still returns 200 (PII is already gone; log-and-continue).
 *  6. Unauthenticated and malformed requests are rejected.
 */

import request from 'supertest';
import express from 'express';

// ── Module mocks (must be declared before imports) ─────────────────────────

// users.ts imports registerRoute from '../lib/openapi' for OpenAPI spec
// generation.  That module is a side-effect-only registry not needed in tests.
// virtual:true tells Jest to create a mock even though the module file doesn't
// exist on disk — it was never shipped to the backend.
jest.mock('../lib/openapi', () => ({ registerRoute: jest.fn() }), { virtual: true });

jest.mock('../lib/firebase-admin', () => ({
  firebaseAuth: {
    verifyIdToken: jest.fn(),
    deleteUser: jest.fn(),
  },
}));

jest.mock('../lib/hasura', () => ({
  hasuraRequest: jest.fn(),
}));

import { firebaseAuth } from '../lib/firebase-admin';
import { hasuraRequest } from '../lib/hasura';
import { usersRouter } from './users';

const mockedVerify = firebaseAuth.verifyIdToken as jest.Mock;
const mockedDeleteUser = firebaseAuth.deleteUser as jest.Mock;
const mockedHasura = hasuraRequest as jest.Mock;

// ── App factory ─────────────────────────────────────────────────────────────

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/users', usersRouter);
  return app;
}

const VALID_TOKEN = 'Bearer valid-token';
const DECODED = {
  uid: 'user-123',
  email: 'alice@example.com',
};

// ── Helpers ─────────────────────────────────────────────────────────────────

function stubSuccess() {
  mockedVerify.mockResolvedValue(DECODED);
  mockedHasura.mockResolvedValue({ update_users: { affected_rows: 1 } });
  mockedDeleteUser.mockResolvedValue(undefined);
}

// ─────────────────────────────────────────────────────────────────────────────
// Authentication guard
// ─────────────────────────────────────────────────────────────────────────────

describe('DELETE /api/users/me — authentication', () => {
  let app: express.Express;

  beforeEach(() => {
    jest.clearAllMocks();
    app = buildApp();
  });

  it('returns 401 when Authorization header is absent', async () => {
    const res = await request(app).delete('/api/users/me');
    expect(res.status).toBe(401);
    expect(mockedHasura).not.toHaveBeenCalled();
    expect(mockedDeleteUser).not.toHaveBeenCalled();
  });

  it('returns 401 when Authorization header is not a Bearer token', async () => {
    const res = await request(app)
      .delete('/api/users/me')
      .set('Authorization', 'Basic abc123');
    expect(res.status).toBe(401);
    expect(mockedHasura).not.toHaveBeenCalled();
  });

  it('returns 401 when the Firebase token is invalid', async () => {
    mockedVerify.mockRejectedValue(new Error('invalid token'));
    const res = await request(app)
      .delete('/api/users/me')
      .set('Authorization', VALID_TOKEN);
    expect(res.status).toBe(401);
    expect(mockedHasura).not.toHaveBeenCalled();
  });

  it('returns 400 when the Firebase account has no email', async () => {
    mockedVerify.mockResolvedValue({ uid: 'user-123', email: undefined });
    const res = await request(app)
      .delete('/api/users/me')
      .set('Authorization', VALID_TOKEN);
    expect(res.status).toBe(400);
    expect(mockedHasura).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Happy path — anonymization + cascade policy
// ─────────────────────────────────────────────────────────────────────────────

describe('DELETE /api/users/me — happy path (cascade policy, closes #394)', () => {
  let app: express.Express;

  beforeEach(() => {
    jest.clearAllMocks();
    app = buildApp();
  });

  it('returns 200 with { success: true, deleted: true } on success', async () => {
    stubSuccess();
    const res = await request(app)
      .delete('/api/users/me')
      .set('Authorization', VALID_TOKEN);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, deleted: true });
  });

  it('calls the AnonymizeUser mutation with the correct PII fields nulled out', async () => {
    stubSuccess();
    await request(app)
      .delete('/api/users/me')
      .set('Authorization', VALID_TOKEN);

    expect(mockedHasura).toHaveBeenCalledTimes(1);
    const [mutation, variables] = mockedHasura.mock.calls[0];

    // Verify the mutation targets the correct user.
    expect(variables).toMatchObject({ email: DECODED.email });
    expect(variables.deletedAt).toBeDefined();

    // The mutation string must null out every PII field and set deleted_at.
    // We assert on the presence of the mutation variable names rather than
    // the raw SQL string so the test is not fragile against formatting.
    expect(mutation).toContain('first_name');
    expect(mutation).toContain('last_name');
    expect(mutation).toContain('phone_number');
    expect(mutation).toContain('profile_image_url');
    expect(mutation).toContain('summary');
    expect(mutation).toContain('location');
    expect(mutation).toContain('country_code');
    expect(mutation).toContain('email');
    expect(mutation).toContain('deleted_at');
  });

  it('does NOT issue any mutation that deletes listings or escrows (they are retained)', async () => {
    stubSuccess();
    await request(app)
      .delete('/api/users/me')
      .set('Authorization', VALID_TOKEN);

    // Only one Hasura call (the AnonymizeUser mutation) — no separate
    // delete-listings or delete-escrows mutation must exist.
    expect(mockedHasura).toHaveBeenCalledTimes(1);
    const [mutation] = mockedHasura.mock.calls[0];

    // If these collection names ever appear in a DELETE mutation, a future
    // developer has violated the retention policy — this test catches that.
    expect(mutation).not.toMatch(/delete_ticket_listings/);
    expect(mutation).not.toMatch(/delete_ticket_escrow_transactions/);
    expect(mutation).not.toMatch(/delete_reviews/);
    expect(mutation).not.toMatch(/delete_ratings/);
  });

  it('deletes the Firebase Auth account AFTER the Hasura anonymization', async () => {
    const callOrder: string[] = [];
    mockedVerify.mockResolvedValue(DECODED);
    mockedHasura.mockImplementation(async () => {
      callOrder.push('hasura');
      return { update_users: { affected_rows: 1 } };
    });
    mockedDeleteUser.mockImplementation(async () => {
      callOrder.push('firebase');
    });

    await request(app)
      .delete('/api/users/me')
      .set('Authorization', VALID_TOKEN);

    expect(callOrder).toEqual(['hasura', 'firebase']);
    expect(mockedDeleteUser).toHaveBeenCalledWith(DECODED.uid);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Error handling — abort-before-point-of-no-return
// ─────────────────────────────────────────────────────────────────────────────

describe('DELETE /api/users/me — error handling', () => {
  let app: express.Express;

  beforeEach(() => {
    jest.clearAllMocks();
    app = buildApp();
  });

  it('returns 502 and does NOT delete Firebase Auth when Hasura anonymization fails', async () => {
    mockedVerify.mockResolvedValue(DECODED);
    mockedHasura.mockRejectedValue(new Error('Hasura is down'));

    const res = await request(app)
      .delete('/api/users/me')
      .set('Authorization', VALID_TOKEN);

    expect(res.status).toBe(502);
    // Firebase Auth must NOT be touched — the user can retry the delete.
    expect(mockedDeleteUser).not.toHaveBeenCalled();
  });

  it('returns 200 even when Firebase Auth deletion fails after Hasura success', async () => {
    // The PII is already gone from Hasura; we log and continue rather than
    // surfacing a 5xx that would confuse the frontend.
    mockedVerify.mockResolvedValue(DECODED);
    mockedHasura.mockResolvedValue({ update_users: { affected_rows: 1 } });
    mockedDeleteUser.mockRejectedValue(new Error('Firebase unavailable'));

    const res = await request(app)
      .delete('/api/users/me')
      .set('Authorization', VALID_TOKEN);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, deleted: true });
  });
});
