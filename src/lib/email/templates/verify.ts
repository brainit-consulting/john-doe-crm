export interface VerifyEmailInput {
  name: string;
  url: string;
}

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

export function verifyEmail({ name, url }: VerifyEmailInput): RenderedEmail {
  const safeName = name?.trim() || "there";
  const subject = "Confirm your email for John Doe CRM";
  const text = [
    `Hi ${safeName},`,
    "",
    "Confirm your email to finish setting up your John Doe CRM account:",
    url,
    "",
    "If you didn't sign up, you can safely ignore this message.",
    "",
    "— The John Doe CRM team",
  ].join("\n");
  const html = `
    <div style="font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#111;line-height:1.5">
      <p>Hi ${escapeHtml(safeName)},</p>
      <p>Confirm your email to finish setting up your John Doe CRM account.</p>
      <p>
        <a href="${escapeAttr(url)}"
           style="display:inline-block;padding:10px 16px;background:#111;color:#fff;text-decoration:none;border-radius:6px">
          Verify email
        </a>
      </p>
      <p style="color:#666;font-size:13px">Or paste this link into your browser:<br>
        <a href="${escapeAttr(url)}" style="color:#666">${escapeHtml(url)}</a>
      </p>
      <p style="color:#666;font-size:13px">If you didn't sign up, you can safely ignore this message.</p>
      <p style="color:#666">— The John Doe CRM team</p>
    </div>
  `.trim();
  return { subject, html, text };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttr(s: string): string {
  return escapeHtml(s);
}
