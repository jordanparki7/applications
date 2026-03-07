import { NextRequest, NextResponse } from "next/server";

/* ================================================================
   TYPES
   ================================================================ */
interface ApplicationPayload {
  role: string;
  roleName: string;
  submittedAt: string;
  answers: Record<string, string>;
}

interface ParsedLocation {
  location: string;
  timezoneLabel: string;
  applicantLocalTime: string;
}

interface DiscordSendResult {
  ok: boolean;
  status?: number;
  responseText?: string;
  errorMessage?: string;
  attemptCount: number;
}

/* ================================================================
   HELPERS
   ================================================================ */

/** Truncate text to fit Discord's 1024-char field limit */
function truncate(text: string, max = 1000): string {
  if (!text) return "*Not provided*";
  if (text.length <= max) return text;
  return text.slice(0, max - 1) + "…";
}

function normalizeText(value: string | undefined): string {
  return value?.trim() || "";
}

function sanitizeAnswer(value: string | undefined, max = 1000): string {
  const normalized = normalizeText(value);
  return normalized ? truncate(normalized, max) : "Not provided";
}

/** URL regex — matches http(s) URLs and common bare domains */
const URL_PATTERN =
  /\bhttps?:\/\/[^\s<>"\])+]+(?:\([^\s<>"]*\))*[^\s<>"\]).,;:!?'"]*|\b(?:www\.)[^\s<>"\])+]+(?:\([^\s<>"]*\))*[^\s<>"\]).,;:!?'"]*|\b[a-z0-9-]+(?:\.[a-z]{2,}){1,2}\/[^\s<>"\])]*[^\s<>"\]).,;:!?'"]/gi;

