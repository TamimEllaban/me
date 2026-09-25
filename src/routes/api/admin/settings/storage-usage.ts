import { createFileRoute } from "@tanstack/react-router";
import { getFamilySession, isSuperAdminProfile } from "@/lib/auth.server";
import { getCloudinaryStorageUsage } from "@/lib/cloudinary-usage.server";

function json(data: unknown, status = 200): Response {
  return Response.json(data, {
    status,
    headers: {
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export const Route = createFileRoute("/api/admin/settings/storage-usage")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const session = await getFamilySession();
        if (!session.data.unlocked) {
          return json({ ok: false, error: "Authentication required." }, 401);
        }
        if (!isSuperAdminProfile(session.data.profileId)) {
          return json({ ok: false, error: "SUPER_ADMIN access required." }, 403);
        }

        const forceRefresh = new URL(request.url).searchParams.get("refresh") === "1";
        try {
          return json({ ok: true, data: await getCloudinaryStorageUsage(forceRefresh) });
        } catch (error) {
          const message =
            error instanceof Error && error.message === "CLOUDINARY_NOT_CONFIGURED"
              ? "Cloudinary is not configured."
              : "Cloudinary usage request failed.";
          return json({ ok: false, error: message }, 502);
        }
      },
    },
  },
});
