import { resend } from "./client";
import { env } from "@/lib/env";

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  text: string;
}

/**
 * Send a transactional email via Resend.
 *
 * Throws on Resend API errors so the caller (Better-Auth hook, server
 * action, etc.) can decide whether to surface the failure or swallow it.
 */
export async function sendEmail({ to, subject, html, text }: SendEmailInput): Promise<void> {
  if (!env.EMAIL_FROM) {
    throw new Error("Email is not configured: set EMAIL_FROM (and RESEND_API_KEY).");
  }
  const { error } = await resend.emails.send({
    from: env.EMAIL_FROM,
    to,
    subject,
    html,
    text,
  });
  if (error) {
    throw new Error(`Resend send failed: ${error.message ?? JSON.stringify(error)}`);
  }
}
