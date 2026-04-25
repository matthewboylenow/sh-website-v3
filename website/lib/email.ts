import { Resend } from "resend";

const FROM_DEFAULT = "Saint Helen <no-reply@send.sainthelen.org>";

/**
 * Send a magic-link email. Production path uses Resend
 * (RESEND_API_KEY + EMAIL_FROM env vars). When the key is missing —
 * which is the case during local dev before Matthew provisions
 * Resend — the link is logged to the server console with a clear
 * banner so it can be copy-pasted into the browser.
 */
export async function sendMagicLink(
  email: string,
  url: string,
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM ?? FROM_DEFAULT;

  if (!apiKey) {
    console.log(
      `\n${"=".repeat(70)}\n` +
        `📧  DEV MAGIC LINK — RESEND_API_KEY not set\n` +
        `${"=".repeat(70)}\n` +
        `to:   ${email}\n` +
        `url:  ${url}\n` +
        `${"=".repeat(70)}\n`,
    );
    return;
  }

  const resend = new Resend(apiKey);
  const result = await resend.emails.send({
    from,
    to: email,
    replyTo: process.env.EMAIL_REPLY_TO,
    subject: "Sign in to Saint Helen",
    html: renderMagicLinkHtml(url),
    text: renderMagicLinkText(url),
  });

  if (result.error) {
    throw new Error(`Resend error: ${result.error.message}`);
  }
}

function renderMagicLinkHtml(url: string): string {
  // Plain HTML — switch to a React Email template once Step 8 brings
  // the full transactional email kit (welcome, prayer-request, etc.).
  return `
<!doctype html>
<html><body style="font-family:Helvetica,Arial,sans-serif;background:#FAF9F7;padding:32px;">
  <div style="max-width:520px;margin:0 auto;background:white;border:1px solid #E5E5E5;border-radius:12px;padding:32px;">
    <h1 style="font-family:Georgia,serif;color:#1F346D;margin:0 0 16px;">Sign in to Saint Helen</h1>
    <p style="color:#3A3A3A;line-height:1.6;">Click the button below to sign in. This link is good for the next 24 hours.</p>
    <p style="text-align:center;margin:32px 0;">
      <a href="${url}" style="display:inline-block;background:#CD5334;color:white;padding:14px 28px;border-radius:999px;font-weight:600;text-decoration:none;">Sign in</a>
    </p>
    <p style="color:#6B6B6B;font-size:13px;line-height:1.6;">If you didn&rsquo;t request this, you can safely ignore this email.</p>
  </div>
</body></html>`;
}

function renderMagicLinkText(url: string): string {
  return `Sign in to Saint Helen Admin: ${url}\n\nIf you didn't request this, you can safely ignore this email.`;
}
