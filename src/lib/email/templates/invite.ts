export interface InviteEmailInput {
  role: string;
  url: string;
  inviterName: string;
}

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

export function inviteEmail({ role, url, inviterName }: InviteEmailInput): RenderedEmail {
  const safeInviter = inviterName?.trim() || "Someone";
  const subject = "You're invited to John Doe CRM";
  const text = [
    `${safeInviter} invited you to John Doe CRM as a ${role}.`,
    "",
    "Accept your invite and create your account here:",
    url,
    "",
    "This invitation expires in 7 days.",
    "",
    "— The John Doe CRM team",
  ].join("\n");
  const html = `
    <div style="font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#111;line-height:1.5">
      <p>${escapeHtml(safeInviter)} invited you to John Doe CRM as a <strong>${escapeHtml(role)}</strong>.</p>
      <p>Accept your invite and create your account.</p>
      <p>
        <a href="${escapeAttr(url)}"
           style="display:inline-block;padding:10px 16px;background:#111;color:#fff;text-decoration:none;border-radius:6px">
          Accept invite
        </a>
      </p>
      <p style="color:#666;font-size:13px">Or paste this link into your browser:<br>
        <a href="${escapeAttr(url)}" style="color:#666">${escapeHtml(url)}</a>
      </p>
      <p style="color:#666;font-size:13px">This invitation expires in 7 days.</p>
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
