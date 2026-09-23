// Browser-side photo upload: fetches a one-time signature from the server
// (tiny JSON — no picture bytes) and then POSTs the file directly to
// Cloudinary, bypassing Vercel's request-body size limit.
import { getFamilyUploadTicket } from "@/lib/gate.functions";

export async function uploadPhotoDirect(file: File, name?: string): Promise<string | null> {
  const ticket = await getFamilyUploadTicket({
    data: { name: name || file.name || "photo" },
  });
  if (!ticket) return null;
  const form = new FormData();
  form.append("file", file);
  form.append("api_key", ticket.apiKey);
  form.append("timestamp", String(ticket.timestamp));
  form.append("signature", ticket.signature);
  form.append("public_id", ticket.publicId);
  form.append("folder", ticket.folder);
  form.append("transformation", ticket.transformation);
  const endpoint = `https://api.cloudinary.com/v1_1/${ticket.cloudName}/image/upload`;
  try {
    const res = await fetch(endpoint, { method: "POST", body: form });
    if (!res.ok) return null;
    const json = (await res.json()) as { secure_url?: string };
    return json.secure_url ?? null;
  } catch {
    return null;
  }
}
