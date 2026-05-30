"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth/roles";
import {
  createProject,
  updateProject,
  setProjectStatus,
} from "@/lib/db/queries/projects";
import type { Project } from "@/lib/db/schema";

export type ProjectActionResult =
  | { ok: true; projectId?: string }
  | { ok: false; error: string };

const projectInputSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  description: z.string().trim().max(5000).optional(),
  status: z.enum(["proposed", "active", "on_hold", "delivered"]).default("proposed"),
  startDate: z
    .string()
    .optional()
    .transform((v) => (v && v.trim() !== "" ? v.trim() : null)),
  dueDate: z
    .string()
    .optional()
    .transform((v) => (v && v.trim() !== "" ? v.trim() : null)),
  fee: z
    .string()
    .optional()
    .transform((v) => (v && v.trim() !== "" ? v.trim() : null)),
});

export async function createProjectAction(
  clientId: string,
  formData: FormData,
): Promise<ProjectActionResult> {
  const session = await requireRole("rep");

  const parsed = projectInputSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") ?? "",
    status: formData.get("status") ?? "proposed",
    startDate: formData.get("startDate") ?? "",
    dueDate: formData.get("dueDate") ?? "",
    fee: formData.get("fee") ?? "",
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { title, description, status, startDate, dueDate, fee } = parsed.data;

  const project = await createProject(
    {
      clientId,
      title,
      description: description ?? "",
      status,
      startDate: startDate ?? null,
      dueDate: dueDate ?? null,
      fee: fee ?? null,
    },
    session,
  );

  if (!project) {
    return { ok: false, error: "Client not found or not authorized." };
  }

  revalidatePath(`/clients/${clientId}`);
  revalidatePath(`/projects/${project.id}`);
  return { ok: true, projectId: project.id };
}

export async function updateProjectAction(
  projectId: string,
  clientId: string,
  formData: FormData,
): Promise<ProjectActionResult> {
  await requireRole("rep");

  const parsed = projectInputSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") ?? "",
    status: formData.get("status") ?? "proposed",
    startDate: formData.get("startDate") ?? "",
    dueDate: formData.get("dueDate") ?? "",
    fee: formData.get("fee") ?? "",
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { title, description, status, startDate, dueDate, fee } = parsed.data;

  const updated = await updateProject(projectId, {
    title,
    description: description ?? "",
    status,
    startDate: startDate ?? null,
    dueDate: dueDate ?? null,
    fee: fee ?? null,
  });

  if (!updated) {
    return { ok: false, error: "Project not found." };
  }

  revalidatePath(`/clients/${clientId}`);
  revalidatePath(`/projects/${projectId}`);
  return { ok: true };
}

export async function setProjectStatusAction(
  projectId: string,
  clientId: string,
  status: Project["status"],
): Promise<ProjectActionResult> {
  await requireRole("rep");

  const validStatuses: Project["status"][] = ["proposed", "active", "on_hold", "delivered"];
  if (!validStatuses.includes(status)) {
    return { ok: false, error: "Invalid status" };
  }

  const updated = await setProjectStatus(projectId, status);
  if (!updated) {
    return { ok: false, error: "Project not found." };
  }

  revalidatePath(`/clients/${clientId}`);
  revalidatePath(`/projects/${projectId}`);
  return { ok: true };
}
