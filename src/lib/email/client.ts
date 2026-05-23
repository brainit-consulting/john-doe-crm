import { Resend } from "resend";
import { env } from "@/lib/env";

// Single shared Resend client. The SDK is thin (HTTP wrapper) so reusing
// one instance per process is enough.
export const resend = new Resend(env.RESEND_API_KEY);
