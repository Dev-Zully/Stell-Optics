import { auth } from "@/lib/firebase";

/**
 * Best-effort client for the backend saved-search (#187) and watchlist (#189)
 * endpoints. Local zustand stores stay the source of truth for the UI; these
 * calls register the alert with the backend so notifications can be delivered.
 * Failures are swallowed so the UI keeps working offline.
 *
 * Identity comes from the signed-in Firebase user's ID token, sent as a Bearer
 * token; the backend derives the user from that token, never from the body (#382).
 */

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";

async function send(method: string, path: string, body?: unknown): Promise<void> {
  try {
    const token = await auth.currentUser?.getIdToken();
    if (!token) return; // Signed out — nothing to register against.
    await fetch(`${BACKEND_URL}${path}`, {
      method,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    // Backend unreachable — the alert stays local until the next sync.
  }
}

export const registerSavedSearch = (search: {
  eventName: string;
  maxPrice?: number;
  section?: string;
}) => send("POST", "/api/saved-searches", search);

export const registerWatch = (listing: { listingId: string; eventName: string; price: number }) =>
  send("POST", "/api/watchlist", listing);

export const unregisterWatch = (listingId: string) =>
  send("DELETE", `/api/watchlist/${encodeURIComponent(listingId)}`);

export const notifyListingCreated = (listing: {
  id: string;
  eventName: string;
  price: number;
  status?: string;
}) => send("POST", "/api/listings", listing);
