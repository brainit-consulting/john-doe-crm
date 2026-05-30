"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth/roles";
import { createActivity } from "@/lib/db/queries/activities";
import type { Activity } from "@/lib/db/schema";

export type ActivityActionResult =
  | { ok: true }
  | { ok: false; error: string };

// stage_change is reserved for system-driven events (e.g. lead → client
// conversion); reps only log call/email/meeting/note from the UI.
const logActivitySchema = z.object({
  subjectType: z.enum(["lead", "client", "project"]),
  subjectId: z.string().trim().min(1, "Missing subject"),
  kind: z.enum(["call", "email", "meeting", "note"]),
  body: z.string().trim().min(1, "Add a note").max(5000),
  // Optional — the raw dictated transcript from T6 voice-note dictation.
  // When present, a voice_notes row is also inserted (see createActivity).
  voiceTranscript: z.string().trim().max(5000).optional(),
});

const DETAIL_PATH: Record<Activity["subjectType"], string> = {
  lead: "/leads",
  client: "/clients",
  project: "/projects",
};

export async function logActivity(
  formData: FormData,
): Promise<ActivityActionResult> {
  const session = await requireRole("rep");

  const parsed = logActivitySchema.safeParse({
    subjectType: formData.get("subjectType"),
    subjectId: formData.get("subjectId"),
    kind: formData.get("kind"),
    body: formData.get("body"),
    voiceTranscript: formData.get("voiceTranscript") ?? undefined,
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { subjectType, subjectId, kind, body, voiceTranscript } = parsed.data;

  await createActivity({
    subjectType,
    subjectId,
    kind,
    body,
    createdBy: session.user.id,
    voiceTranscript,
  });

  // Revalidate the subject's detail page so the new entry (and, for leads, the
  // refreshed "going cold" state) shows immediately.
  revalidatePath(`${DETAIL_PATH[subjectType]}/${subjectId}`);
  if (subjectType === "lead") {
    // The lead list orders by lastActivityAt and shows the cold badge.
    revalidatePath("/leads");
  }

  return { ok: true };
}
