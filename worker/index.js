import { createRemoteJWKSet, jwtVerify } from "jose";

/* Must match ADMIN_EMAIL in src/Pages/AdminPanel.jsx and the Firebase
   project in src/firebase.js — kept in sync manually since this file is
   bundled by Wrangler, not Vite. */
const ADMIN_EMAIL = "umerikhlaq160@gmail.com";
const FIREBASE_PROJECT_ID = "webaurixsite";

const JWKS = createRemoteJWKSet(
  new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com")
);

async function verifyAdmin(request) {
  const authHeader = request.headers.get("Authorization") || "";
  const match = authHeader.match(/^Bearer (.+)$/);
  if (!match) return null;

  try {
    const { payload } = await jwtVerify(match[1], JWKS, {
      issuer: `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`,
      audience: FIREBASE_PROJECT_ID,
    });
    if (payload.email?.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) return null;
    return payload;
  } catch {
    return null;
  }
}

const SYSTEM_PROMPT = `You are ARIA, the AI Chief of Staff for Webaurix — a full-service digital agency in Lahore, Pakistan that builds websites, web apps, mobile apps, AI chatbots, and provides digital marketing and IT consulting for clients in Pakistan, the US, the UK, and South Korea.

You report directly to the founder. ALWAYS address him as "Sir". Be decisive, brief, and professional — like a high-caliber Chief of Staff, not a chatbot.

STRICT RULES:
- Language: English ONLY. Never switch to Urdu or any other language.
- Always address the founder as "Sir" in every reply.
- Never say "I don't have access to real-time data", "check your CRM", or "I cannot access live data". If live data is provided below, read it and answer precisely. If no data exists yet, say "No entries yet, Sir."
- Never suggest building a CRM, model, or new tool — you ARE the solution.
- Never use filler phrases like "Great question", "Certainly", "Of course", "I'd be happy to".
- Client questions: answer from the live data — exact counts, names, dates, budgets.
- Decisions: one clear recommendation + brief reason. No list of options, no hedging.
- MEETING EMAIL: Output the [MEETING_EMAIL] block ONLY when Sir explicitly says to schedule, arrange, or send a meeting invitation. NEVER append it to regular answers or data queries.
- Tasks: Output task JSON ONLY when new actionable work items are identified. Never for Q&A or general conversation.

Roles for tasks: "designer" | "developer" | "copywriter" | "sales" | "account_manager"

TASK JSON (only when new tasks found):
\`\`\`json
[{"title":"...","description":"...","role":"developer","priority":"medium"}]
\`\`\`
priority: "low" | "medium" | "high"

MEETING EMAIL (ONLY when Sir explicitly asks to schedule a meeting):
[MEETING_EMAIL]
To: <real email from live data>
Subject: Meeting Request — Webaurix
Body:
<short professional email with 2-3 time slot options>
[/MEETING_EMAIL]`;

function extractTasks(replyText) {
  const match = replyText.match(/```json\s*([\s\S]*?)```/);
  if (!match) return { reply: replyText.trim(), tasks: [] };

  const cleaned = replyText.replace(match[0], "").trim();
  try {
    const parsed = JSON.parse(match[1]);
    const tasks = Array.isArray(parsed)
      ? parsed.filter((t) => t && typeof t.title === "string" && typeof t.role === "string")
      : [];
    return { reply: cleaned, tasks };
  } catch {
    return { reply: cleaned, tasks: [] };
  }
}

