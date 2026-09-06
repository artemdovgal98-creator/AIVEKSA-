import "server-only";
import { MAX_PROFILE_PHOTOS, MAX_SERVICE_LOGOS, MAX_UPLOAD_BYTES, toFileLinks } from "@/lib/types";

// Re-exported so server code can keep importing the limits from one place.
export { MAX_PROFILE_PHOTOS, MAX_SERVICE_LOGOS, MAX_UPLOAD_BYTES, toFileLinks };

/**
 * Pushes one browser `File` into Totalum storage and returns its file-name id.
 *
 * The id is what gets linked to a record: `{ name: id }` for a single file
 * field, `[{ name: id }, …]` for a multiple one. Never build a URL from it.
 */
export async function uploadToTotalum(sdk: any, file: File): Promise<string> {
  const forward = new FormData();
  forward.append("file", file, file.name);
  const uploaded = await sdk.files.uploadFile(forward);
  if (uploaded.errors) {
    console.error("[uploads] uploadFile errors:", uploaded.errors);
    throw new Error(JSON.stringify(uploaded.errors));
  }
  const name = uploaded.data;
  if (!name || typeof name !== "string") {
    throw new Error("Totalum did not return a file id");
  }
  return name;
}
