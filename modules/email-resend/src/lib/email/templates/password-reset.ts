export interface PasswordResetEmailInput {
  name: string;
  url: string;
}

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

export function passwordResetEmail({ name, url }: PasswordResetEmailInput): RenderedEmail {
  const safeName = name?.trim() || "there";
  const subject = "Reset your AgenticBuilder password";
  const text = [
    `Hi ${safeName},`,
    "",
    "Click the link below to set a new password. The link expires in 1 hour.",
    url,
    "",
    "If you didn't request this, you can safely ignore this message — your password won't change.",
    "",
    "— The AgenticBuilder team",
  ].join("\n");
  const html = `
    <div style="font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#111;line-height:1.5">
      <p>Hi ${escapeHtml(safeName)},</p>
      <p>Click the button below to set a new password. The link expires in 1 hour.</p>
      <p>
        <a href="${escapeAttr(url)}"
           style="display:inline-block;padding:10px 16px;background:#111;color:#fff;text-decoration:none;border-radius:6px">
          Set a new password
        </a>
      </p>
      <p style="color:#666;font-size:13px">Or paste this link into your browser:<br>
        <a href="${escapeAttr(url)}" style="color:#666">${escapeHtml(url)}</a>
      </p>
      <p style="color:#666;font-size:13px">
        If you didn't request this, you can safely ignore this message — your password won't change.
      </p>
      <p style="color:#666">— The AgenticBuilder team</p>
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
