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
  const access = Route.useLoaderData();
  return (
    <WorldShell title="Tamim's Admin">
      <div className="px-5 pb-12 sm:px-8 2xl:px-12 2xl:pb-16" dir="rtl">
        <div className="grid items-start gap-5 lg:grid-cols-[17rem_minmax(0,1fr)]">
          <AdminNavigation />
          <div className="min-w-0">
            {access.ok ? (
              <Outlet />
            ) : (
              <div className="rounded-2xl border border-border bg-card p-6 text-right shadow-soft">
                <h1 className="font-display text-2xl font-semibold">صفحة الأدمن مقفولة</h1>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  هذه الصفحة متاحة لحساب SUPER_ADMIN فقط. سجّل الدخول باسم بروفايل الأدمن (مثلًا
                  بابا) عشان تفتحها.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </WorldShell>
  );
}
