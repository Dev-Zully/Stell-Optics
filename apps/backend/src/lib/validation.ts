/**
 * Shared Zod validation primitives (#444).
 *
 * Common schemas reused across routes so validation rules stay consistent
 * (e.g. every Stellar address is validated with the same regex, every
 * monetary amount with the same finite-number rules). Import from here
 * instead of re-declaring ad-hoc schemas in each route file.
 */
import { z } from "zod";

/** Stellar public address (starts with G, 56 alphanumeric chars). */
export const stellarAddressSchema = z
  .string()
  .regex(/^[GC][A-Z2-7]{55}$/, "must be a valid Stellar address (starts with G or C)");

/** Stellar secret seed (starts with S, 56 alphanumeric chars). */
export const stellarSecretSchema = z
  .string()
  .regex(/^S[A-Z2-7]{55}$/, "must be a valid Stellar secret key (starts with S)");

/** Monetary amount as string or number, must be a finite non-negative value. */
export const amountSchema = z
  .union([z.string(), z.number()])
  .refine(
    (val) => {
      const n = typeof val === "string" ? Number(val) : val;
      return Number.isFinite(n) && n >= 0;
    },
    { message: "must be a non-negative number" },
  );

/** Positive amount (strictly greater than zero). */
export const positiveAmountSchema = amountSchema.refine(
  (val) => {
    const n = typeof val === "string" ? Number(val) : val;
    return n > 0;
  },
  { message: "must be greater than zero" },
);

/** ISO-8601 date string. */
export const isoDateSchema = z
  .string()
  .datetime({ offset: true })
  .or(z.string().datetime())
  .refine((val) => !Number.isNaN(new Date(val).getTime()), { message: "must be a valid ISO date" });

/** Pagination query params shared by list endpoints. */
export const paginationSchema = z
  .object({
    limit: z.coerce.number().int().positive().max(200).optional(),
    offset: z.coerce.number().int().nonnegative().optional(),
  })
  .strict();

export type PaginationInput = z.infer<typeof paginationSchema>;
