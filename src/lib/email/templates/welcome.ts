export interface WelcomeEmailInput {
  name: string;
}

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

export function welcomeEmail({ name }: WelcomeEmailInput): RenderedEmail {
  const safeName = name?.trim() || "there";
  const subject = "Welcome to John Doe CRM";
  const text = [
    `Hi ${safeName},`,
    "",
    "Welcome to John Doe CRM. Your account is ready — sign in and start building.",
    "",
    "— The John Doe CRM team",
  ].join("\n");
  const html = `
    <div style="font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#111;line-height:1.5">
      <p>Hi ${escapeHtml(safeName)},</p>
      <p>Welcome to <strong>John Doe CRM</strong>. Your account is ready — sign in and start building.</p>
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
