// Shared site-level metadata values.

export const SITE_NAME = "Stell-Optics";

export const SITE_DESCRIPTION =
  "Turn XLM into mobile data with Stellar-powered payments and transparent delivery tracking.";

export const SITE_URL = new URL(
  process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000"),
);

// Brand colours used by the browser theme and PWA manifest.
export const BRAND_THEME_COLOR = "#163e34";
export const BRAND_BACKGROUND_COLOR = "#f6f9f5";
