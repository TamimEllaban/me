// Browser-side media upload: fetch a short-lived signature from the server,
// then send the file directly to Cloudinary. XMLHttpRequest is intentional here
// because it provides real byte-level upload progress, unlike fetch.
import { getFamilyUploadTicket } from "@/lib/gate.functions";
import { cloudinaryVideoThumbnailUrl } from "@/lib/media-urls";

export type MediaKind = "image" | "video";

export type UploadedMedia = {
  url: string;
  thumbnailUrl: string;
  publicId: string;
  kind: MediaKind;
  name: string;
};

type UploadProgressHandler = (percent: number) => void;

export function getMediaKind(file: File): MediaKind {
  if (file.type.startsWith("video/") || /\.(mp4|mov|m4v|webm|avi|mkv)$/i.test(file.name)) {
    return "video";
  }
  return "image";
}

export function isSupportedMediaFile(file: File): boolean {
  return file.type.startsWith("image/") || getMediaKind(file) === "video";
}

export async function uploadMediaDirect(
  file: File,
  name?: string,
  onProgress?: UploadProgressHandler,
): Promise<UploadedMedia | null> {
  if (!isSupportedMediaFile(file)) return null;

  const kind = getMediaKind(file);
  const displayName = name?.trim() || file.name || (kind === "video" ? "video" : "photo");
  const ticket = await getFamilyUploadTicket({
    data: { name: displayName, kind },
  });
  if (!ticket) return null;

  const form = new FormData();
  form.append("file", file);
  form.append("api_key", ticket.apiKey);
  form.append("timestamp", String(ticket.timestamp));
  form.append("signature", ticket.signature);
  form.append("public_id", ticket.publicId);
  form.append("folder", ticket.folder);
  if (ticket.transformation) form.append("transformation", ticket.transformation);

  const endpoint = `https://api.cloudinary.com/v1_1/${ticket.cloudName}/${ticket.resourceType}/upload`;

  return new Promise<UploadedMedia | null>((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", endpoint);
    xhr.timeout = 15 * 60 * 1000;

    xhr.upload.onprogress = (event) => {
      const total = event.total || file.size;
      const percent = total > 0 ? (event.loaded / total) * 100 : 0;
      // Keep the bar below 100 until Cloudinary has returned the final URL.
      onProgress?.(Math.max(0, Math.min(99, Math.round(percent))));
    };

    xhr.onerror = () => resolve(null);
    xhr.ontimeout = () => resolve(null);
    xhr.onabort = () => resolve(null);

    xhr.onload = () => {
      if (xhr.status < 200 || xhr.status >= 300) {
        resolve(null);
        return;
      }
      try {
        const json = JSON.parse(xhr.responseText) as {
          secure_url?: string;
          public_id?: string;
          resource_type?: string;
        };
        if (!json.secure_url || !json.public_id) {
          resolve(null);
          return;
        }
        onProgress?.(100);
        const uploadedKind: MediaKind = json.resource_type === "video" ? "video" : kind;
        resolve({
          url: json.secure_url,
          thumbnailUrl:
            uploadedKind === "video"
              ? cloudinaryVideoThumbnailUrl(json.secure_url)
              : json.secure_url,
          publicId: json.public_id,
          kind: uploadedKind,
          name: displayName,
        });
      } catch {
        resolve(null);
      }
    };

    xhr.send(form);
  });
}

// Backwards-compatible image-only helper used by the relative editor.
export async function uploadPhotoDirect(
  file: File,
  name?: string,
  onProgress?: UploadProgressHandler,
): Promise<string | null> {
  if (getMediaKind(file) === "video") return null;
  const result = await uploadMediaDirect(file, name, onProgress);
  return result?.url ?? null;
}
