/**
 * Firebase Security Rules — access-control tests (closes #392, #393)
 *
 * ## Why the rules are default-deny
 * TrueStub uses Firebase for Authentication only.  All application data
 * (ratings, reviews, listings, escrows, users) lives in Hasura/Postgres and
 * is accessed via a Firebase JWT — not via direct Firestore client reads/writes.
 *
 * `firestore.rules` and `storage.rules` therefore lock everything down with a
 * single catch-all `allow read, write: if false` rule.  This is intentional:
 * no collection path should ever be client-readable or client-writable.
 *
 * ## What we test
 * 1. The original cross-user isolation test (unauthenticated and cross-uid).
 * 2. Per-path tests for every data path the app logically owns:
 *    - users/{uid} and users/{uid}/private
 *    - ratings/{id}
 *    - reviews/{id}
 *    - listings/{id}
 *    - escrows/{id}
 *    - notifications/{id}
 *    - arbitrary nested paths
 * 3. Storage paths: user avatars, listing images, ticket images.
 *
 * A future feature that legitimately needs client-side Firestore access should:
 *   a) Add a targeted rule in firestore.rules (above the catch-all).
 *   b) Change the corresponding `assertFails` below to `assertSucceeds`.
 *   c) Add a complementary denial test proving the rule is not too permissive.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, collection, getDocs } from "firebase/firestore";
import { getBytes, ref, uploadBytes } from "firebase/storage";

let testEnvironment: RulesTestEnvironment;

beforeAll(async () => {
  testEnvironment = await initializeTestEnvironment({
    projectId: "demo-truestub-rules",
    firestore: {
      rules: readFileSync(join(__dirname, "../../firestore.rules"), "utf8"),
    },
    storage: {
      rules: readFileSync(join(__dirname, "../../storage.rules"), "utf8"),
    },
  });

  // Seed data for cross-user isolation tests (requires security rules disabled).
  await testEnvironment.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), "users/user-b/private"), { private: true });
    await uploadBytes(ref(context.storage(), "users/user-b/private.txt"), new Uint8Array([1]));
  });
});

afterAll(async () => {
  await testEnvironment.cleanup();
});

// ─── Helper to get a Firestore db for a given uid (or unauthenticated) ──────

function authedDb(uid: string) {
  return testEnvironment.authenticatedContext(uid).firestore();
}

function unauthDb() {
  return testEnvironment.unauthenticatedContext().firestore();
}

function authedStorage(uid: string) {
  return testEnvironment.authenticatedContext(uid).storage();
}

function unauthStorage() {
  return testEnvironment.unauthenticatedContext().storage();
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Original cross-user isolation
// ─────────────────────────────────────────────────────────────────────────────

describe("cross-user isolation — Firestore", () => {
  it("denies a signed-in user read access to another user's documents", async () => {
    const db = authedDb("user-a");
    await assertFails(getDoc(doc(db, "users/user-b/private")));
  });

  it("denies a signed-in user write access to another user's documents", async () => {
    const db = authedDb("user-a");
    await assertFails(setDoc(doc(db, "users/user-b/private"), { injected: true }));
  });
});

describe("cross-user isolation — Storage", () => {
  it("denies a signed-in user read access to another user's Storage objects", async () => {
    const storage = authedStorage("user-a");
    await assertFails(getBytes(ref(storage, "users/user-b/private.txt")));
  });

  it("denies a signed-in user write access to another user's Storage objects", async () => {
    const storage = authedStorage("user-a");
    await assertFails(uploadBytes(ref(storage, "users/user-b/private.txt"), new Uint8Array([2])));
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Default-deny: Firestore — every live data path is blocked
//
// These tests confirm that the default-deny rule covers all paths the app
// logically uses for data storage.  Because all data lives in Hasura/Postgres,
// every read/write from a browser client must fail.  (closes #392)
// ─────────────────────────────────────────────────────────────────────────────

describe("Firestore default-deny — unauthenticated client", () => {
  it("blocks read on users/{uid}", async () => {
    await assertFails(getDoc(doc(unauthDb(), "users/user-a")));
  });

  it("blocks write on users/{uid}", async () => {
    await assertFails(setDoc(doc(unauthDb(), "users/user-a"), { name: "Eve" }));
  });

  it("blocks read on ratings/{id}", async () => {
    await assertFails(getDoc(doc(unauthDb(), "ratings/rating-1")));
  });

  it("blocks write on ratings/{id}", async () => {
    await assertFails(setDoc(doc(unauthDb(), "ratings/rating-1"), { value: 5 }));
  });

  it("blocks read on reviews/{id}", async () => {
    await assertFails(getDoc(doc(unauthDb(), "reviews/review-1")));
  });

  it("blocks write on reviews/{id}", async () => {
    await assertFails(setDoc(doc(unauthDb(), "reviews/review-1"), { comment: "great" }));
  });

  it("blocks read on listings/{id}", async () => {
    await assertFails(getDoc(doc(unauthDb(), "listings/listing-1")));
  });

  it("blocks write on listings/{id}", async () => {
    await assertFails(setDoc(doc(unauthDb(), "listings/listing-1"), { title: "Taylor Swift" }));
  });

  it("blocks read on escrows/{id}", async () => {
    await assertFails(getDoc(doc(unauthDb(), "escrows/escrow-1")));
  });

  it("blocks write on escrows/{id}", async () => {
    await assertFails(setDoc(doc(unauthDb(), "escrows/escrow-1"), { amount: "100" }));
  });

  it("blocks read on notifications/{id}", async () => {
    await assertFails(getDoc(doc(unauthDb(), "notifications/notif-1")));
  });

  it("blocks write on notifications/{id}", async () => {
    await assertFails(setDoc(doc(unauthDb(), "notifications/notif-1"), { message: "hi" }));
  });

  it("blocks read on arbitrary nested paths", async () => {
    await assertFails(getDoc(doc(unauthDb(), "users/user-a/listings/listing-1")));
  });
});

describe("Firestore default-deny — authenticated client", () => {
  it("blocks authenticated read on users/{other-uid}", async () => {
    await assertFails(getDoc(doc(authedDb("user-a"), "users/user-b")));
  });

  it("blocks authenticated write on users/{own-uid} (no rule allows it)", async () => {
    await assertFails(setDoc(doc(authedDb("user-a"), "users/user-a"), { name: "Alice" }));
  });

  it("blocks authenticated read on ratings/{id}", async () => {
    await assertFails(getDoc(doc(authedDb("user-a"), "ratings/rating-1")));
  });

  it("blocks authenticated write on ratings/{id}", async () => {
    await assertFails(setDoc(doc(authedDb("user-a"), "ratings/rating-1"), { value: 5 }));
  });

  it("blocks authenticated read on reviews/{id}", async () => {
    await assertFails(getDoc(doc(authedDb("user-a"), "reviews/review-1")));
  });

  it("blocks authenticated write on reviews/{id}", async () => {
    await assertFails(setDoc(doc(authedDb("user-a"), "reviews/review-1"), { comment: "great" }));
  });

  it("blocks authenticated read on listings/{id}", async () => {
    await assertFails(getDoc(doc(authedDb("user-a"), "listings/listing-1")));
  });

  it("blocks authenticated write on listings/{id}", async () => {
    await assertFails(setDoc(doc(authedDb("user-a"), "listings/listing-1"), { title: "Coachella" }));
  });

  it("blocks authenticated read on escrows/{id}", async () => {
    await assertFails(getDoc(doc(authedDb("user-a"), "escrows/escrow-1")));
  });

  it("blocks authenticated write on escrows/{id}", async () => {
    await assertFails(setDoc(doc(authedDb("user-a"), "escrows/escrow-1"), { amount: "50" }));
  });

  it("blocks authenticated read on notifications/{id}", async () => {
    await assertFails(getDoc(doc(authedDb("user-a"), "notifications/notif-1")));
  });

  it("blocks authenticated write on notifications/{id}", async () => {
    await assertFails(
      setDoc(doc(authedDb("user-a"), "notifications/notif-1"), { message: "hi" })
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Default-deny: Storage — every live storage path is blocked (closes #392)
// ─────────────────────────────────────────────────────────────────────────────

describe("Storage default-deny — unauthenticated client", () => {
  it("blocks read of user avatar", async () => {
    await assertFails(getBytes(ref(unauthStorage(), "users/user-a/avatar.jpg")));
  });

  it("blocks write of user avatar", async () => {
    await assertFails(
      uploadBytes(ref(unauthStorage(), "users/user-a/avatar.jpg"), new Uint8Array([1]))
    );
  });

  it("blocks read of listing image", async () => {
    await assertFails(getBytes(ref(unauthStorage(), "listings/listing-1/cover.jpg")));
  });

  it("blocks write of listing image", async () => {
    await assertFails(
      uploadBytes(ref(unauthStorage(), "listings/listing-1/cover.jpg"), new Uint8Array([1]))
    );
  });

  it("blocks read of ticket image", async () => {
    await assertFails(getBytes(ref(unauthStorage(), "tickets/ticket-1/qr.png")));
  });

  it("blocks write of ticket image", async () => {
    await assertFails(
      uploadBytes(ref(unauthStorage(), "tickets/ticket-1/qr.png"), new Uint8Array([1]))
    );
  });
});

describe("Storage default-deny — authenticated client", () => {
  it("blocks authenticated read of own user avatar", async () => {
    await assertFails(
      getBytes(ref(authedStorage("user-a"), "users/user-a/avatar.jpg"))
    );
  });

  it("blocks authenticated write of own user avatar (no rule allows it yet)", async () => {
    await assertFails(
      uploadBytes(
        ref(authedStorage("user-a"), "users/user-a/avatar.jpg"),
        new Uint8Array([1])
      )
    );
  });

  it("blocks authenticated read of listing image", async () => {
    await assertFails(
      getBytes(ref(authedStorage("user-a"), "listings/listing-1/cover.jpg"))
    );
  });

  it("blocks authenticated write of listing image", async () => {
    await assertFails(
      uploadBytes(
        ref(authedStorage("user-a"), "listings/listing-1/cover.jpg"),
        new Uint8Array([1])
      )
    );
  });

  it("blocks authenticated read of ticket image", async () => {
    await assertFails(
      getBytes(ref(authedStorage("user-a"), "tickets/ticket-1/qr.png"))
    );
  });

  it("blocks authenticated write of ticket image", async () => {
    await assertFails(
      uploadBytes(
        ref(authedStorage("user-a"), "tickets/ticket-1/qr.png"),
        new Uint8Array([1])
      )
    );
  });
});
