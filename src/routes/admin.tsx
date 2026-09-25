import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AdminNavigation } from "@/components/admin-navigation";
import { WorldShell } from "@/components/world-shell";
import { getAdminPageAccess } from "@/lib/admin.functions";

export const Route = createFileRoute("/admin")({
  loader: () => getAdminPageAccess(),
  head: () => ({
    meta: [{ title: "Admin — Tamim's World" }, { name: "robots", content: "noindex" }],
  }),
  component: AdminLayout,
});

function AdminLayout() {
  return (
    <WorldShell title="Tamim's Admin">
      <div className="px-5 pb-12 sm:px-8 2xl:px-12 2xl:pb-16" dir="rtl">
        <div className="grid items-start gap-5 lg:grid-cols-[17rem_minmax(0,1fr)]">
          <AdminNavigation />
          <div className="min-w-0">
            <Outlet />
          </div>
        </div>
      </div>
    </WorldShell>
  );
}