async function handleChat(request, env) {
  const admin = await verifyAdmin(request);
  if (!admin) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const { message, history, context } = body || {};
  if (!message || typeof message !== "string") {
    return new Response(JSON.stringify({ error: "Missing message" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const systemContent = typeof context === "string" && context.length > 0
    ? `${SYSTEM_PROMPT}\n\n=== LIVE CLIENT DATA (answer client questions using this) ===\n${context.slice(0, 8000)}`
    : SYSTEM_PROMPT;

  const messages = [
    { role: "system", content: systemContent },
    ...(Array.isArray(history)
      ? history.slice(-12).map((m) => ({ role: m.role, content: m.content }))
      : []),
    { role: "user", content: message },
  ];

  let aiResponse;
  try {
    aiResponse = await env.AI.run("@cf/meta/llama-3.3-70b-instruct-fp8-fast", { messages });
  } catch (err) {
    const msg = String(err?.message || "");
    const isQuota = /quota|rate.?limit|429|too many|exceeded/i.test(msg);
    return new Response(JSON.stringify({ error: isQuota ? "AI daily quota reached — try again tomorrow" : "AI unavailable" }), {
      status: 502,
      headers: { "content-type": "application/json" },
    });
  }

  if (!aiResponse?.response) {
    return new Response(JSON.stringify({ error: "AI returned empty response" }), {
      status: 502,
      headers: { "content-type": "application/json" },
    });
  }

  const { reply, tasks } = extractTasks(aiResponse.response);

  return new Response(JSON.stringify({ reply, tasks }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

/* ── public draft-reply route ──────────────────────────────────────────
   Called directly from the public inquiry/consultation forms, no login.
   Workers AI free tier is a daily quota, not billed, so the worst case of
   abuse is the feature pausing for the day — not a bill. Field length caps
   below are the only abuse guard for this MVP. */
const DRAFT_REPLY_SYSTEM_PROMPT = `You are writing on behalf of Webaurix, a Lahore, Pakistan based digital agency. Webaurix builds custom websites and web apps (MERN stack), e-commerce stores, AI chatbots and AI-powered tools, mobile apps, and UI/UX design for clients in Pakistan, the US, the UK, and South Korea.

A potential client just submitted an inquiry or consultation request. Write a short, warm, professional reply directly to them (you are writing the message body itself, not describing one). Rules:
- Acknowledge their specific request, don't sound generic.
- Do NOT quote an exact price or budget figure, even if they asked. Briefly note that pricing depends on scope and offer to discuss it on a short call.
- Ask exactly one clarifying question OR propose a brief call/next step.
- Keep it under 120 words.
- Sign off as "Webaurix Team".
- Output ONLY the message body — no subject line, no preamble like "Here's a draft", no markdown formatting.`;

function clamp(str, max) {
  return typeof str === "string" ? str.slice(0, max) : "";
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } });
}

/* Shared by /draft-reply and /auto-reply — validates input and drafts via
   Workers AI. Returns either { error, status } or { name, email, draft }. */
async function draftReply(body, env) {
  const name    = clamp(body?.name, 200).trim();
  const email   = clamp(body?.email, 200).trim();
  const message = clamp(body?.message, 2000).trim();
  const service = clamp(body?.service, 200).trim();
  const budget  = clamp(body?.budget, 100).trim();

  if (!name || !email || !message) {
    return { error: "Missing required fields", status: 400 };
  }

  const userContent = [
    `Name: ${name}`,
    `Email: ${email}`,
    service ? `Service requested: ${service}` : null,
    budget ? `Budget mentioned: ${budget}` : null,
    `Their message: ${message}`,
  ].filter(Boolean).join("\n");

  let draft;
  try {
    const aiResponse = await env.AI.run("@cf/meta/llama-3.3-70b-instruct-fp8-fast", {
      messages: [
        { role: "system", content: DRAFT_REPLY_SYSTEM_PROMPT },
        { role: "user", content: userContent },
      ],
    });
    draft = (aiResponse?.response ?? "").trim();
  } catch {
    return { error: "AI request failed", status: 502 };
  }

  if (!draft) return { error: "Empty draft", status: 502 };
  return { name, email, draft };
}

async function handleDraftReply(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const result = await draftReply(body, env);
  if (result.error) return jsonResponse({ error: result.error }, result.status);

  return jsonResponse({ draft: result.draft });
}

/* ── Email send via Resend ─────────────────────────────────────────────────
   Requires 2 Cloudflare Worker secrets: RESEND_API_KEY, RESEND_FROM_EMAIL
   e.g. RESEND_FROM_EMAIL = "Webaurix <info@webaurix.com>"
   Domain must be verified in resend.com dashboard. */
function buildEmailHtml(toName, bodyText) {
  const firstName = (toName || "there").split(" ")[0];
  const paragraphs = bodyText
    .replace(/^Dear\s+[^\n,]+[,.]?\s*/i, "")
    .replace(/Webaurix\s*Team\s*$/i, "")
    .trim()
    .split(/\n+/)
    .filter(Boolean)
    .map(p => `<p class="body-text">${p}</p>`)
    .join("");

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Webaurix</title>
  <style>
    body { margin:0; padding:0; background:#f1f5f9; font-family:'Segoe UI',Helvetica,Arial,sans-serif; -webkit-text-size-adjust:100%; }
    table { border-collapse:collapse; }
    img { border:0; display:block; max-width:100%; }
    .wrapper { width:100%; background:#f1f5f9; padding:32px 16px; }
    .container { max-width:580px; margin:0 auto; width:100%; }
    .header { background:#0b0b0e; background:linear-gradient(135deg,#0b0b0e 0%,#0d1017 60%,#0b1215 100%); border-radius:16px 16px 0 0; padding:28px 40px; text-align:center; border-bottom:2px solid #0e7490; }
    .logo-row { display:flex; align-items:center; justify-content:center; gap:10px; }
    .logo-icon { height:38px; width:auto; }
    .logo-img { height:32px; width:auto; }
    .tagline { margin:10px 0 0; color:#64748b; font-size:11px; letter-spacing:2px; text-transform:uppercase; text-align:left; }
    .body-wrap { background:#ffffff; padding:36px 40px 28px; }
    .greeting { margin:0 0 20px; font-size:17px; font-weight:700; color:#0f172a; }
    .body-text { margin:0 0 15px; color:#374151; font-size:15px; line-height:1.75; }
    .cta-wrap { margin:28px 0; }
    .cta-btn { display:inline-block; background:#0e7490; color:#ffffff !important; font-size:14px; font-weight:600; text-decoration:none; padding:13px 26px; border-radius:8px; letter-spacing:0.3px; }
    .reply-note { margin:4px 0 0; color:#64748b; font-size:13px; line-height:1.6; }
    .divider { border:none; border-top:1px solid #e2e8f0; margin:0; }
    .sig-wrap { background:#ffffff; padding:20px 40px 28px; }
    .sig-name { margin:0; font-size:14px; font-weight:700; color:#0f172a; }
    .sig-meta { margin:4px 0 0; font-size:13px; color:#64748b; }
    .footer { background:#0b0b0e; background:linear-gradient(135deg,#0b0b0e 0%,#0d1017 60%,#0b1215 100%); border-radius:0 0 16px 16px; padding:18px 40px; text-align:center; border-top:2px solid #0e7490; }
    .footer p { margin:0; color:#475569; font-size:12px; }
    .footer a { color:#68b5cc; text-decoration:none; }

    @media only screen and (max-width:600px) {
      .wrapper { padding:16px 8px !important; }
      .header { padding:24px 20px !important; border-radius:12px 12px 0 0 !important; }
      .logo-img { height:34px !important; }
      .body-wrap { padding:24px 20px 20px !important; }
      .greeting { font-size:16px !important; }
      .body-text { font-size:14px !important; }
      .cta-btn { display:block !important; text-align:center !important; padding:14px 20px !important; }
      .sig-wrap { padding:16px 20px 20px !important; }
      .footer { padding:16px 20px !important; border-radius:0 0 12px 12px !important; }
    }
  </style>
</head>
<body>
<div class="wrapper">
  <div class="container">

    <!-- Header -->
    <div class="header">
      <div class="logo-row">
        <img src="https://webaurix.com/logo-icon.png" alt="" class="logo-icon">
        <img src="https://webaurix.com/logo-light.png" alt="Webaurix" class="logo-img">
      </div>
      <p class="tagline">AURA THAT REDEFINED TECH</p>
    </div>

    <!-- Body -->
    <div class="body-wrap">
      <p class="greeting">Hi ${firstName},</p>
      ${paragraphs}
      <div class="cta-wrap">
        <a href="https://calendly.com/info-webaurix/30min" class="cta-btn">Book a Free Consultation &rarr;</a>
      </div>
      <p class="reply-note">Feel free to reply to this email — we typically respond within a few hours.</p>
    </div>

    <!-- Divider -->
    <div style="background:#ffffff;padding:0 40px;"><hr class="divider"></div>

    <!-- Signature -->
    <div class="sig-wrap">
      <p class="sig-name">Webaurix Team</p>
      <p class="sig-meta">support@webaurix.com &nbsp;&middot;&nbsp; webaurix.com</p>
      <p class="sig-meta">Lahore, Pakistan</p>
    </div>

    <!-- Footer -->
    <div class="footer">
      <p>&copy; 2025 Webaurix &nbsp;&middot;&nbsp; <a href="https://webaurix.com">webaurix.com</a></p>
    </div>

  </div>
</div>
</body>
</html>`;
}

async function sendEmail(env, { to, toName, subject, body }) {
  if (!env.RESEND_API_KEY) throw new Error("RESEND_API_KEY secret not configured in Cloudflare");
  const from = env.RESEND_FROM_EMAIL || "Webaurix <support@webaurix.com>";
  const toArr = toName ? [`${toName} <${to}>`] : [to];

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: toArr,
      subject,
      text: body,
      html: buildEmailHtml(toName, body),
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || data.name || `Resend error ${res.status}`);
  return true;
}

/* ── public auto-reply route ───────────────────────────────────────────
   Drafts AND sends in one call — no admin approval. Called directly from
   the public inquiry/consultation forms right after they save to Firestore. */
async function handleAutoReply(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const result = await draftReply(body, env);
  if (result.error) return jsonResponse({ error: result.error }, result.status);

  let sent = false;
  try {
    await sendEmail(env, { to: result.email, toName: result.name, subject: "Re: Your inquiry with Webaurix", body: result.draft });
    sent = true;
  } catch {
    sent = false;
  }

  return jsonResponse({ draft: result.draft, sent });
}

/* ── admin-only manual resend ──────────────────────────────────────────
   Used by the admin panel's "Send Now" fallback when auto-send failed
   (e.g. Gmail secrets not configured yet) or the founder edited the text. */
async function handleSendReply(request, env) {
  const admin = await verifyAdmin(request);
  if (!admin) return jsonResponse({ error: "Unauthorized" }, 401);

  let body;
  try { body = await request.json(); } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const to      = clamp(body?.to, 200).trim();
  const toName  = clamp(body?.toName, 200).trim();
  const text    = clamp(body?.body, 4000).trim();
  const subject = clamp(body?.subject, 200).trim() || "Re: Your inquiry with Webaurix";
  if (!to || !text) return jsonResponse({ error: "Missing required fields" }, 400);

  try {
    await sendEmail(env, { to, toName, subject, body: text });
  } catch (err) {
    return jsonResponse({ error: String(err?.message || "Gmail send failed") }, 502);
  }

  return jsonResponse({ sent: true });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // 1. If browser sent a trailing-slash URL, 301 → canonical (no slash)
    if (url.pathname !== "/" && url.pathname.endsWith("/")) {
      url.pathname = url.pathname.slice(0, -1);
      return Response.redirect(url.toString(), 301);
    }

    if (url.pathname === "/api/ai-manager/chat" && request.method === "POST") {
      return handleChat(request, env);
    }
    if (url.pathname === "/api/ai-manager/draft-reply" && request.method === "POST") {
      return handleDraftReply(request, env);
    }
    if (url.pathname === "/api/ai-manager/auto-reply" && request.method === "POST") {
      return handleAutoReply(request, env);
    }
    if (url.pathname === "/api/ai-manager/send-reply" && request.method === "POST") {
      return handleSendReply(request, env);
    }

    return env.ASSETS.fetch(request);
  },
};
