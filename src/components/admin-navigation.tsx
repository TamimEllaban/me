import { Link, useRouterState } from "@tanstack/react-router";
import { HardDrive, Settings, ShieldCheck } from "lucide-react";

const adminNavigation = [
  {
    label: "الإعدادات",
    items: [
      {
        to: "/admin/settings/storage" as const,
        label: "استهلاك Cloudinary",
        description: "Storage, bandwidth and credits",
        icon: HardDrive,
      },
    ],
  },
];

export function AdminNavigation() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  return (
    <aside className="rounded-2xl border border-border bg-card p-3 shadow-soft lg:sticky lg:top-24 lg:p-4">
      <div className="flex items-center gap-3 border-b border-border/70 px-2 pb-4">
        <span className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary">
          <ShieldCheck className="size-5" />
        </span>
        <div>
          <p className="text-xs font-semibold text-primary">SUPER_ADMIN</p>
          <h2 className="font-display text-lg">لوحة الإعدادات</h2>
        </div>
      </div>
      <nav className="mt-3 space-y-4" aria-label="Admin navigation">
        {adminNavigation.map((section) => (
          <div key={section.label}>
            <p className="mb-2 flex items-center gap-1.5 px-2 text-[0.7rem] font-semibold uppercase tracking-wide text-muted-foreground">
              <Settings className="size-3.5" />
              {section.label}
            </p>
            <div className="space-y-1.5">
              {section.items.map((item) => {
                const active = pathname === item.to;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    aria-current={active ? "page" : undefined}
                    className={`flex min-h-14 items-center gap-3 rounded-xl px-3 py-2.5 transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/30 ${
                      active
                        ? "bg-primary text-primary-foreground shadow-soft"
                        : "text-foreground hover:bg-secondary/70"
                    }`}
                  >
                    <Icon className="size-5 shrink-0" />
                    <span className="min-w-0">
                      <b className="block text-sm">{item.label}</b>
                      <span
                        className={`block truncate text-[0.68rem] ${
                          active ? "text-primary-foreground/75" : "text-muted-foreground"
                        }`}
                      >
                        {item.description}
                      </span>
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}
