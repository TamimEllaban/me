// Server-only helpers for Cloudinary image storage.
//
// The browser never sees the API secret: uploads/edits flow through server
// functions that use the signed SDK. Everything here returns null/false when
// Cloudinary is not configured so the rest of the app degrades gracefully.

import { createHash, randomBytes } from "node:crypto";
import { v2 as cloudinary } from "cloudinary";

function client() {
  if (
    !process.env["CLOUDINARY_CLOUD_NAME"] ||
    !process.env["CLOUDINARY_API_KEY"] ||
    !process.env["CLOUDINARY_API_SECRET"]
  ) {
    return null;
  }
  cloudinary.config({
    cloud_name: process.env["CLOUDINARY_CLOUD_NAME"],
    api_key: process.env["CLOUDINARY_API_KEY"],
    api_secret: process.env["CLOUDINARY_API_SECRET"],
  });
  return cloudinary;
}

const BASE_FOLDER = "tamims-world";

// Returns everything a browser needs to upload media directly to Cloudinary
// (bypassing Vercel's request-body size limit). The signature is the only thing
// signed here — the API secret never reaches the client.
export function createFamilyUploadTicket(
  name: string,
  kind: "image" | "video" = "image",
): {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  folder: string;
  publicId: string;
  transformation: string;
  resourceType: "image" | "video";
} | null {
  const cloudName = process.env["CLOUDINARY_CLOUD_NAME"];
  const apiKey = process.env["CLOUDINARY_API_KEY"];
  const apiSecret = process.env["CLOUDINARY_API_SECRET"];
  if (!cloudName || !apiKey || !apiSecret) return null;
  const safe =
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || (kind === "video" ? "video" : "photo");
  const publicId = `${safe}-${Date.now()}-${randomBytes(3).toString("hex")}`;
  const timestamp = Math.floor(Date.now() / 1000);
  const transformation = kind === "video" ? "c_limit,w_1920" : "c_limit,w_1600,q_auto:good";
  const resourceType = kind === "video" ? "video" : "image";
  const params: Record<string, string> = {
    folder: BASE_FOLDER,
    public_id: publicId,
    timestamp: String(timestamp),
  };
  if (transformation) params.transformation = transformation;
  const query = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");
  const signature = createHash("sha1").update(`${query}${apiSecret}`).digest("hex");
  return {
    cloudName,
    apiKey,
    timestamp,
    signature,
    folder: BASE_FOLDER,
    publicId,
    transformation,
    resourceType,
  };
}

// Accepts a base64 data URL (data:image/...;base64,...) or a raw public URL.
export async function uploadFamilyImage(
  source: string,
  name: string,
): Promise<{ url: string; publicId: string } | null> {
  const c = client();
  if (!c) return null;
  const safe =
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "photo";
  const publicId = `${BASE_FOLDER}/${safe}-${Date.now()}`;
  try {
    const result = await c.uploader.upload(source, {
      public_id: publicId,
      overwrite: true,
      transformation: [{ width: 1600, crop: "limit", quality: "auto:good" }],
    });
    return { url: result.secure_url, publicId };
  } catch (error) {
    console.error("[cloudinary] upload failed:", error);
    return null;
  }
}

export type CloudinaryUsageResponse = {
  plan?: string;
  last_updated?: string;
  date_requested?: string;
  objects?: { usage?: number; limit?: number };
  bandwidth?: { usage?: number; limit?: number; credits_usage?: number };
  storage?: { usage?: number; limit?: number; credits_usage?: number };
  credits?: { usage?: number; limit?: number; used_percent?: number };
  transformations?: { usage?: number; credits_usage?: number };
  resources?: number;
  derived_resources?: number;
  requests?: number;
  [key: string]: unknown;
};

export async function fetchCloudinaryUsage(): Promise<CloudinaryUsageResponse> {
  const c = client();
  if (!c) throw new Error("CLOUDINARY_NOT_CONFIGURED");
  return (await c.api.usage()) as CloudinaryUsageResponse;
}

export async function deleteFamilyImage(
  publicId: string,
  kind: "image" | "video" = "image",
): Promise<boolean> {
  const c = client();
  if (!c) return false;
  try {
    const result = await c.uploader.destroy(publicId, { resource_type: kind });
    return result.result === "ok";
  } catch (error) {
    console.error("[cloudinary] delete failed:", error);
    return false;
  }
}

export async function listFamilyImages(): Promise<
  Array<{
    publicId: string;
    url: string;
    kind: "image" | "video";
    width?: number;
    height?: number;
  }>
> {
  const c = client();
  if (!c) return [];
  try {
    const [images, videos] = await Promise.all([
      c.api.resources({
        type: "upload",
        resource_type: "image",
        prefix: BASE_FOLDER,
        max_results: 100,
      }),
      c.api.resources({
        type: "upload",
        resource_type: "video",
        prefix: BASE_FOLDER,
        max_results: 100,
      }),
    ]);
    const mapResource = (r: {
      public_id: string;
      secure_url: string;
      resource_type: string;
      width?: number;
      height?: number;
    }) => ({
      publicId: r.public_id,
      url: r.secure_url,
      kind: r.resource_type === "video" ? ("video" as const) : ("image" as const),
      width: r.width,
      height: r.height,
    });
    return [...(images.resources ?? []), ...(videos.resources ?? [])].map(mapResource);
  } catch (error) {
    console.error("[cloudinary] list failed:", error);
    return [];
  }
}

// "https://res.cloudinary.com/<name>/image/upload/v123/abc/x.jpg" -> "abc/x"
export function publicIdFromUrl(url: string): string | null {
  const match = /\/(?:image|video)\/upload\/(?:v\d+\/)?(.+?)(?:\.[a-z0-9]+)?(?:\?.*)?$/i.exec(url);
  return match?.[1] ?? null;
}

// Adds Cloudinary auto-format + quality + crop parameters to an existing CDN URL.
export function optimizeCloudUrl(url: string, width?: number, height?: number): string {
  if (!/res\.cloudinary\.com/.test(url)) return url;
  const size = [width ? `w_${width}` : "", height ? `h_${height}` : ""].filter(Boolean).join(",");
  const transforms = [size, "f_auto,q_auto"].filter(Boolean).join(",");
  return url.replace("/image/upload/", `/image/upload/${transforms}/`);
}
