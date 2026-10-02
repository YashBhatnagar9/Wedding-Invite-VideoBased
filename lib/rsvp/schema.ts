import { z } from "zod";

/**
 * Prevent spreadsheet formula injection when values are forwarded to Google
 * Sheets. Any string that begins with a formula control character is prefixed
 * with a single quote so Sheets treats it as literal text.
 */
export function sanitizeSpreadsheetInput(str: string): string {
  return /^[=+\-@\t\r]/.test(str) ? `'${str}` : str;
}

export const RsvpSchema = z.object({
  name: z.string().trim().min(2).max(80),
  side: z.enum(["Bride", "Groom", "Both"]),
  attending: z.enum(["yes", "no"]),
  wish: z.string().trim().max(500).optional(),
});

export type RsvpInput = z.infer<typeof RsvpSchema>;
