import { put, del } from "@vercel/blob";
import { env } from "@/lib/env";

// Namespace enforcement is a security boundary: every blob path is prefixed
// with `john-doe-crm/<userId>/` so files uploaded by one user can never
// land under another user's prefix, and so we coexist safely with other
// projects sharing the same Vercel Blob store (do NOT touch paths outside
// the john-doe-crm/ prefix).
const ROOT_PREFIX = "john-doe-crm";

function safeFilename(name: string): string {
  // Strip path separators and any character that's unfriendly in a URL/path.
  // Collapse repeated dashes and trim leading/trailing dashes.
  const cleaned = name
    .replace(/[\\/]+/g, "-")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
  return cleaned.length > 0 ? cleaned : "file";
}

function pathFor(userId: string, filename: string): string {
  return `${ROOT_PREFIX}/${userId}/${Date.now()}-${safeFilename(filename)}`;
}

export async function uploadBlob(
  userId: string,
  file: File,
): Promise<{ url: string; pathname: string }> {
  const pathname = pathFor(userId, file.name);
  const blob = await put(pathname, file, {
    access: "public",
    contentType: file.type || "application/octet-stream",
    token: env.BLOB_READ_WRITE_TOKEN,
    addRandomSuffix: false,
  });
  return { url: blob.url, pathname: blob.pathname };
}

export async function deleteBlob(pathname: string): Promise<void> {
  // Defensive: never delete anything outside our namespace.
  if (!pathname.startsWith(`${ROOT_PREFIX}/`)) {
    throw new Error(
      `Refusing to delete blob outside ${ROOT_PREFIX}/ namespace: ${pathname}`,
    );
  }
  await del(pathname, { token: env.BLOB_READ_WRITE_TOKEN });
}
