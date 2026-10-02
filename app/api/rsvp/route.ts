import { NextResponse } from "next/server";
import { RsvpSchema, sanitizeSpreadsheetInput } from "@/lib/rsvp/schema";

/** Reject oversized payloads before the body is buffered/parsed. */
const MAX_BODY_BYTES = 10240;

/**
 * POST /api/rsvp — forwards RSVP responses to a Google Sheets webhook.
 * Input is validated with RsvpSchema and sanitised against spreadsheet
 * formula injection before forwarding. Configure GOOGLE_SHEETS_WEBHOOK_URL
 * in the environment; without it the request is acknowledged locally
 * (dev fallback) instead of failing guests.
 */
export async function POST(req: Request) {
  const contentLength = Number(req.headers.get("content-length") ?? 0);
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    return NextResponse.json({ ok: false, error: "Request too large" }, { status: 413 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 });
  }

  const parsed = RsvpSchema.safeParse(json);
  if (!parsed.success) {
    // Generic message — never leak validation internals to the client.
    return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 });
  }

  const { name, side, attending, wish = "" } = parsed.data;
  const payload = {
    name: sanitizeSpreadsheetInput(name),
    side,
    attending,
    wish: sanitizeSpreadsheetInput(wish),
    at: new Date().toISOString(),
  };
  const webhook = process.env.GOOGLE_SHEETS_WEBHOOK_URL;

  // Dev/no-webhook fallback: acknowledge locally so the UI never breaks.
  if (!webhook) {
    console.log(`[rsvp:local] ${name} (${side}, ${attending}): ${wish}`);
    return NextResponse.json({ ok: true, stored: "local" });
  }

  try {
    const res = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      // Don't hang the guest on a slow Apps Script endpoint.
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error(`[rsvp:webhook] upstream ${res.status}: ${text.slice(0, 300)}`);
      return NextResponse.json(
        { ok: false, error: "Submission service unavailable" },
        { status: 502 }
      );
    }
    return NextResponse.json({ ok: true, stored: "sheets" });
  } catch (err) {
    console.error("[rsvp:webhook] fetch failed:", err);
    return NextResponse.json(
      { ok: false, error: "Submission service unavailable" },
      { status: 502 }
    );
  }
}
