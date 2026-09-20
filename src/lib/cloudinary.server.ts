// Server-only helpers for Cloudinary image storage.
//
// The browser never sees the API secret: uploads/edits flow through server
// functions that use the signed SDK. Everything here returns null/false when
// Cloudinary is not configured so the rest of the app degrades gracefully.

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

export async function deleteFamilyImage(publicId: string): Promise<boolean> {
  const c = client();
  if (!c) return false;
  try {
    const result = await c.uploader.destroy(publicId);
    return result.result === "ok";
  } catch (error) {
    console.error("[cloudinary] delete failed:", error);
    return false;
  }
}

export async function listFamilyImages(): Promise<
  Array<{ publicId: string; url: string; width?: number; height?: number }>
> {
  const c = client();
  if (!c) return [];
  try {
    const result = await c.api.resources({
      type: "upload",
      prefix: BASE_FOLDER,
      max_results: 100,
    });
    return (result.resources ?? []).map(
      (r: { public_id: string; secure_url: string; width?: number; height?: number }) => ({
        publicId: r.public_id,
        url: r.secure_url,
        width: r.width,
        height: r.height,
      }),
    );
  } catch (error) {
    console.error("[cloudinary] list failed:", error);
    return [];
  }
}

// "https://res.cloudinary.com/<name>/image/upload/v123/abc/x.jpg" -> "abc/x"
export function publicIdFromUrl(url: string): string | null {
  const match = /\/image\/upload\/(?:v\d+\/)?(.+?)(?:\.\w+)?$/.exec(url);
  return match?.[1] ?? null;
}

// Adds Cloudinary auto-format + quality + crop parameters to an existing CDN URL.
export function optimizeCloudUrl(url: string, width?: number, height?: number): string {
  if (!/res\.cloudinary\.com/.test(url)) return url;
  const size = [width ? `w_${width}` : "", height ? `h_${height}` : ""].filter(Boolean).join(",");
  const transforms = [size, "f_auto,q_auto"].filter(Boolean).join(",");
  return url.replace("/image/upload/", `/image/upload/${transforms}/`);
}