/** Normalize a detected URL into a full https:// form */
function normalizeUrl(raw: string): string | null {
  try {
    const withScheme = raw.match(/^https?:\/\//i) ? raw : `https://${raw}`;
    const parsed = new URL(withScheme);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    return parsed.href;
  } catch {
    return null;
  }
}

/**
 * Extract all unique URLs from text.
 * Returns { urls, textWithout } where textWithout has URLs stripped
 * and cleaned of leftover whitespace artefacts.
 */
function extractUrls(text: string): { urls: string[]; textWithout: string } {
  const seen = new Set<string>();
  const urls: string[] = [];

  const textWithout = text.replace(URL_PATTERN, (match) => {
    const normalized = normalizeUrl(match);
    if (normalized && !seen.has(normalized)) {
      seen.add(normalized);
      urls.push(normalized);
    }
    return "";
  });

  const cleaned = textWithout
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return { urls, textWithout: cleaned };
}

/**
 * Format an answer for Discord:
 * - Truncates to max length
 * - Detects embedded URLs, pulls them out, and appends them on
 *   their own lines so Discord can auto-link them
 */
function formatAnswer(value: string | undefined, max = 1000): string {
  const normalized = normalizeText(value);
  if (!normalized) return "Not provided";

  const { urls, textWithout } = extractUrls(normalized);

  if (urls.length === 0) {
    return truncate(normalized, max);
  }

  const linkBlock = urls.map((u) => `> ${u}`).join("\n");
  const bodyMax = max - linkBlock.length - 2;

  if (!textWithout) {
    return truncate(linkBlock, max);
  }

  return `${truncate(textWithout, bodyMax)}\n${linkBlock}`;
}


function parseTimezoneOffset(raw: string): number | null {
  const cleaned = raw.trim().toUpperCase().replace(/UTC/g, "GMT");
  const match = cleaned.match(/GMT\s*([+-])\s*(\d{1,2})(?::?(\d{2}))?$/i);
  if (!match) return null;

  const sign = match[1] === "+" ? 1 : -1;
  const hours = Number(match[2]);
  const minutes = Number(match[3] ?? "0");

  if (hours > 14 || minutes > 59) return null;

  return sign * (hours * 60 + minutes);
}

function formatOffsetLabel(offsetMinutes: number): string {
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const absoluteMinutes = Math.abs(offsetMinutes);
  const hours = Math.floor(absoluteMinutes / 60)
    .toString()
    .padStart(2, "0");
  const minutes = (absoluteMinutes % 60).toString().padStart(2, "0");

  return `GMT${sign}${hours}:${minutes}`;
}

function formatLocalTimeFromOffset(offsetMinutes: number): string {
  const now = new Date();
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60_000;
  const applicantDate = new Date(utcMs + offsetMinutes * 60_000);

  return applicantDate.toLocaleString("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function parseLocation(value: string | undefined): ParsedLocation {
  const raw = normalizeText(value);
  if (!raw) {
    return {
      location: "Not provided",
      timezoneLabel: "Not provided",
      applicantLocalTime: "Unavailable",
    };
  }

  const parts = raw
    .split(/\s*[|,/;-]\s*/)
    .map((part) => part.trim())
    .filter(Boolean);

  const timezonePart = [...parts].reverse().find((part) => parseTimezoneOffset(part) !== null);
  const timezoneOffset = timezonePart ? parseTimezoneOffset(timezonePart) : null;
  const locationParts = timezonePart
    ? parts.filter((part) => part !== timezonePart)
    : parts;

  return {
    location: locationParts.join(", ") || raw,
    timezoneLabel: timezoneOffset === null ? "Not clearly provided" : formatOffsetLabel(timezoneOffset),
    applicantLocalTime:
      timezoneOffset === null ? "Unavailable from submitted timezone" : formatLocalTimeFromOffset(timezoneOffset),
  };
}

function field(name: string, value: string, inline?: boolean) {
  return { name, value, ...(inline ? { inline } : {}) };
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function sendToDiscordWithRetry(
  webhookUrl: string,
  payload: unknown,
  maxAttempts = 4
): Promise<DiscordSendResult> {
  const backoffMs = [0, 800, 1800, 3200];

  let lastStatus: number | undefined;
  let lastResponseText: string | undefined;
  let lastErrorMessage: string | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const delay = backoffMs[Math.min(attempt - 1, backoffMs.length - 1)];
    if (delay > 0) {
      await wait(delay);
    }

    try {
      const discordRes = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (discordRes.ok) {
        return { ok: true, status: discordRes.status, attemptCount: attempt };
      }

      const responseText = await discordRes.text();
      lastStatus = discordRes.status;
      lastResponseText = responseText;

      const isRetriableHttp = discordRes.status === 429 || discordRes.status >= 500;
      if (isRetriableHttp && attempt < maxAttempts) {
        if (discordRes.status === 429) {
          try {
            const body = responseText ? JSON.parse(responseText) : null;
            const retryAfter = Number(body?.retry_after);
            if (!Number.isNaN(retryAfter) && retryAfter > 0) {
              const retryMs = retryAfter <= 60 ? retryAfter * 1000 : retryAfter;
              await wait(Math.min(retryMs, 10_000));
            }
          } catch {
            // Ignore malformed rate-limit bodies and continue with standard backoff.
          }
        }
        continue;
      }

      return {
        ok: false,
        status: discordRes.status,
        responseText,
        attemptCount: attempt,
      };
    } catch (error) {
      lastErrorMessage = error instanceof Error ? error.message : "Unknown fetch error";

      if (attempt < maxAttempts) {
        continue;
      }

      return {
        ok: false,
        errorMessage: lastErrorMessage,
        attemptCount: attempt,
      };
    }
  }

  return {
    ok: false,
    status: lastStatus,
    responseText: lastResponseText,
    errorMessage: lastErrorMessage,
    attemptCount: maxAttempts,
  };
}

/** Thin visual spacer between sections */
function spacer() {
  return field("\u200b", "\u200b");
}

function buildDescription(data: ApplicationPayload, loc: ParsedLocation) {
  const a = data.answers;
  const ts = Math.floor(new Date(data.submittedAt).getTime() / 1000);

  const portfolioFormatted = formatAnswer(a.portfolio, 200);
  const portfolioLine = portfolioFormatted === "Not provided"
    ? ""
    : `\n\uD83D\uDD17 ${portfolioFormatted}`;

  const localTimeLine = loc.applicantLocalTime.startsWith("Unavailable")
    ? ""
    : `\n\uD83D\uDD52 Their local time: **${loc.applicantLocalTime}**`;

  return [
    `### \uD83D\uDC64 ${sanitizeAnswer(a.full_name, 100)}`,
    `\`${sanitizeAnswer(a.discord, 60)}\`  \u00B7  Age **${sanitizeAnswer(a.age, 5)}**`,
    "",
    `\uD83C\uDF0D ${sanitizeAnswer(loc.location, 120)}  \u00B7  ${loc.timezoneLabel}${localTimeLine}`,
    `\uD83D\uDCE7 ${sanitizeAnswer(a.email, 200)}${portfolioLine}`,
    "",
    `\u23F3 Submitted <t:${ts}:R>  \u00B7  <t:${ts}:f>`,
  ].join("\n");
}

/* ================================================================
   BUILD DISCORD EMBED
   ================================================================ */
function buildEmbed(data: ApplicationPayload) {
  const a = data.answers;
  const location = parseLocation(a.location);

  const fields: Array<{
    name: string;
    value: string;
    inline?: boolean;
  }> = [];

  /* ── Screening ── */
  fields.push(field(
    "\uD83D\uDCCB Screening",
    [
      `**NDA:** ${sanitizeAnswer(a.nda, 300)}`,
      `**Other Teams:** ${formatAnswer(a.other_teams, 300)}`,
    ].join("\n"),
  ));

  fields.push(spacer());

  /* ── Skills & Tools ── */
  fields.push(field(
    "\uD83D\uDEE0\uFE0F Tools & Environment",
    [
      `**Tools:** ${sanitizeAnswer(a.tools, 400)}`,
      `**Language:** ${sanitizeAnswer(a.scripting_lang, 200)}`,
      `**Structures/Jigsaws/Features:** ${sanitizeAnswer(a.structures_jigsaws_features, 300)}`,
      `**Hours:** ${sanitizeAnswer(a.hours, 300)}`,
    ].join("\n"),
  ));

  /* ── Experience ── */
  fields.push(field(
    "\uD83D\uDCBC Relevant Experience",
    formatAnswer(a.experience),
  ));

  fields.push(field(
    "\uD83C\uDFEA Marketplace History",
    formatAnswer(a.marketplace_exp),
  ));

  fields.push(spacer());

  /* ── Character ── */
  fields.push(field(
    "\uD83C\uDFC6 Proudest Project",
    formatAnswer(a.proud_project),
  ));

  fields.push(field(
    "\u26A1 Biggest Challenge",
    formatAnswer(a.challenge),
  ));

  fields.push(field(
    "\uD83D\uDCAA Strengths & Weaknesses",
    formatAnswer(a.strengths_weaknesses),
  ));

  fields.push(field(
    "\uD83C\uDFAF Motivation",
    formatAnswer(a.motivation, 800),
    true,
  ));

  fields.push(field(
    "\uD83D\uDCAC Feedback Style",
    formatAnswer(a.feedback, 800),
    true,
  ));

  fields.push(field(
    "\uD83D\uDDE3\uFE0F English Proficiency",
    sanitizeAnswer(a.english, 400),
  ));

  fields.push(spacer());

  /* ── Competency ── */
  const scriptKeys = Object.keys(a)
    .filter((k) => k.startsWith("script_"))
    .sort();

  scriptKeys.forEach((key, i) => {
    fields.push(field(
      `\uD83D\uDD0D Script Analysis ${i + 1}`,
      formatAnswer(a[key]),
    ));
  });

  fields.push(spacer());

  /* ── Future & Availability ── */
  fields.push(field(
    "\uD83D\uDE80 Goals",
    [
      `**6-Month Vision:** ${formatAnswer(a.six_months, 400)}`,
      `**Skills to Develop:** ${formatAnswer(a.skills_develop, 400)}`,
    ].join("\n"),
  ));

  fields.push(field(
    "\u23F0 Availability",
    [
      `**Committed Hours:** ${sanitizeAnswer(a.realistic_hours, 200)}`,
      `**Commitments:** ${sanitizeAnswer(a.commitments, 300)}`,
      `**Schedule Changes:** ${sanitizeAnswer(a.schedule_changes, 300)}`,
      `**Peak Productivity:** ${sanitizeAnswer(a.productive_time, 200)}`,
      `**Voice Calls:** ${sanitizeAnswer(a.voice_calls, 200)}`,
    ].join("\n"),
  ));

  /* ── Additional Notes ── */
  if (normalizeText(a.final_note)) {
    fields.push(spacer());
    fields.push(field(
      "\uD83D\uDCCC Additional Notes",
      formatAnswer(a.final_note),
    ));
  }

  return {
    embeds: [
      {
        color: 0x7c3aed,
        author: {
          name: "Architects Edge",
        },
        title: `\uD83D\uDCE8  New Application  \u2014  ${data.roleName}`,
        description: buildDescription(data, location),
        fields,
        footer: {
          text: `Architects Edge Applications  \u00B7  ${data.role}`,
        },
        timestamp: data.submittedAt,
      },
    ],
  };
}

/* ================================================================
   ROUTE HANDLER
   ================================================================ */
export async function POST(req: NextRequest) {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) {
    return NextResponse.json(
      { error: "Webhook not configured", code: "WEBHOOK_MISSING" },
      { status: 500 }
    );
  }

  let body: ApplicationPayload;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON", code: "INVALID_JSON" },
      { status: 400 }
    );
  }

  /* Basic validation */
  if (
    !body.role ||
    !body.roleName ||
    !body.answers ||
    typeof body.answers !== "object"
  ) {
    return NextResponse.json(
      { error: "Missing required fields", code: "INVALID_PAYLOAD" },
      { status: 400 }
    );
  }

  try {
    const payload = buildEmbed(body);

    const result = await sendToDiscordWithRetry(webhookUrl, payload);
    if (!result.ok) {
      console.error("Discord webhook error:", {
        status: result.status,
        responseText: result.responseText,
        errorMessage: result.errorMessage,
        attemptCount: result.attemptCount,
      });

      return NextResponse.json(
        {
          error: "Failed to send to Discord",
          code: "DISCORD_REQUEST_FAILED",
          status: result.status ?? 500,
          details: result.responseText ?? result.errorMessage ?? "Unknown Discord error",
          attempts: result.attemptCount,
        },
        { status: 502 }
      );
    }
  } catch (error) {
    console.error("Unhandled Discord webhook error:", error);
    return NextResponse.json(
      { error: "Unexpected webhook error", code: "UNEXPECTED_WEBHOOK_ERROR" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
