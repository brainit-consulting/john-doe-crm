import { eq, and, desc, inArray } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  activities,
  voiceNotes,
  leads,
  user,
  type Activity,
  type NewActivity,
} from "@/lib/db/schema";

export type ActivitySubject = Activity["subjectType"];
export type ActivityKind = Activity["kind"];

// An activity enriched with its author's display name and any voice-note
// transcripts attached to it (T6 dictation writes those rows; the text log
// just renders them when present).
export type ActivityWithMeta = Activity & {
  authorName: string | null;
  transcripts: string[];
};

export async function listActivities(
  subjectType: ActivitySubject,
  subjectId: string,
): Promise<ActivityWithMeta[]> {
  // Newest first, joined to the author's user name.
  const rows = await db
    .select({
      activity: activities,
      authorName: user.name,
    })
    .from(activities)
    .leftJoin(user, eq(activities.createdBy, user.id))
    .where(
      and(
        eq(activities.subjectType, subjectType),
        eq(activities.subjectId, subjectId),
      ),
    )
    .orderBy(desc(activities.createdAt));

  if (rows.length === 0) return [];

  // Pull any voice-note transcripts for these activities in one query.
  const ids = rows.map((r) => r.activity.id);
  const notes = await db
    .select({
      activityId: voiceNotes.activityId,
      transcript: voiceNotes.transcript,
    })
    .from(voiceNotes)
    .where(inArray(voiceNotes.activityId, ids));

  const transcriptsByActivity = new Map<string, string[]>();
  for (const note of notes) {
    if (!note.transcript) continue;
    const list = transcriptsByActivity.get(note.activityId) ?? [];
    list.push(note.transcript);
    transcriptsByActivity.set(note.activityId, list);
  }

  return rows.map((r) => ({
    ...r.activity,
    authorName: r.authorName,
    transcripts: transcriptsByActivity.get(r.activity.id) ?? [],
  }));
}

export type CreateActivityInput = {
  subjectType: ActivitySubject;
  subjectId: string;
  kind: ActivityKind;
  body: string;
  createdBy: string;
  // Optional — when the body came (at least partly) from dictation, supply the
  // raw transcript so a voice_notes row is recorded alongside the activity.
  // The ActivityLog already renders these transcripts when present (T6).
  voiceTranscript?: string;
};

export async function createActivity(
  input: CreateActivityInput,
): Promise<Activity> {
  const values: NewActivity = {
    subjectType: input.subjectType,
    subjectId: input.subjectId,
    kind: input.kind,
    body: input.body,
    createdBy: input.createdBy,
  };

  const [row] = await db.insert(activities).values(values).returning();

  // Logging an activity against a lead bumps its lastActivityAt, which drives
  // the 14-day "going cold" indicator (see isGoingCold in queries/leads.ts).
  if (input.subjectType === "lead") {
    await db
      .update(leads)
      .set({ lastActivityAt: new Date() })
      .where(eq(leads.id, input.subjectId));
  }

  // If the body came from dictation, persist the raw transcript so it appears
  // in the activity log's voice-note section.
  if (input.voiceTranscript && input.voiceTranscript.trim()) {
    await db.insert(voiceNotes).values({
      activityId: row.id,
      transcript: input.voiceTranscript.trim(),
      createdBy: input.createdBy,
    });
  }

  return row;
}
